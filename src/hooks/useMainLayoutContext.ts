import { useOutletContext } from 'react-router-dom';
import { MainLayoutContextType } from '../types';

export function useMainLayoutContext() {
  return useOutletContext<MainLayoutContextType>();
}
