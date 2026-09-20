import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Toast } from '@/components/ui';

type ToastFn = (msg: string, ms?: number) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ show: false, msg: '' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback<ToastFn>((msg, ms = 1800) => {
    if (timer.current) clearTimeout(timer.current);
    setState({ show: true, msg });
    timer.current = setTimeout(() => setState((s) => ({ ...s, show: false })), ms);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toast show={state.show} msg={state.msg} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
