export interface Folder {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id:string;
  title: string;
  index: string;
  content: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
}

export type NoteTab = 'index' | 'content' | 'notes';

export type SavingStatus = 'idle' | 'saving' | 'saved' | 'error';
