type Reset = () => Promise<void>;

let reset: Reset | null = null;

/** AuthProvider registers this so the error screen can return the user to login. */
export function registerSessionReset(fn: Reset): () => void {
  reset = fn;
  return () => {
    if (reset === fn) reset = null;
  };
}

export async function resetSessionForLogin(): Promise<void> {
  await reset?.();
}
