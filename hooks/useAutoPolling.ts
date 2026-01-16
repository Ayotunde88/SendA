import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAutoPollingOptions {
  intervalMs?: number;
  enabled?: boolean;
  fetchOnMount?: boolean;
  pauseInBackground?: boolean;
}

export function useAutoPolling(
  fetchFn: () => void | Promise<void>,
  options: UseAutoPollingOptions = {}
) {
  const {
    intervalMs = 10000,
    enabled = true,
    fetchOnMount = true,
    pauseInBackground = true,
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      console.log('[useAutoPolling] Polling...');
      fetchFnRef.current();
    }, intervalMs);
  }, [intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!pauseInBackground) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasBackground && isNowActive && enabled) {
        console.log('[useAutoPolling] App came to foreground, resuming polling');
        fetchFnRef.current();
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('[useAutoPolling] App went to background, pausing polling');
        stopPolling();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [enabled, pauseInBackground, startPolling, stopPolling]);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    if (fetchOnMount) {
      console.log('[useAutoPolling] Initial fetch on mount');
      fetchFnRef.current();
    }

    startPolling();
    return () => stopPolling();
  }, [enabled, fetchOnMount, startPolling, stopPolling]);

  return {
    startPolling,
    stopPolling,
    refetch: useCallback(() => fetchFnRef.current(), []),
  };
}

export default useAutoPolling;
