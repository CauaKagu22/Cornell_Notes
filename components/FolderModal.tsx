import React, { useState, useEffect } from 'react';
import ColorPicker from './ColorPicker';
import type { Folder } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderData: { name: string; color: string }) => void;
  existingFolder?: Folder; // For editing in the future
}

const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, onSave, existingFolder }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    if (existingFolder) {
      setName(existingFolder.name);
      setColor(existingFolder.color);
    } else {
      setName('');
      setColor('#6366f1');
    }
  }, [existingFolder, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name: name.trim(), color });
    }
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
        <h2 className="text-2xl font-bold text-text-main mb-6">{existingFolder ? 'Edit Folder' : 'Create New Folder'}</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-text-dim mb-2">Folder Name</label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project X, Study Notes"
              className="w-full bg-brand-bg border border-border-color text-text-main rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <ColorPicker selectedColor={color} onChange={setColor} />
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-transparent text-text-dim font-semibold py-2 px-4 rounded-lg hover:bg-border-color/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-primary text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderModal;
