# Janitor's Journal

## 2024-08-01 - Centralize Page Layout with a Reusable Component
**Issue:** The main `App.tsx` component was passing a set of common props to every route, resulting in repetitive and cluttered code. This made it difficult to maintain and add new routes, as the same props had to be added to each one.
**Root Cause:** The application lacked a centralized layout component to manage the common structure and props for each page. This led to prop drilling and a less organized routing setup.
**Solution:** I created a new `MainLayout` component that uses `react-router-dom`'s `Outlet` and context API to provide the common props to all child routes. This simplified the routing logic in `App.tsx` by wrapping all the routes in the `MainLayout` component and removing the need to pass props to each one individually.
**Pattern:** When multiple pages share a common structure or set of props, create a reusable layout component that provides a centralized and consistent structure. This improves code maintainability, reduces repetition, and makes it easier to manage the overall application layout.

## 2024-08-02 - Refactor PRList Component
**Issue:** The `PRList` component was a large, monolithic component responsible for fetching, filtering, and displaying pull requests, as well as rendering the stats and filter UI. This made the component difficult to read, understand, and maintain.
**Root Cause:** The component was trying to do too much, mixing the concerns of data fetching and state management with the presentation of the stats and filters.
**Solution:** I refactored the `PRList` component by extracting the stats and filters into their own separate components: `PRListStats` and `PRListFilters`. This separation of concerns makes the `PRList` component smaller and more focused on its primary responsibility of managing the pull request data.
**Pattern:** When a component becomes too large and complex, identify distinct responsibilities and extract them into smaller, more focused components. This improves readability, maintainability, and reusability.

## 2026-01-16 - Optimize Sanitizer Regex Compilation
**Issue:** The `sanitize` function in `src/services/sanitizer.ts` recompiled a regular expression on every invocation.
**Root Cause:** The regex was defined inside the function body, causing it to be recreated with each call, which is an inefficient use of resources for a constant pattern.
**Solution:** I moved the regex to a `const` at the module level. This ensures the regex is compiled only once when the module is first loaded, and the same instance is reused for all subsequent calls to the `sanitize` function.
**Pattern:** For frequently called functions, define constant regular expressions outside the function scope to prevent unnecessary recompilation and improve performance. This is a common and effective micro-optimization.

## 2026-01-18 - Standardize Local Icon Component
**Issue:** `InfoIcon` was located in `src/components` instead of `src/components/icons` and did not accept standard SVG props, limiting reusability.
**Root Cause:** The component was likely created quickly with hardcoded classes for a specific use case, violating the project's icon component standards.
**Solution:** Moved the component to `src/components/icons`, updated it to accept `SVGProps<SVGSVGElement>`, and preserved default styling while allowing overrides via props.
**Pattern:** Local icon components should always reside in `src/components/icons` and must accept standard SVG props to ensure consistency, flexibility, and proper type safety.

## 2026-01-21 - Deduplicate Relay Mutation Logic
**Issue:** The `BulkActionsService` contained duplicated logic for executing Relay mutations (`mergePullRequest` and `closePullRequest`), repeating the same `commitMutation` boilerplate and Promise wrapping.
**Root Cause:** The code evolved by copying the first mutation function to create the second one without refactoring the common logic into a shared helper.
**Solution:** I extracted a private `performMutation` helper function that encapsulates the `commitMutation` call, Promise handling, and error management. Both service methods now use this helper, significantly reducing code duplication and improving readability.
**Pattern:** When multiple service methods execute similar Relay mutations, extract the common `commitMutation` setup and Promise handling into a reusable helper function to enforce consistency and reduce boilerplate.
