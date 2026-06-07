import { useCallback, useState } from 'react';
import { adminAuthService } from '@/services/admin/adminAuthService';
import type { AdminRegisterRequest, AdminSignInRequest } from '@/types/domain/adminAuth.types';

export function useAdminAuth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(async (action: () => Promise<void>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signIn = useCallback(
    (payload: AdminSignInRequest) =>
      run(async () => {
        await adminAuthService.signIn(payload);
      }),
    [run],
  );

  const signUp = useCallback(
    async (payload: AdminRegisterRequest): Promise<void> => {
      await run(async () => {
        await adminAuthService.signUp(payload);
      });
    },
    [run],
  );

  return {
    isSubmitting,
    error,
    clearError,
    signIn,
    signUp,
  };
};
