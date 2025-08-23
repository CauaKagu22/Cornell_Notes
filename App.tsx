import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import type { Note, Folder, SavingStatus } from './types';
import HomePage from './components/HomePage';
import NotePage from './components/NotePage';
import FolderModal from './components/FolderModal';
import DeleteFolderModal from './components/DeleteFolderModal';
import driveService from './services/driveService';

function App(): React.ReactNode {
  const [notes, setNotes] = useLocalStorage<Note[]>('cornell-notes-local-v2', []);
  const [folders, setFolders] = useLocalStorage<Folder[]>('cornell-folders-local-v2', []);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<SavingStatus>('idle');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useLocalStorage<Record<string, boolean>>('cornell-collapsed-folders', {});
  
  const saveDebounceTimeout = useRef<number | null>(null);
  const isSyncing = useRef(false);
  const lastChangeType = useRef<'structural' | 'content'>('content');

  const saveDataToDrive = useCallback(async () => {
    if (isSyncing.current || !isSignedIn) return;

    // Clear any existing timeout since we are now executing.
    if (saveDebounceTimeout.current) {
        clearTimeout(saveDebounceTimeout.current);
        saveDebounceTimeout.current = null;
    }
    
    setSavingStatus('saving');
    try {
        await driveService.saveAppState({ notes, folders });
        setSavingStatus('saved');
    } catch (error) {
        setSavingStatus('error');
        console.error("Error saving app state to Drive:", error);
    }
  }, [isSignedIn, notes, folders]);


  // --- Google Drive & Auth Initialization ---
  useEffect(() => {
    const init = async () => {
      try {
        await driveService.initClient((signedIn) => {
          setIsSignedIn(signedIn);
          if (!signedIn) {
            setNotes([]); // Clear notes on sign out
            setFolders([]);
            setActiveNoteId(null);
          }
        });
        setIsAuthReady(true);
        setAuthError(null);
      } catch (error) {
        console.error("Failed to initialize Google Drive service:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during initialization.";
        if (errorMessage.includes('client_id')) {
             setAuthError('Google Client ID is not configured. Please set it in services/driveService.ts to enable Google Drive sync.');
        } else {
            setAuthError('Failed to connect to Google Drive. Please try again later.');
        }
        setIsAuthReady(false);
      }
    };
    init();
  }, []);

  // --- Sync data from drive when user signs in ---
  useEffect(() => {
    if (isSignedIn && isAuthReady) {
      const sync = async () => {
        isSyncing.current = true;
        try {
          const { notes: driveNotes, folders: driveFolders } = await driveService.syncData();
          setNotes(driveNotes);
          setFolders(driveFolders);
        } catch (error) {
          console.error("Failed to sync data from drive:", error);
        } finally {
            setTimeout(() => { isSyncing.current = false; }, 100);
        }
      };
      sync();
    }
  }, [isSignedIn, isAuthReady, setNotes, setFolders]);

  // --- Universal Save to Drive Effect ---
  useEffect(() => {
    if (isSyncing.current || !isSignedIn) {
      return;
    }

    if (saveDebounceTimeout.current) {
        clearTimeout(saveDebounceTimeout.current);
    }
    
    const debounceTime = lastChangeType.current === 'structural' ? 100 : 1500;
    lastChangeType.current = 'content'; // Reset for the next change.

    saveDebounceTimeout.current = window.setTimeout(saveDataToDrive, debounceTime);

    return () => {
        if (saveDebounceTimeout.current) {
            clearTimeout(saveDebounceTimeout.current);
        }
    };
  }, [notes, folders, isSignedIn, saveDataToDrive]);

  const handleSignIn = () => {
    driveService.signIn();
  };

  const handleSignOut = () => {
    driveService.signOut();
  };
  
  // --- Folder Management ---
  const handleCreateFolder = useCallback((folderData: {name: string, color: string}) => {
      lastChangeType.current = 'structural';
      const newFolder: Folder = {
          id: `local-${Date.now()}`,
          ...folderData,
      };
      setFolders(prevFolders => [newFolder, ...prevFolders]);
      setIsFolderModalOpen(false);
  }, [setFolders]);

    const handleToggleFolder = useCallback((folderId: string) => {
        setCollapsedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    }, [setCollapsedFolders]);

    const handleConfirmDeleteFolder = useCallback(async (folder: Folder, deleteNotes: boolean) => {
        lastChangeType.current = 'structural';
        const updatedFolders = folders.filter(f => f.id !== folder.id);

        if (deleteNotes) {
            const notesToKeep = notes.filter(n => n.folderId !== folder.id);
            setNotes(notesToKeep);
        } else {
            const updatedNotes = notes.map(n => {
                if (n.folderId === folder.id) {
                    return { ...n, folderId: null, updatedAt: new Date().toISOString() };
                }
                return n;
            });
            setNotes(updatedNotes);
        }
        
        setFolders(updatedFolders);
        setFolderToDelete(null); // Close modal
    }, [notes, folders, setNotes, setFolders]);
  
  // --- Note CRUD Operations ---
  const handleCreateNote = useCallback((folderId: string | null = null) => {
    lastChangeType.current = 'structural';
    const newNote: Note = {
      id: `local-${Date.now()}`,
      title: 'Untitled Note',
      index: '',
      content: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folderId: folderId,
    };

    setNotes(prevNotes => [newNote, ...prevNotes]);
    setActiveNoteId(newNote.id);
  }, [setNotes]);

  const handleSelectNote = useCallback((id: string) => {
    setActiveNoteId(id);
    setSavingStatus('idle');
  }, []);
  
  const handleUpdateNote = useCallback((updatedNote: Partial<Note> & { id: string }) => {
    // If the update involves changing the folder, it's a structural change.
    if (Object.keys(updatedNote).includes('folderId')) {
        lastChangeType.current = 'structural';
    }
    setNotes(prevNotes =>
      prevNotes.map(note => {
        if (note.id === updatedNote.id) {
          return { ...note, ...updatedNote, updatedAt: new Date().toISOString() };
        }
        return note;
      })
    );
  }, [setNotes]);
  
  const handleDeleteNote = useCallback((id: string) => {
    lastChangeType.current = 'structural';
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    if (activeNoteId === id) {
        setActiveNoteId(null);
    }
  }, [setNotes, activeNoteId]);

  const handleMoveNoteToFolder = useCallback((noteId: string, folderId: string | null) => {
      const noteToMove = notes.find(n => n.id === noteId);
      if (noteToMove && noteToMove.folderId !== folderId) {
          handleUpdateNote({ id: noteId, folderId });
      }
  }, [notes, handleUpdateNote]);

  const handleGoHome = useCallback(() => {
    if (saveDebounceTimeout.current) {
        // A save is pending, so we trigger it immediately.
        saveDataToDrive();
    }
    setActiveNoteId(null);
  }, [saveDataToDrive]);

  const activeNote = useMemo(() => notes.find(note => note.id === activeNoteId), [notes, activeNoteId]);
  const activeNoteFolder = useMemo(() => {
      if (!activeNote || !activeNote.folderId) return null;
      return folders.find(f => f.id === activeNote.folderId) || null;
  }, [activeNote, folders]);
  
  const notesByFolder = useMemo(() => {
      const map = new Map<string, Note[]>();
      folders.forEach(folder => map.set(folder.id, []));
      notes.forEach(note => {
          if (note.folderId && map.has(note.folderId)) {
              map.get(note.folderId)!.push(note);
          }
      });
      return map;
  }, [notes, folders]);


  return (
    <>
      <div className="min-h-screen bg-brand-bg text-text-main font-sans">
        <div className="container mx-auto p-4 md:p-8">
          {activeNote ? (
            <NotePage
              note={activeNote}
              folder={activeNoteFolder}
              onUpdateNote={handleUpdateNote}
              onGoHome={handleGoHome}
              savingStatus={savingStatus}
              isSignedIn={isSignedIn}
            />
          ) : (
            <HomePage
              notes={notes}
              folders={folders}
              notesByFolder={notesByFolder}
              collapsedFolders={collapsedFolders}
              onCreateNote={handleCreateNote}
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
              onMoveNoteToFolder={handleMoveNoteToFolder}
              onOpenFolderModal={() => setIsFolderModalOpen(true)}
              onOpenDeleteFolderModal={setFolderToDelete}
              onToggleFolder={handleToggleFolder}
              isAuthReady={isAuthReady}
              isSignedIn={isSignedIn}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              authError={authError}
              savingStatus={savingStatus}
            />
          )}
        </div>
      </div>
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSave={handleCreateFolder}
      />
      <DeleteFolderModal
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleConfirmDeleteFolder}
        folder={folderToDelete}
        noteCount={folderToDelete ? (notesByFolder.get(folderToDelete.id) || []).length : 0}
      />
    </>
  );
}

export default App;
