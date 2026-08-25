import { createContext, ReactNode, useContext, useMemo } from 'react';

type BrandContextValue = {
  seed: string;
  version: number;
};

const BrandContext = createContext<BrandContextValue>({ seed: 'school', version: 0 });

export function useBrand(): BrandContextValue {
  return useContext(BrandContext);
}

/**
 * Brand shell kept for API compatibility.
 * Does not mutate theme — student app keeps the fixed iceberg palette.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ seed: 'school', version: 0 }), []);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}
