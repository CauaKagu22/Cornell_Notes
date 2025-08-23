import React, { useRef } from 'react';

const PRESET_COLORS = [
  '#6366f1', // Indigo (Primary)
  '#a855f7', // Purple (Secondary)
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#ec4899', // Pink
];

interface ColorPickerProps {
  selectedColor: string;
  onChange: (color: string) => void;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);


const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onChange }) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  // A color is custom if it's not in our preset list.
  const isCustomColor = !PRESET_COLORS.includes(selectedColor);

  const handleCustomColorButtonClick = () => {
    // Programmatically click the hidden color input to open the native color picker.
    colorInputRef.current?.click();
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When the native picker's value changes, update the state.
    onChange(e.target.value);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-dim mb-2">Folder Color</label>
      <div className="grid grid-cols-5 gap-3">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-10 h-10 rounded-full transition-transform transform hover:scale-110 focus:outline-none ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''}`}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}

        {/* Custom Color Picker Button */}
        <div className="relative w-10 h-10">
            <button
                type="button"
                onClick={handleCustomColorButtonClick}
                className={`w-full h-full rounded-full transition-all flex items-center justify-center transform hover:scale-110 focus:outline-none ${isCustomColor ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''}`}
                style={{ 
                  backgroundColor: isCustomColor ? selectedColor : 'transparent',
                  border: isCustomColor ? 'none' : `2px dashed #404040` 
                }}
                aria-label="Select a custom color"
            >
                {!isCustomColor && <PlusIcon />}
            </button>
            <input
                ref={colorInputRef}
                type="color"
                value={selectedColor || '#6366f1'} 
                onChange={handleColorInputChange}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                aria-hidden="true"
                tabIndex={-1}
            />
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
