import { computed, onUnmounted, watch, type MaybeRefOrGetter, toValue } from 'vue';
import { useAuthStore } from 'src/stores/auth';
import { api } from 'src/boot/axios';

const READY_STATE_OPEN = 1;

type TaggedSocket = WebSocket & { __catshowManualClose?: boolean };

function buildRealtimeWsUrl(token: string): string {
  const base = api.defaults.baseURL ?? 'http://localhost:3333/api/v1';
  const parsed = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const wsScheme = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsScheme}//${parsed.host}/api/v1/realtime/ws?token=${encodeURIComponent(token)}`;
}

/** Jedno WS spojenie posielajúce invalidate pre zadanú súťaž alebo katalóg. */
export function useCompetitionRealtime(opts: {
  competitionId?: MaybeRefOrGetter<number | null | undefined>;
  catalog?: MaybeRefOrGetter<boolean>;
  onInvalidate: () => void | Promise<void>;
}) {
  const authStore = useAuthStore();

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let destroyed = false;

  const resolvedCatalog = computed(() => (opts.catalog !== undefined ? !!toValue(opts.catalog) : false));

  const resolvedIds = computed(() => {
    if (opts.competitionId === undefined) return [] as number[];
    const raw = toValue(opts.competitionId);
    if (raw == null || !Number.isFinite(Number(raw))) return [];
    const n = Math.floor(Number(raw));
    return n >= 1 ? [n] : [];
  });

  const shouldConnect = computed(() => {
    if (!authStore.token) return false;
    if (resolvedCatalog.value) return true;
    return resolvedIds.value.length > 0;
  });

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function teardownSocket(closeCode?: number) {
    clearReconnect();
    if (ws) {
      const s = ws as TaggedSocket;
      s.__catshowManualClose = true;
      try {
        s.close(closeCode ?? 1000);
      } catch {
        /* noop */
      }
      ws = null;
    }
  }

  function sendSubscribe(sock: WebSocket) {
    sock.send(
      JSON.stringify({
        type: 'subscribe',
        competitionIds: resolvedIds.value,
        catalog: resolvedCatalog.value,
      }),
    );
  }

  function scheduleInvalidate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void opts.onInvalidate();
    }, 280);
  }

  function onSocketMessage(ev: MessageEvent<string>) {
    let msg: { type?: string; competitionId?: number };
    try {
      msg = JSON.parse(ev.data) as { type?: string; competitionId?: number };
    } catch {
      return;
    }
    const ids = resolvedIds.value;
    if (
      msg.type === 'invalidate' &&
      ids.length > 0 &&
      ids.includes(Number(msg.competitionId))
    ) {
      scheduleInvalidate();
      return;
    }
    if (msg.type === 'invalidate_catalog' && resolvedCatalog.value) {
      scheduleInvalidate();
    }
  }

  function scheduleReconnectFromClose() {
    if (destroyed || !shouldConnect.value) return;
    reconnectAttempt += 1;
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      establish();
    }, Math.min(30_000, 2000 * reconnectAttempt));
  }

  function establish() {
    if (destroyed) return;
    if (!shouldConnect.value) {
      teardownSocket();
      return;
    }

    const token = authStore.token;
    if (!token) return;

    teardownSocket();

    let next: WebSocket;
    try {
      next = new WebSocket(buildRealtimeWsUrl(token));
    } catch {
      scheduleReconnectFromClose();
      return;
    }
    ws = next;

    next.addEventListener('open', () => {
      reconnectAttempt = 0;
      if (ws === next && next.readyState === READY_STATE_OPEN) {
        sendSubscribe(next);
      }
    });
    next.addEventListener('message', onSocketMessage as (e: MessageEvent) => void);
    next.addEventListener('close', () => {
      if ((next as TaggedSocket).__catshowManualClose) return;
      if (ws === next) ws = null;
      if (destroyed) return;
      scheduleReconnectFromClose();
    });
    next.addEventListener('error', () => {});
  }

  watch([shouldConnect, resolvedIds, resolvedCatalog], establish, { immediate: true });

  onUnmounted(() => {
    destroyed = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    teardownSocket();
    clearReconnect();
  });
}
