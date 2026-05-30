import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface ChildContextValue {
  childId: string;
  setChildId: (id: string) => void;
}

const ChildContext = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children }: { children: ReactNode }) {
  const [childId, setChildId] = useState('k1');
  const value = useMemo(() => ({ childId, setChildId }), [childId]);
  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useSelectedChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useSelectedChild must be used within ChildProvider');
  return ctx;
}
