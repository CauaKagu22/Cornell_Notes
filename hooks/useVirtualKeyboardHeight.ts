import { useState, useEffect } from 'react';

/**
 * A hook that returns the height of the virtual keyboard.
 * This is useful for adjusting the UI when the keyboard is open on mobile devices.
 */
export function useVirtualKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const handleResize = () => {
      // The keyboard height is the difference between the layout viewport and the visual viewport.
      const newKeyboardHeight = window.innerHeight - window.visualViewport.height;
      // We only care about the keyboard taking up space, so only positive values.
      // Some browser UI changes can cause small negative values.
      setKeyboardHeight(Math.max(0, newKeyboardHeight));
    };

    window.visualViewport.addEventListener('resize', handleResize);
    handleResize(); // Initial check in case keyboard is already open

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return keyboardHeight;
}
