import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { Note, Folder, SavingStatus } from '../types';
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin, rectIntersection } from '@dnd-kit/core';
import SavingIndicator from './SavingIndicator';

interface HomePageProps {
  notes: Note[];
  folders: Folder[];
  notesByFolder: Map<string, Note[]>;
  collapsedFolders: Record<string, boolean>;
  onCreateNote: (folderId?: string | null) => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => void;
  onOpenFolderModal: () => void;
  onOpenDeleteFolderModal: (folder: Folder) => void;
  onToggleFolder: (folderId: string) => void;
  isAuthReady: boolean;
  isSignedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  authError: string | null;
  savingStatus: SavingStatus;
  hasUnsavedChanges: boolean;
  onSaveToDrive: () => void;
}

// --- HOOKS ---
function useOutsideClick(ref: React.RefObject<HTMLElement>, callback: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}


// --- ICONS ---
const PlusIcon = ({className = "h-6 w-6 mr-2"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const FolderPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
);

const TrashIcon = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.459,44,30.852,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

const ChevronDownIcon = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const EllipsisVerticalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
);

const CloudUploadIcon = ({className = "h-5 w-5 mr-2"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m-4-4l4-4 4 4" />
    </svg>
);

const TrashDropZone: React.FC = () => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'trash-zone',
    });

    return (
        <div 
            ref={setNodeRef}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out
                flex items-center justify-center w-20 h-20 rounded-full shadow-2xl ring-4 ring-border-color/50
                animate-fade-in
                ${isOver ? 'scale-125 bg-red-600 ring-red-500' : 'scale-100 bg-surface'}`}
            aria-label="Delete note drop zone"
        >
            <TrashIcon className={`w-9 h-9 transition-colors duration-300 ${isOver ? 'text-white' : 'text-text-dim'}`} />
            <span className="sr-only">Drop here to delete</span>
        </div>
    );
};


// --- Components ---
const AuthButton: React.FC<{isAuthReady: boolean, isSignedIn: boolean, onSignIn: () => void, onSignOut: () => void}> = ({isAuthReady, isSignedIn, onSignIn, onSignOut}) => (
    <button
        onClick={isSignedIn ? onSignOut : onSignIn}
        disabled={!isAuthReady}
        className="flex items-center justify-center bg-surface text-text-main font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
    >
        <GoogleIcon />
        {isSignedIn ? 'Sign Out' : 'Sign in with Google'}
    </button>
);

const AuthErrorDisplay: React.FC<{message: string}> = ({message}) => (
    <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
      <strong className="font-bold">Configuration Needed: </strong>
      <span className="block sm:inline">{message}</span>
    </div>
);

const NoteCard: React.FC<{ note: Note, onSelect: (id: string) => void, onDelete: (id: string) => void }> = ({ note, onSelect, onDelete }) => {
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(note.id);
    };

    const previewText = useMemo(() => {
        if (!note.blocks || note.blocks.length === 0) {
            return 'Empty note...';
        }
        const firstBlockWithContent = note.blocks.find(b => b.content.trim() !== '');
        return firstBlockWithContent?.content || 'Empty note...';
    }, [note.blocks]);


    return (
        <div
            onClick={() => onSelect(note.id)}
            className="bg-surface p-6 rounded-xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-primary/30 hover:ring-2 hover:ring-primary transform hover:-translate-y-1 flex flex-col justify-between h-full"
        >
            <div>
                <h2 className="text-xl font-bold text-text-main truncate mb-2">{note.title}</h2>
                <p className="text-text-dim text-sm line-clamp-3">
                    {previewText}
                </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border-color flex justify-between items-center">
                <p className="text-xs text-text-dim">
                    Updated: {new Date(note.updatedAt).toLocaleDateString()}
                </p>
                <button
                    onClick={handleDeleteClick}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-text-dim hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-500/10"
                    aria-label={`Delete note: ${note.title}`}
                >
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};

const DraggableNoteCard: React.FC<{ note: Note; onSelect: (id: string) => void; onDelete: (id: string) => void }> = ({ note, onSelect, onDelete }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `note-${note.id}`,
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
    };
    
    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <NoteCard note={note} onSelect={onSelect} onDelete={onDelete} />
        </div>
    );
};

const FolderOptionsMenu: React.FC<{
  folder: Folder;
  onOpenDeleteFolderModal: (folder: Folder) => void;
}> = ({ folder, onOpenDeleteFolderModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, () => setIsOpen(false));

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-text-dim hover:text-text-main rounded-full hover:bg-border-color"
        aria-label={`Options for folder ${folder.name}`}
      >
        <EllipsisVerticalIcon/>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg z-10 ring-1 ring-border-color">
          <button 
            onClick={() => {
              onOpenDeleteFolderModal(folder);
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            Delete Folder...
          </button>
        </div>
      )}
    </div>
  );
};

const FolderSection: React.FC<{
  folder: Folder;
  notes: Note[];
  isCollapsed: boolean;
  onToggleFolder: (folderId: string) => void;
  onCreateNote: (folderId: string) => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onOpenDeleteFolderModal: (folder: Folder) => void;
}> = ({ folder, notes, isCollapsed, onToggleFolder, onCreateNote, onSelectNote, onDeleteNote, onOpenDeleteFolderModal }) => {
  const { isOver, setNodeRef } = useDroppable({ id: `folder-${folder.id}` });
  
  return (
    <section aria-labelledby={`folder-title-${folder.id}`}>
      <div className="flex justify-between items-center mb-4 border-b-2 pb-2" style={{borderColor: folder.color}}>
        <button onClick={() => onToggleFolder(folder.id)} className="flex-grow text-left flex items-center group">
          <h2 id={`folder-title-${folder.id}`} className="text-2xl font-bold flex items-center">
            <span className="w-4 h-4 rounded-full mr-3" style={{backgroundColor: folder.color}}></span>
            {folder.name}
          </h2>
          <ChevronDownIcon className={`h-5 w-5 ml-3 text-text-dim transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onCreateNote(folder.id)}
            className="flex items-center text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-1" /> Add Note
          </button>
          <FolderOptionsMenu folder={folder} onOpenDeleteFolderModal={onOpenDeleteFolderModal} />
        </div>
      </div>
      {!isCollapsed && (
        <div ref={setNodeRef} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in rounded-xl p-2 transition-all duration-300 min-h-[100px] ${isOver ? 'bg-primary/10 ring-2 ring-primary/50' : ''}`}>
          {notes.map(note => (
            <DraggableNoteCard key={note.id} note={note} onSelect={onSelectNote} onDelete={onDeleteNote} />
          ))}
          {notes.length === 0 && (
            <div className="text-center text-text-dim col-span-full flex items-center justify-center">
              <p>Drop notes here to categorize.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const UncategorizedSection: React.FC<{
  notes: Note[];
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}> = ({ notes, onSelectNote, onDeleteNote }) => {
  const { isOver, setNodeRef } = useDroppable({ id: 'folder-uncategorized' });

  return (
    <section aria-labelledby="uncategorized-title">
      <div className="flex justify-between items-center mb-4 border-b-2 border-border-color pb-2">
        <h2 id="uncategorized-title" className="text-2xl font-bold text-text-dim">Uncategorized</h2>
      </div>
      <div ref={setNodeRef} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 rounded-xl p-2 transition-all duration-300 min-h-[100px] ${isOver ? 'bg-primary/10 ring-2 ring-primary/50' : ''}`}>
        {notes.map(note => (
          <DraggableNoteCard key={note.id} note={note} onSelect={onSelectNote} onDelete={onDeleteNote} />
        ))}
      </div>
    </section>
  );
};


const HomePage: React.FC<HomePageProps> = (props) => {
    const { notes, folders, notesByFolder, collapsedFolders, onCreateNote, onSelectNote, onDeleteNote, onMoveNoteToFolder, onOpenFolderModal, onOpenDeleteFolderModal, onToggleFolder, isAuthReady, isSignedIn, onSignIn, onSignOut, authError, savingStatus, hasUnsavedChanges, onSaveToDrive } = props;
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const collisionDetectionStrategy = useCallback((args: any) => {
        const pointerCollisions = pointerWithin(args);
        // Prioritize the trash can if pointer is over it.
        if (pointerCollisions.some(collision => collision.id === 'trash-zone')) {
            return pointerCollisions.filter(collision => collision.id === 'trash-zone');
        }
        // Otherwise, use rectangle intersection for everything else.
        return rectIntersection(args);
    }, []);

    const uncategorizedNotes = useMemo(() => {
        const categorizedNoteIds = new Set(notes.filter(n => n.folderId).map(n => n.id));
        return notes.filter(note => !categorizedNoteIds.has(note.id));
    }, [notes]);

    const isEverythingEmpty = folders.length === 0 && notes.length === 0;

    const activeNote = useMemo(() => {
        if (!activeDragId) return null;
        const noteId = activeDragId.replace('note-', '');
        return notes.find(n => n.id === noteId) || null;
    }, [activeDragId, notes]);

    const handleDragStart = (event: any) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        setActiveDragId(null);
        const { active, over } = event;

        if (!over) return; // Dropped outside any droppable area

        // Handle dropping on the trash zone
        if (over.id === 'trash-zone') {
            const noteId = active.id.replace('note-', '');
            onDeleteNote(noteId);
            return;
        }
        
        // Handle dropping on a folder
        if (over.id.startsWith('folder-')) {
            const noteId = active.id.replace('note-', '');
            const rawFolderId = over.id.replace('folder-', '');
            const targetFolderId = rawFolderId === 'uncategorized' ? null : rawFolderId;
            const currentNote = notes.find(n => n.id === noteId);

            if (currentNote && currentNote.folderId !== targetFolderId) {
                onMoveNoteToFolder(noteId, targetFolderId);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in h-full flex flex-col p-4 md:p-8">
            {authError && <AuthErrorDisplay message={authError} />}
            <header className="flex-shrink-0 flex justify-between items-center mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Cornell Notes</h1>
                    {isSignedIn && <SavingIndicator status={savingStatus} hasUnsavedChanges={hasUnsavedChanges} />}
                </div>
                <div className="flex items-center gap-4">
                    <AuthButton isAuthReady={isAuthReady} isSignedIn={isSignedIn} onSignIn={onSignIn} onSignOut={onSignOut} />
                     <button
                        onClick={onOpenFolderModal}
                        className="flex items-center justify-center bg-surface text-text-main font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-border-color transition-all duration-300"
                    >
                        <FolderPlusIcon />
                        New Folder
                    </button>
                    {isSignedIn && (
                         <button
                            onClick={onSaveToDrive}
                            disabled={savingStatus === 'saving'}
                            className={`flex items-center justify-center font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                                hasUnsavedChanges ? 'bg-secondary text-white hover:bg-purple-500 animate-pulse' : 'bg-surface text-text-main hover:bg-border-color'
                            }`}
                        >
                            <CloudUploadIcon className="h-5 w-5 mr-2" />
                            {savingStatus === 'saving' ? 'Saving...' : 'Save to Drive'}
                        </button>
                    )}
                    <button
                        onClick={() => onCreateNote(null)}
                        className="flex items-center justify-center bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-primary-hover transition-all duration-300 transform hover:scale-105"
                    >
                        <PlusIcon />
                        New Note
                    </button>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto">
                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={collisionDetectionStrategy}>
                    <main className="space-y-12">
                        {folders.map(folder => {
                            const notesInThisFolder = notesByFolder.get(folder.id) || [];
                            return (
                                <FolderSection
                                    key={folder.id}
                                    folder={folder}
                                    notes={notesInThisFolder}
                                    isCollapsed={!!collapsedFolders[folder.id]}
                                    onToggleFolder={onToggleFolder}
                                    onCreateNote={onCreateNote as (folderId: string) => void}
                                    onSelectNote={onSelectNote}
                                    onDeleteNote={onDeleteNote}
                                    onOpenDeleteFolderModal={onOpenDeleteFolderModal}
                                />
                            );
                        })}

                        {uncategorizedNotes.length > 0 && (
                        <UncategorizedSection
                                notes={uncategorizedNotes}
                                onSelectNote={onSelectNote}
                                onDeleteNote={onDeleteNote}
                        />
                        )}

                        {isEverythingEmpty && (
                            <div className="text-center py-16 px-6 bg-surface rounded-xl">
                                <h2 className="text-2xl font-semibold mb-2">Your workspace is empty!</h2>
                                <p className="text-text-dim mb-6">Create a folder or a new note to get started.</p>
                                <button
                                    onClick={() => onCreateNote(null)}
                                    className="inline-flex items-center justify-center bg-primary text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-primary-hover transition-all duration-300"
                                >
                                    <PlusIcon />
                                    Create Your First Note
                                </button>
                            </div>
                        )}
                    </main>
                    <DragOverlay dropAnimation={null}>
                        {activeNote ? (
                            <div className="opacity-95 shadow-2xl scale-105 transform-gpu">
                                <NoteCard note={activeNote} onSelect={() => {}} onDelete={() => {}} />
                            </div>
                        ) : null}
                    </DragOverlay>
                    
                    {activeDragId && <TrashDropZone />}
                </DndContext>
            </div>
        </div>
    );
};

export default HomePage;