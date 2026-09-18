export type Connectivity = 'online' | 'offline' | 'reconnecting';

export interface NetworkSnapshot {
  online: boolean;
  status: Connectivity;
}

type Listener = (snap: NetworkSnapshot) => void;

let snapshot: NetworkSnapshot = { online: true, status: 'online' };
const listeners = new Set<Listener>();

export function getNetworkSnapshot(): NetworkSnapshot {
  return snapshot;
}

export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener(snapshot);
}

export function setNetworkSnapshot(next: NetworkSnapshot) {
  if (snapshot.online === next.online && snapshot.status === next.status) return;
  snapshot = next;
  emit();
}

/** Test hook — does not touch NetInfo. */
export function setNetworkSnapshotForTests(next: NetworkSnapshot) {
  snapshot = next;
  emit();
}
