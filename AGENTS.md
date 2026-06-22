# Guidelines

- Always install jdx/mise before touching anything in code. Make sure intermediary files are gitignored or ausent.
- Don't ever inline icons
- Don't touch the headers
- Don't format code that you are not creating
- Prefer using well known solutions for validation instead of trying to implement your own
- If you are a open scope housekeeping agent start with deviations from these guidelines before looking for anything else

# Relay / data ownership (thin Relay)

- **PR list state** lives in `PRProvider.prMap` (React state). UI reads that map, not the Relay store.
- **Relay** is the GraphQL transport (`fetchQuery` for search, `commitMutation` for merge/close) plus a single **ViewerQuery** at `ViewerProvider` (authenticated app root). Read viewer via `useViewer()` only.
- **Do not** add Relay store `optimisticUpdater`/`updater` for PRs, or new `ViewerQuery`/`useLazyLoadQuery(ViewerQuery)` outside `ViewerProvider`. On mutation success, apply `updatedFields` through `optimisticUpdate` on `prMap`.
- **Pagination** for PR search is domain-specific (`AdaptiveScopeFetcher` + date windows), not Relay `@connection` — GitHub Search limits justify this.
- GraphQL responses may include partial `data` with `errors`; environment returns data when present; invalid nodes are dropped in `transformPR`.
