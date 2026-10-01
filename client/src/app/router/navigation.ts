import { useState, useEffect } from 'react';

/**
 * Navigate to a specific path using pushState and trigger a popstate event
 * so all listening components react synchronously. Supports optional history state.
 */
export const navigate = (path: string, state?: any) => {
  if (window.location.pathname + window.location.search !== path || state !== undefined) {
    window.history.pushState(state !== undefined ? state : (window.history.state || {}), '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
};

/**
 * Hook to get and listen to the current pathname.
 */
export const useCurrentPath = (): string => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return currentPath;
};

/**
 * Hook to read and update URL search parameters.
 */
export const useSearchParams = () => {
  const [params, setParams] = useState<URLSearchParams>(() => new URLSearchParams(window.location.search));

  useEffect(() => {
    const handleLocationChange = () => {
      setParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const setSearchParams = (
    next: URLSearchParams | Record<string, string>,
    opts?: { replace?: boolean }
  ) => {
    const str = next instanceof URLSearchParams ? next.toString() : new URLSearchParams(next).toString();
    const newUrl = window.location.pathname + (str ? `?${str}` : '');
    if (opts?.replace) {
      window.history.replaceState(window.history.state, '', newUrl);
    } else {
      window.history.pushState(window.history.state, '', newUrl);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return [params, setSearchParams] as const;
};

/**
 * Hook to access window.history.state reactively.
 */
export const useNavigationState = <T = any>(): T | null => {
  const [state, setState] = useState<T | null>(() => (window.history.state as T) || null);

  useEffect(() => {
    const handleLocationChange = () => {
      setState((window.history.state as T) || null);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return state;
};
