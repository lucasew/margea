# Janitor's Journal

## 2024-08-01 - Centralize Page Layout with a Reusable Component
**Issue:** The main `App.tsx` component was passing a set of common props to every route, resulting in repetitive and cluttered code. This made it difficult to maintain and add new routes, as the same props had to be added to each one.
**Root Cause:** The application lacked a centralized layout component to manage the common structure and props for each page. This led to prop drilling and a less organized routing setup.
**Solution:** I created a new `MainLayout` component that uses `react-router-dom`'s `Outlet` and context API to provide the common props to all child routes. This simplified the routing logic in `App.tsx` by wrapping all the routes in the `MainLayout` component and removing the need to pass props to each one individually.
**Pattern:** When multiple pages share a common structure or set of props, create a reusable layout component that provides a centralized and consistent structure. This improves code maintainability, reduces repetition, and makes it easier to manage the overall application layout.
