import React, { useState, useCallback } from 'react';
import type { Note, NoteTab, Folder, SavingStatus } from '../types';
import SavingIndicator from './SavingIndicator';

interface NotePageProps {
  note: Note;
  folder: Folder | null;
  onUpdateNote: (note: Partial<Note> & { id: string }) => void;
  onGoHome: () => void;
  savingStatus: SavingStatus;
  isSignedIn: boolean;
}

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

const NotePage: React.FC<NotePageProps> = ({ note, folder, onUpdateNote, onGoHome, savingStatus, isSignedIn }) => {
  const [activeTab, setActiveTab] = useState<NoteTab>('content');

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({ id: note.id, title: e.target.value });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNote({ id: note.id, [activeTab]: e.target.value });
  };

  const handleExport = useCallback(() => {
    const fileContent = `# index\n${note.index}\n\n# content\n${note.content}\n\n# notes\n${note.notes}`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
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
  
  const getTabClass = (tabName: NoteTab): string => {
    return `px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors duration-300 focus:outline-none ${
      activeTab === tabName
        ? 'bg-surface text-primary'
        : 'text-text-dim hover:text-text-main hover:bg-gray-700/50'
    }`;
  };

  const textAreas: Record<NoteTab, { placeholder: string, value: string }> = {
    index: {
      placeholder: "Write your main questions, cues, or keywords here...",
      value: note.index,
    },
    content: {
      placeholder: "This is where your main notes go. Elaborate on the cues from the index.",
      value: note.content,
    },
    notes: {
      placeholder: "Summarize the key takeaways from this note in a few sentences.",
      value: note.notes,
    },
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      <header className="flex justify-between items-center mb-1 flex-wrap gap-4">
        <button
            onClick={onGoHome}
            className="flex items-center text-text-dim hover:text-text-main transition-colors"
        >
            <BackIcon />
            All Notes
        </button>
        <div className="flex-1 min-w-[200px] text-center">
            {/* Folder breadcrumb */}
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
            {isSignedIn && <SavingIndicator status={savingStatus} />}
            <button
                onClick={handleExport}
                className="flex items-center bg-transparent border border-primary text-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary hover:text-white transition-all duration-300"
            >
                <ExportIcon />
                Export to .txt
            </button>
        </div>
      </header>
      
      <main className="bg-surface rounded-xl shadow-2xl flex-grow flex flex-col mt-4">
        <div className="border-b border-border-color">
            <nav className="flex space-x-2 px-4">
                <button onClick={() => setActiveTab('index')} className={getTabClass('index')}>Index</button>
                <button onClick={() => setActiveTab('content')} className={getTabClass('content')}>Content</button>
                <button onClick={() => setActiveTab('notes')} className={getTabClass('notes')}>Notes</button>
            </nav>
        </div>

        <div className="p-1 flex-grow">
            <textarea
                key={activeTab}
                value={textAreas[activeTab].value}
                onChange={handleTextChange}
                placeholder={textAreas[activeTab].placeholder}
                className="w-full h-full bg-surface text-text-main p-6 text-lg leading-relaxed resize-none focus:outline-none placeholder-text-dim"
                autoFocus
            />
        </div>
      </main>
    </div>
  );
};

export default NotePage;
