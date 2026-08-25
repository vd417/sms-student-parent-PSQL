import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useChildren } from '@/hooks/useParent';

interface ChildContextValue {
  childId: string;
  setChildId: (id: string) => void;
}

const ChildContext = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children }: { children: ReactNode }) {
  const [childId, setChildId] = useState('');
  const { data: kids } = useChildren();

  // Default to the first real child once the roster loads, and re-anchor if the
  // selected child disappears (e.g. session switched to a different parent).
  useEffect(() => {
    if (!kids?.length) return;
    if (!kids.some((k) => k.id === childId)) setChildId(kids[0].id);
  }, [kids, childId]);

  const value = useMemo(() => ({ childId, setChildId }), [childId]);
  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useSelectedChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useSelectedChild must be used within ChildProvider');
  return ctx;
}
