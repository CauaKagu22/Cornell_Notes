import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { Note, NoteTab, Folder, SavingStatus, NoteBlock } from '../types';
import SavingIndicator from './SavingIndicator';
import { useVirtualKeyboardHeight } from '../hooks/useVirtualKeyboardHeight';

interface NotePageProps {
  note: Note;
  folder: Folder | null;
  onUpdateNote: (note: Partial<Note> & { id: string }) => void;
  onGoHome: () => void;
  onSaveToDrive: () => void;
  savingStatus: SavingStatus;
  hasUnsavedChanges: boolean;
  isSignedIn: boolean;
}

// --- ICONS ---
const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const ExportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TrashIcon = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CloudUploadIcon = ({className = "h-5 w-5 mr-2"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m-4-4l4-4 4 4" />
    </svg>
);

// --- NOTE BLOCK COMPONENT ---
const NoteBlockComponent: React.FC<{
  block: NoteBlock,
  onUpdate: (id: string, updates: Partial<NoteBlock>) => void,
  onDelete: (id: string) => void,
}> = ({ block, onUpdate, onDelete }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate(block.id, { content: e.target.value });
        // Auto-resize
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${e.target.scrollHeight}px`;
        }
    };
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate(block.id, { title: e.target.value });
    };

    // Set initial height
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [block.id]);

    const blockTypeStyles: Record<NoteTab, {borderColor: string, label: string}> = {
        index: { borderColor: '#a855f7', label: 'Index / Cue' },
        content: { borderColor: '#6366f1', label: 'Content' },
        notes: { borderColor: '#22c55e', label: 'Summary' },
    }

    return (
        <div className="bg-surface rounded-xl shadow-lg border-t-4" style={{borderColor: blockTypeStyles[block.type].borderColor}}>
            <div className="p-4 border-b border-border-color flex justify-between items-center gap-4">
                 <input
                    type="text"
                    value={block.title}
                    onChange={handleTitleChange}
                    placeholder="Block title..."
                    className="w-full bg-transparent text-lg font-semibold text-text-main focus:outline-none"
                />
                <button 
                    onClick={() => onDelete(block.id)}
                    className="text-text-dim hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-500/10"
                    aria-label="Delete this block"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="p-1">
                 <textarea
                    ref={textareaRef}
                    value={block.content}
                    onChange={handleContentChange}
                    placeholder={`Write your ${block.type} here...`}
                    className="w-full bg-surface text-text-main p-4 text-lg leading-relaxed resize-none focus:outline-none placeholder-text-dim overflow-hidden"
                    rows={1}
                />
            </div>
        </div>
    );
};


// --- NOTE PAGE ---
const NotePage: React.FC<NotePageProps> = ({ note, folder, onUpdateNote, onGoHome, onSaveToDrive, savingStatus, hasUnsavedChanges, isSignedIn }) => {
  const keyboardHeight = useVirtualKeyboardHeight();
  const footerRef = useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    if (footerRef.current) {
      setFooterHeight(footerRef.current.offsetHeight);
    }
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({ id: note.id, title: e.target.value });
  };
  
  const handleAddBlock = (type: NoteTab) => {
      const defaultTitles: Record<NoteTab, string> = {
          index: 'Index / Cues',
          content: 'Main Notes',
          notes: 'Summary'
      }
      const newBlock: NoteBlock = {
          id: `block-${Date.now()}`,
          type,
          title: defaultTitles[type],
          content: '',
      };
      onUpdateNote({id: note.id, blocks: [...note.blocks, newBlock]});
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<NoteBlock>) => {
      const newBlocks = note.blocks.map(b => b.id === blockId ? {...b, ...updates} : b);
      onUpdateNote({id: note.id, blocks: newBlocks});
  };

  const handleDeleteBlock = (blockId: string) => {
      const newBlocks = note.blocks.filter(b => b.id !== blockId);
      onUpdateNote({id: note.id, blocks: newBlocks});
  };

  const handleExport = useCallback(() => {
    const joiner = (blocks: NoteBlock[]): string => {
        if (!blocks || blocks.length === 0) return '';
        
        let result = blocks[0].content;
        for (let i = 1; i < blocks.length; i++) {
            result += '\n\n----\n\n';
            if (blocks[i].title) {
                result += `${blocks[i].title}\n`;
            }
            result += blocks[i].content;
        }
        return result;
    }

    const blocksByType = {
        index: note.blocks.filter(b => b.type === 'index' && b.content.trim()),
        content: note.blocks.filter(b => b.type === 'content' && b.content.trim()),
        notes: note.blocks.filter(b => b.type === 'notes' && b.content.trim()),
    };

    let fileContent = '';
    if (blocksByType.index.length > 0) {
        fileContent += '# index\n\n' + joiner(blocksByType.index) + '\n\n';
    }
    if (blocksByType.content.length > 0) {
        fileContent += '# content\n\n' + joiner(blocksByType.content) + '\n\n';
    }
    if (blocksByType.notes.length > 0) {
        fileContent += '# notes\n\n' + joiner(blocksByType.notes);
    }

    const blob = new Blob([fileContent.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cornell_note';
    link.href = url;
    link.download = `${fileName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [note]);
  
  return (
    <div className="max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <button
            onClick={onGoHome}
            className="flex items-center text-text-dim hover:text-text-main transition-colors"
        >
            <BackIcon />
            All Notes
        </button>
        <div className="flex-1 min-w-[200px] text-center">
            {folder && (
                <div className="text-sm text-text-dim mb-1">
                    In folder: <span className="font-semibold" style={{color: folder.color}}>{folder.name}</span>
                </div>
            )}
            <input
                type="text"
                value={note.title}
                onChange={handleTitleChange}
                placeholder="Note Title"
                className="w-full bg-transparent text-2xl md:text-3xl font-bold text-center text-text-main focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-2 py-1"
            />
        </div>
        <div className="flex items-center gap-4">
            {isSignedIn && <SavingIndicator status={savingStatus} hasUnsavedChanges={hasUnsavedChanges} />}
            {isSignedIn && (
                <button
                    onClick={onSaveToDrive}
                    disabled={savingStatus === 'saving'}
                    className={`flex items-center justify-center font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        hasUnsavedChanges ? 'bg-secondary text-white hover:bg-purple-500 animate-pulse' : 'bg-surface text-text-main hover:bg-border-color'
                    }`}
                >
                    <CloudUploadIcon className="h-5 w-5 mr-2" />
                    {savingStatus === 'saving' ? 'Saving...' : 'Save'}
                </button>
            )}
            <button
                onClick={handleExport}
                className="flex items-center bg-transparent border border-primary text-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary hover:text-white transition-all duration-300"
            >
                <ExportIcon />
                Export
            </button>
        </div>
      </header>
      
      <main className="space-y-6" style={{ paddingBottom: footerHeight > 0 ? `${footerHeight + 24}px` : '8rem' }}>
        {note.blocks.map(block => (
          <NoteBlockComponent
            key={block.id}
            block={block}
            onUpdate={handleUpdateBlock}
            onDelete={handleDeleteBlock}
          />
        ))}
        {note.blocks.length === 0 && (
            <div className="text-center py-16 px-6 bg-surface rounded-xl">
                <h2 className="text-2xl font-semibold mb-2">Empty Note</h2>
                <p className="text-text-dim">Use the buttons below to add your first block.</p>
            </div>
        )}
      </main>

      {/* Action Buttons Footer */}
      <footer 
        ref={footerRef}
        className="fixed left-0 right-0 z-10 p-2 bg-brand-bg/95 border-t border-border-color transition-[bottom] duration-300 ease-out"
        style={{ bottom: `${keyboardHeight}px` }}
      >
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-around items-center gap-2">
                <button 
                  onClick={() => handleAddBlock('index')} 
                  className="flex-1 text-center py-3 px-2 rounded-lg bg-surface hover:bg-border-color transition-colors text-sm font-semibold" 
                  style={{color: '#a855f7'}}
                >
                  + Add Index / Cue
                </button>
                <button 
                  onClick={() => handleAddBlock('content')} 
                  className="flex-1 text-center py-3 px-2 rounded-lg bg-surface hover:bg-border-color transition-colors text-sm font-semibold" 
                  style={{color: '#6366f1'}}
                >
                  + Add Content
                </button>
                <button 
                  onClick={() => handleAddBlock('notes')} 
                  className="flex-1 text-center py-3 px-2 rounded-lg bg-surface hover:bg-border-color transition-colors text-sm font-semibold" 
                  style={{color: '#22c55e'}}
                >
                  + Add Summary
                </button>
            </div>
          </div>
      </footer>
    </div>
  );
};

export default NotePage;