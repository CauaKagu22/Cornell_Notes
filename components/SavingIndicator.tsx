import React from 'react';
import type { SavingStatus } from '../types';

interface SavingIndicatorProps {
  status: SavingStatus;
  hasUnsavedChanges: boolean;
}

const SpinnerIcon = ({ className = "h-5 w-5" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CloudCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CloudErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UnsavedChangesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);


const SavingIndicator: React.FC<SavingIndicatorProps> = ({ status, hasUnsavedChanges }) => {
    let text = '';
    let color = 'text-text-dim';
    let IconComponent: React.ElementType | null = null;
    let title = '';

    if (status === 'idle') {
        if (hasUnsavedChanges) {
            text = 'Unsaved changes';
            color = 'text-yellow-400';
            IconComponent = UnsavedChangesIcon;
            title = 'You have unsaved changes. Click "Save" to sync with Google Drive.';
        } else {
            return null; // All saved and idle
        }
    } else {
        switch (status) {
            case 'saving':
                text = 'Saving...';
                IconComponent = SpinnerIcon;
                title = 'Saving changes to Google Drive.';
                break;
            case 'saved':
                text = 'Saved';
                color = 'text-green-400';
                IconComponent = CloudCheckIcon;
                title = 'All changes have been saved to Google Drive.';
                break;
            case 'error':
                text = 'Error saving';
                color = 'text-red-500';
                IconComponent = CloudErrorIcon;
                title = 'Could not save changes to Google Drive. Please check your internet connection.';
                break;
            default:
                return null;
        }
    }


    return (
        <div className={`flex items-center gap-2 text-sm transition-colors duration-300 ${color}`} title={title}>
            {IconComponent && <IconComponent />}
            <span className="hidden md:inline">{text}</span>
        </div>
    );
};

export default SavingIndicator;