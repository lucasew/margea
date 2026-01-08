# Janitor's Journal

## 2024-05-20 - Refactor Icon to Local SVG Component
**Issue:** The codebase used icons from the `react-feather` third-party library, increasing the bundle size and adding an external dependency for simple assets.
**Root Cause:** The initial implementation likely prioritized development speed by using a pre-built icon library. Over time, as only a few icons were needed, this became an unnecessary dependency.
**Solution:** I replaced the `Heart` icon in `Footer.tsx` with a self-contained, reusable `HeartIcon.tsx` component. The new component is a simple SVG, eliminating the need for the `react-feather` import in that file.
**Pattern:** To improve performance and reduce dependencies, replace icons from third-party libraries (e.g., `react-feather`) with local, self-contained SVG components. These components should be organized in a dedicated `src/components/icons` directory and designed to accept standard `React.SVGProps` for maximum reusability. This approach ensures consistency and minimizes the application's bundle size.
