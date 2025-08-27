import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import type { Note, Folder, SavingStatus, NoteBlock } from './types';
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useLocalStorage<Record<string, boolean>>('cornell-collapsed-folders', {});
  
  const isSyncing = useRef(false);
  const migrationRan = useRef(false);

  // --- Data Migration for old note format ---
  useEffect(() => {
    if (notes.length > 0 && !migrationRan.current) {
        const needsMigration = notes.some(n => !n.hasOwnProperty('blocks'));
        if (needsMigration) {
            console.log("Migrating notes to new block format...");
            const migratedNotes = notes.map((note: any) => {
                if (note.blocks && Array.isArray(note.blocks)) {
                    return note as Note;
                }

                const newBlocks: NoteBlock[] = [];
                const timestamp = () => `${Date.now()}-${Math.random()}`;

                if (note.content) {
                    newBlocks.push({ id: `block-${timestamp()}`, type: 'content', title: 'Main Notes', content: note.content });
                }
                if (note.index) {
                    newBlocks.push({ id: `block-${timestamp()}`, type: 'index', title: 'Index / Cues', content: note.index });
                }
                if (note.notes) {
                    newBlocks.push({ id: `block-${timestamp()}`, type: 'notes', title: 'Summary', content: note.notes });
                }

                if (newBlocks.length === 0) {
                    newBlocks.push({ id: `block-${timestamp()}`, type: 'content', title: 'Main Notes', content: '' });
                }
                
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { index, content, notes: noteSummary, ...rest } = note;
                return { ...rest, blocks: newBlocks };
            });
            setNotes(migratedNotes);
            setHasUnsavedChanges(true);
        }
        migrationRan.current = true;
    }
  }, [notes, setNotes]);

  const saveDataToDrive = useCallback(async () => {
    if (isSyncing.current || !isSignedIn) return;
    
    setSavingStatus('saving');
    try {
        await driveService.saveAppState({ notes, folders });
        setSavingStatus('saved');
        setHasUnsavedChanges(false);
        setTimeout(() => setSavingStatus('idle'), 2000); // Revert to idle after 2s
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
            setHasUnsavedChanges(false);
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
  }, [setNotes, setFolders]);

  // --- Sync data from drive when user signs in ---
  useEffect(() => {
    if (isSignedIn && isAuthReady) {
      const sync = async () => {
        isSyncing.current = true;
        try {
          const { notes: driveNotes, folders: driveFolders } = await driveService.syncData();
          setNotes(driveNotes);
          setFolders(driveFolders);
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error("Failed to sync data from drive:", error);
        } finally {
            setTimeout(() => { isSyncing.current = false; }, 100);
        }
      };
      sync();
    }
  }, [isSignedIn, isAuthReady, setNotes, setFolders]);

    // Warn user before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);


  const handleSignIn = () => {
    driveService.signIn();
  };

  const handleSignOut = () => {
    driveService.signOut();
  };
  
  // --- Folder Management ---
  const handleCreateFolder = useCallback((folderData: {name: string, color: string}) => {
      const newFolder: Folder = {
          id: `local-${Date.now()}`,
          ...folderData,
      };
      setFolders(prevFolders => [newFolder, ...prevFolders]);
      setIsFolderModalOpen(false);
      setHasUnsavedChanges(true);
  }, [setFolders]);

    const handleToggleFolder = useCallback((folderId: string) => {
        setCollapsedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    }, [setCollapsedFolders]);

    const handleConfirmDeleteFolder = useCallback(async (folder: Folder, deleteNotes: boolean) => {
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
        setHasUnsavedChanges(true);
    }, [notes, folders, setNotes, setFolders]);
  
  // --- Note CRUD Operations ---
  const handleCreateNote = useCallback((folderId: string | null = null) => {
    const newNote: Note = {
      id: `local-${Date.now()}`,
      title: 'Untitled Note',
      blocks: [{
          id: `block-${Date.now()}`,
          type: 'content',
          title: 'Main Notes',
          content: ''
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folderId: folderId,
    };

    setNotes(prevNotes => [newNote, ...prevNotes]);
    setActiveNoteId(newNote.id);
    setHasUnsavedChanges(true);
  }, [setNotes]);

  const handleSelectNote = useCallback((id: string) => {
    setActiveNoteId(id);
    setSavingStatus('idle');
  }, []);
  
  const handleUpdateNote = useCallback((updatedNote: Partial<Note> & { id: string }) => {
    setNotes(prevNotes =>
      prevNotes.map(note => {
        if (note.id === updatedNote.id) {
          return { ...note, ...updatedNote, updatedAt: new Date().toISOString() };
        }
        return note;
      })
    );
    setHasUnsavedChanges(true);
  }, [setNotes]);
  
  const handleDeleteNote = useCallback((id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    if (activeNoteId === id) {
        setActiveNoteId(null);
    }
    setHasUnsavedChanges(true);
  }, [setNotes, activeNoteId]);

  const handleMoveNoteToFolder = useCallback((noteId: string, folderId: string | null) => {
      const noteToMove = notes.find(n => n.id === noteId);
      if (noteToMove && noteToMove.folderId !== folderId) {
          handleUpdateNote({ id: noteId, folderId });
      }
  }, [notes, handleUpdateNote]);

  const handleGoHome = useCallback(() => {
    setActiveNoteId(null);
  }, []);

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
      <div className="h-full bg-brand-bg text-text-main font-sans flex flex-col">
        <div className="container mx-auto p-4 md:p-8 flex-1 overflow-y-auto">
          {activeNote ? (
            <NotePage
              note={activeNote}
              folder={activeNoteFolder}
              onUpdateNote={handleUpdateNote}
              onGoHome={handleGoHome}
              onSaveToDrive={saveDataToDrive}
              savingStatus={savingStatus}
              hasUnsavedChanges={hasUnsavedChanges}
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
              hasUnsavedChanges={hasUnsavedChanges}
              onSaveToDrive={saveDataToDrive}
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