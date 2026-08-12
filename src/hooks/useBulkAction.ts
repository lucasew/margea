import { BulkActionContext } from '../context/BulkActionContext';
import { useRequiredContext } from '../utils/useRequiredContext';

export function useBulkAction() {
  return useRequiredContext(
    BulkActionContext,
    'useBulkAction must be used within a BulkActionProvider',
  );
}
