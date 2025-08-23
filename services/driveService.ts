import type { Note, Folder } from '../types';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Cornell Notes';
const DATA_FILENAME = 'app-data.cornell';

// !!! IMPORTANT !!!
// Replace this with your own Google Client ID from the Google Cloud Console.
// To get a Client ID, follow the instructions here:
// https://developers.google.com/drive/api/guides/web-client-id
const GOOGLE_CLIENT_ID = '230886024276-b8h6ks63o7e14v30lepc79luo0oicriv.apps.googleusercontent.com';
const GOOGLE_TOKEN_KEY = 'google_drive_token';


type Gapi = any;
type Gis = any;

declare global {
    var gapi: Gapi;
    var google: Gis;
}

// --- Module-level state ---
let gapiClient: Gapi | null = null;
let gisClient: Gis | null = null;
let tokenClient: any = null;
let driveFolderId: string | null = null;
let dataFileId: string | null = null;
let onSignInChange: ((isSignedIn: boolean) => void) | null = null;

const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
};

// --- Core Service Logic ---
const initClient = (signInCallback: (isSignedIn: boolean) => void): Promise<void> => {
    onSignInChange = signInCallback;

    return new Promise(async (resolve, reject) => {
        try {
            await Promise.all([
                loadScript('https://apis.google.com/js/api.js'),
                loadScript('https://accounts.google.com/gsi/client'),
            ]);

            gapiClient = window.gapi;
            await new Promise<void>((res, rej) => {
                 gapiClient.load('client', () => {
                    gapiClient.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    }).then(res).catch(rej);
                });
            });
            
            gisClient = window.google;
            if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
                reject(new Error('Missing required parameter client_id.'));
                return;
            }

            const storedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
            if (storedToken) {
                const tokenData = JSON.parse(storedToken);
                if (tokenData.access_token && Date.now() < tokenData.expires_at) {
                    gapiClient.client.setToken({ access_token: tokenData.access_token });
                    onSignInChange?.(true);
                } else {
                    localStorage.removeItem(GOOGLE_TOKEN_KEY);
                }
            }

            tokenClient = gisClient.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                         const expires_at = Date.now() + (tokenResponse.expires_in * 1000);
                         localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify({ ...tokenResponse, expires_at }));
                        gapiClient.client.setToken({ access_token: tokenResponse.access_token });
                        onSignInChange?.(true);
                    } else {
                        localStorage.removeItem(GOOGLE_TOKEN_KEY);
                        onSignInChange?.(false);
                    }
                },
            });
            
            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

const signIn = () => {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({prompt: 'consent'});
};

const signOut = () => {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    driveFolderId = null;
    dataFileId = null;
    const token = gapiClient?.client.getToken();
    if (token && gisClient) {
        gisClient.accounts.oauth2.revoke(token.access_token, () => {
            gapiClient.client.setToken('');
            onSignInChange?.(false);
        });
    }
};

const getOrCreateFolderId = async (): Promise<string> => {
    if (driveFolderId) return driveFolderId;
    if (!gapiClient) throw new Error("GAPI not initialized");
    
    const response = await gapiClient.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
    });
    
    if (response.result.files && response.result.files.length > 0) {
        driveFolderId = response.result.files[0].id;
    } else {
        const createResponse = await gapiClient.client.drive.files.create({
            resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
            fields: 'id',
        });
        driveFolderId = createResponse.result.id;
    }
    return driveFolderId!;
};

const getOrCreateDataFileId = async (appFolderId: string): Promise<string> => {
    if (dataFileId) return dataFileId;
    if (!gapiClient) throw new Error("GAPI not initialized");

    const response = await gapiClient.client.drive.files.list({
        q: `'${appFolderId}' in parents and name='${DATA_FILENAME}' and trashed=false`,
        fields: 'files(id)',
    });

    if (response.result.files && response.result.files.length > 0) {
        dataFileId = response.result.files[0].id!;
    } else {
        const fileMetadata = {
            name: DATA_FILENAME,
            mimeType: 'application/json',
            parents: [appFolderId],
        };

        // Step 1: Create an empty file with the correct metadata first.
        const createResponse = await gapiClient.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        const newFileId = createResponse.result.id;
        
        // Step 2: Upload the initial content to the newly created file.
        const initialContent = JSON.stringify({ notes: [], folders: [] }, null, 2);
        await gapiClient.client.request({
            path: `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`,
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: initialContent,
        });

        dataFileId = newFileId;
    }
    return dataFileId!;
};

const syncData = async (): Promise<{notes: Note[], folders: Folder[]}> => {
    if (!gapiClient) throw new Error("GAPI not initialized");
    const appFolderId = await getOrCreateFolderId();
    if (!appFolderId) return { notes: [], folders: [] };

    try {
        const fileId = await getOrCreateDataFileId(appFolderId);
        const response = await gapiClient.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        const data = JSON.parse(response.body);
        return {
            notes: data.notes || [],
            folders: data.folders || [],
        };
    } catch(e) {
        console.error("Could not fetch or parse data file, starting with empty state.", e);
        return { notes: [], folders: [] };
    }
};

const saveAppState = async (state: { notes: Note[], folders: Folder[] }): Promise<void> => {
    if (!gapiClient) throw new Error("GAPI not initialized");
    const appFolderId = await getOrCreateFolderId();
    const fileId = await getOrCreateDataFileId(appFolderId);
    
    const fileContent = JSON.stringify(state, null, 2);

    await gapiClient.client.request({
        path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: fileContent,
    });
};

const driveService = {
    initClient,
    signIn,
    signOut,
    syncData,
    saveAppState,
};

export default driveService;