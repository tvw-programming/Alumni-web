import type { AppError } from './api';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppError;
    mutationMeta: {
      /** Set true when the caller renders its own error UI (e.g. form submit errors). */
      silenceGlobalError?: boolean;
    };
  }
}
