import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Route types
export type Route =
  | { type: 'home' }
  | { type: 'org'; orgName: string }
  | { type: 'orgs' }
  | { type: 'repo'; orgName: string; repoName: string }
  | { type: 'group'; searchQuery: string; groupKey: string };

interface RouterContextValue {
  currentRoute: Route;
  navigate: (route: Route) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

// Parse URL pathname to Route
function parseRoute(pathname: string): Route {
  // Remove leading/trailing slashes
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');

  if (!cleanPath) {
    return { type: 'home' };
  }

  const parts = cleanPath.split('/');

  // /orgs
  if (parts.length === 1 && parts[0] === 'orgs') {
    return { type: 'orgs' };
  }

  // /org/:orgName
  if (parts.length === 2 && parts[0] === 'org') {
    return { type: 'org', orgName: decodeURIComponent(parts[1]) };
  }

  // /:orgName/:repoName
  if (parts.length === 2) {
    return {
      type: 'repo',
      orgName: decodeURIComponent(parts[0]),
      repoName: decodeURIComponent(parts[1])
    };
  }

  // Default to home
  return { type: 'home' };
}

// Convert Route to pathname
function routeToPath(route: Route): string {
  switch (route.type) {
    case 'home':
      return '/';
    case 'org':
      return `/org/${encodeURIComponent(route.orgName)}`;
    case 'orgs':
      return '/orgs';
    case 'repo':
      return `/${encodeURIComponent(route.orgName)}/${encodeURIComponent(route.repoName)}`;
    case 'group':
      return window.location.pathname; // Keep current path for group details
  }
}

// Convert Route to search query
export function routeToSearchQuery(route: Route): string | null {
  switch (route.type) {
    case 'home':
      return null;
    case 'org':
      return `is:pr author:renovate[bot] org:${route.orgName}`;
    case 'orgs':
      return 'is:pr author:renovate[bot]';
    case 'repo':
      return `is:pr author:renovate[bot] repo:${route.orgName}/${route.repoName}`;
    case 'group':
      return route.searchQuery;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname)
  );

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const newRoute = parseRoute(window.location.pathname);
      setCurrentRoute(newRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: Route) => {
    const path = routeToPath(route);

    // Don't push state if we're just showing group details
    if (route.type === 'group') {
      setCurrentRoute(route);
      return;
    }

    // Push new state
    window.history.pushState({ route }, '', path);
    setCurrentRoute(route);
  };

  const goBack = () => {
    window.history.back();
  };

  return (
    <RouterContext.Provider value={{ currentRoute, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context;
}
