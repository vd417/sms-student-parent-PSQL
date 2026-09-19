import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

/** Road-following geometry for a transport route; only fetches once a route id is known.
 * Goes through `services.transport` (not the HTTP repo function directly) so mock/dev
 * mode (`DATA_SOURCE='mock'`) resolves from the mock fixtures instead of always hitting
 * the real network and permanently showing "Route unavailable" in local/demo builds. */
export function useRouteGeometry(routeId: string | null | undefined) {
  return useQuery({
    queryKey: qk.routeGeometry(routeId ?? ''),
    queryFn: () => services.transport.routeGeometry(routeId as string),
    enabled: !!routeId,
    staleTime: 60_000,
  });
}
