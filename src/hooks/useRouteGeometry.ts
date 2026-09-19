import { useQuery } from '@tanstack/react-query';
import { getRouteGeometry } from '@/services/http/routeGeometry';
import { qk } from './keys';

/** Road-following geometry for a transport route; only fetches once a route id is known. */
export function useRouteGeometry(routeId: string | null | undefined) {
  return useQuery({
    queryKey: qk.routeGeometry(routeId ?? ''),
    queryFn: () => getRouteGeometry(routeId as string),
    enabled: !!routeId,
    staleTime: 60_000,
  });
}
