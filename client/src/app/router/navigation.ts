import { useState, useEffect } from 'react';

/**
 * Navigate to a specific path using pushState and trigger a popstate event
 * so all listening components react synchronously.
 */
export const navigate = (path: string) => {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
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
