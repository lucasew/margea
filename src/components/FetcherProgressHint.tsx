import { useTranslation } from 'react-i18next';
import { usePRContext } from '../context/PRContext';

export function FetcherProgressHint() {
  const { t } = useTranslation();
  const {
    isFetchingNextPage,
    isLoading,
    loadNextPage,
    oldestFetchedDate,
    hasNextPage,
  } = usePRContext();

  const isFetching = isFetchingNextPage || isLoading;

  if (!isFetching && !oldestFetchedDate) {
    return null;
  }

  const canAskForMore = !isFetching && hasNextPage;

  const handleAskMore = () => {
    if (canAskForMore) {
      loadNextPage();
    }
  };

  let label = t('fetcher.ready');
  if (isFetching) {
    label = t('fetcher.searching');
  } else if (oldestFetchedDate) {
    const d = oldestFetchedDate;
    const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    label = t('fetcher.upTo', { date: dateLabel });
  }

  return (
    <button
      type="button"
      onClick={handleAskMore}
      disabled={!canAskForMore}
      className={`inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-base font-medium shadow-md border transition active:scale-[0.985] select-none
        ${
          isFetching
            ? 'bg-base-300 border-base-300 text-base-content cursor-default'
            : canAskForMore
              ? 'bg-base-200 border-base-300 text-base-content hover:bg-base-300 cursor-pointer'
              : 'bg-base-300 border-base-300 text-base-content/70 cursor-default'
        }`}
      title={
        canAskForMore
          ? t('fetcher.clickToLoadMore')
          : isFetching
            ? t('fetcher.searchingMore')
            : t('fetcher.noMore')
      }
    >
      {isFetching && (
        <span
          className="loading loading-spinner loading-sm"
          aria-hidden="true"
        ></span>
      )}
      <span>{label}</span>
    </button>
  );
}
