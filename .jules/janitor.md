# Janitor's Journal

## 2024-08-01 - Centralize Page Layout with a Reusable Component
**Issue:** The main `App.tsx` component was passing a set of common props to every route, resulting in repetitive and cluttered code. This made it difficult to maintain and add new routes, as the same props had to be added to each one.
**Root Cause:** The application lacked a centralized layout component to manage the common structure and props for each page. This led to prop drilling and a less organized routing setup.
**Solution:** I created a new `MainLayout` component that uses `react-router-dom`'s `Outlet` and context API to provide the common props to all child routes. This simplified the routing logic in `App.tsx` by wrapping all the routes in the `MainLayout` component and removing the need to pass props to each one individually.
**Pattern:** When multiple pages share a common structure or set of props, create a reusable layout component that provides a centralized and consistent structure. This improves code maintainability, reduces repetition, and makes it easier to manage the overall application layout.

## 2026-01-12 - Remove unused @tailwindcss/typography dependency
**Issue:** The `@tailwindcss/typography` dependency was included in the project but was not being used. The `prose` class, which is the primary feature of this plugin, was not found anywhere in the codebase.
**Root Cause:** The dependency was likely added for a feature that was either never implemented or was later removed. It was left in the project, adding unnecessary bloat to the dependencies.
**Solution:** I uninstalled the package and removed the corresponding plugin configuration from `tailwind.config.js`.
**Pattern:** Regularly audit dependencies and remove any that are no longer in use. Unused dependencies increase bundle size, slow down installation times, and can pose a security risk if they become outdated. A simple search for usage can often identify unused assets.
