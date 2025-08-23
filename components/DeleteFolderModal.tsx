import React, { useState, useEffect } from 'react';
import type { Folder } from '../types';

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (folder: Folder, deleteNotes: boolean) => void;
  folder: Folder | null;
  noteCount: number;
}

const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({ isOpen, onClose, onConfirm, folder, noteCount }) => {
  const [deleteNotes, setDeleteNotes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeleteNotes(false);
    }
  }, [isOpen]);

  if (!isOpen || !folder) return null;

  const handleConfirm = () => {
    onConfirm(folder, deleteNotes);
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-surface rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-red-400 mb-4">Delete Folder</h2>
        <p className="text-text-dim mb-6">
            Are you sure you want to delete the folder "<strong className="text-text-main">{folder.name}</strong>"? This action cannot be undone.
        </p>
        
        <div className="space-y-4 bg-brand-bg p-4 rounded-lg">
           <div className="relative flex items-start">
             <div className="flex h-6 items-center">
                <input
                    id="delete-notes-checkbox"
                    aria-describedby="delete-notes-description"
                    name="delete-notes"
                    type="checkbox"
                    checked={deleteNotes}
                    onChange={(e) => setDeleteNotes(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-primary focus:ring-primary"
                />
            </div>
            <div className="ml-3 text-sm leading-6">
                <label htmlFor="delete-notes-checkbox" className="font-medium text-text-main">
                    Also permanently delete all {noteCount} notes in this folder.
                </label>
                <p id="delete-notes-description" className="text-text-dim">
                    If unchecked, notes will be moved to "Uncategorized".
                </p>
            </div>
           </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-transparent text-text-dim font-semibold py-2 px-4 rounded-lg hover:bg-border-color/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-red-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteFolderModal;