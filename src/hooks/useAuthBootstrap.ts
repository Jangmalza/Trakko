import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Runs the auth bootstrap sequence once at app start without subscribing to store updates.
 */
export const useAuthBootstrap = () => {
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) {
      return;
    }

    const { bootstrap, hasChecked, checking } = useAuthStore.getState();
    if (hasChecked || checking) {
      return;
    }

    requestedRef.current = true;
    void bootstrap().catch(() => {
      requestedRef.current = false;
    });
  }, []);
};
