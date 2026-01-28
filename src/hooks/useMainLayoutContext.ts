import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContextType } from '../components/MainLayout';

export function useMainLayoutContext() {
  return useOutletContext<MainLayoutContextType>();
}
