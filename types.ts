export interface Folder {
  id: string;
  name: string;
  color: string;
}

export type NoteTab = 'index' | 'content' | 'notes';

export interface NoteBlock {
  id: string;
  type: NoteTab;
  title: string;
  content: string;
}

export interface Note {
  id:string;
  title: string;
  blocks: NoteBlock[];
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
}

export type SavingStatus = 'idle' | 'saving' | 'saved' | 'error';