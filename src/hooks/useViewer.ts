import { useContext } from 'react';
import { ViewerContext } from '../context/ViewerContext';

/** Reads viewer from ViewerProvider (single ViewerQuery at authenticated app root). */
export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) {
    throw new Error('useViewer must be used within ViewerProvider');
  }
  return ctx;
}
