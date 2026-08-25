import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useChildren } from '@/hooks/useParent';

interface ChildContextValue {
  childId: string;
  setChildId: (id: string) => void;
}

const ChildContext = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children }: { children: ReactNode }) {
  const [pickedId, setChildId] = useState('');
  const { data: kids } = useChildren();

  // Derive on the same render the roster arrives so Class/Fees/Homework do not
  // fire one request against /students/me (empty childId) before the effect runs.
  const childId =
    kids?.some((k) => k.id === pickedId) ? pickedId : (kids?.[0]?.id ?? '');

  const value = useMemo(() => ({ childId, setChildId }), [childId, setChildId]);
  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useSelectedChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useSelectedChild must be used within ChildProvider');
  return ctx;
}
