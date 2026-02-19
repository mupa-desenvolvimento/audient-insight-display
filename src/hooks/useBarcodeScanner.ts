import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  timeLimit?: number; // Time in ms between keystrokes to consider it part of a scan
}

export const useBarcodeScanner = ({ 
  onScan, 
  minLength = 8, 
  timeLimit = 100 
}: BarcodeScannerOptions) => {
  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If time between keystrokes is too long, reset buffer
      if (currentTime - lastKeyTime.current > timeLimit && buffer.current.length > 0) {
        buffer.current = '';
      }
      
      lastKeyTime.current = currentTime;

      // Ignore special keys except Enter
      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          // It's a valid scan
          const scannedCode = buffer.current;
          onScan(scannedCode);
        }
        buffer.current = '';
        return;
      }

      // Only accept printable characters (usually numbers for barcodes)
      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, minLength, timeLimit]);
};
