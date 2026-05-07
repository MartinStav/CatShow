/** Stav vyvolávania ako u stevarda (čaká → volaná → hodnotí sa → hotovo). */

export type CatCallStatus = 'waiting' | 'called' | 'judging' | 'completed';

const ORDER: CatCallStatus[] = ['waiting', 'called', 'judging', 'completed'];

export function parseCatCallStatus(raw: unknown): CatCallStatus {
  if (raw === 'waiting' || raw === 'called' || raw === 'judging' || raw === 'completed') {
    return raw;
  }
  return 'waiting';
}

export function nextCatCallStatus(current: CatCallStatus): CatCallStatus {
  const i = ORDER.indexOf(current);
  const next = ORDER[(i + 1) % ORDER.length];
  return next ?? 'waiting';
}

export function catCallStatusLabel(s: CatCallStatus): string {
  switch (s) {
    case 'waiting':
      return 'Čaká';
    case 'called':
      return 'Volaná';
    case 'judging':
      return 'Hodnotí sa';
    case 'completed':
      return 'Hotovo';
    default:
      return s;
  }
}

/** Material ikona v štýle stevardovského rozhrania. */
export function catCallStatusIcon(s: CatCallStatus): string {
  switch (s) {
    case 'waiting':
      return 'schedule';
    case 'called':
      return 'phone_in_talk';
    case 'judging':
      return 'play_circle';
    case 'completed':
      return 'check_circle';
    default:
      return 'help_outline';
  }
}

interface CatWithCallStatus {
  id: string;
  status: CatCallStatus;
}

/** Riadok judge protokolu (API judging-orders). */
export type JudgingOrderLike = {
  id?: number;
  judgeId: number;
  catId: number;
  tableNumber: number;
  /** Blok/skupina na stole – rovnaký text = tá istá skupina (prepínač). Prázdny = bez názvu. */
  protocolGroup?: string | null;
  orderPosition: number;
  /** Nominácia. */
  protocolCallStatus?: CatCallStatus;
  ring1ProtocolCallStatus?: CatCallStatus;
  ring2ProtocolCallStatus?: CatCallStatus;
};

/** Kľúč skupiny vo fronte/taboch: prázdny reťazec = predvolený blok bez názvu. */
export function normalizedProtocolGroupKey(row: Pick<JudgingOrderLike, 'protocolGroup'>): string {
  const s = typeof row.protocolGroup === 'string' ? row.protocolGroup.trim() : '';
  return s;
}

/** Ktorý stĺpec protokolu používa daná obrazovka. */
export type StewardJudgingRound = 'nomination' | 'ring1' | 'ring2';

function pickProtocol(raw: unknown, fallback: CatCallStatus): CatCallStatus {
  return parseCatCallStatus(raw ?? fallback);
}

/** Normalizuje odpoveď GET judging-orders (camelCase alebo snake_case). */
function parseJudgingOrderApiRow(raw: Record<string, unknown>): JudgingOrderLike {
  const idNum = Number(raw.id);
  const ring1Raw = raw.ring1ProtocolCallStatus ?? raw.ring1_protocol_call_status;
  const ring2Raw = raw.ring2ProtocolCallStatus ?? raw.ring2_protocol_call_status;
  const nomRaw = raw.protocolCallStatus ?? raw.protocol_call_status;

  const pgRaw = raw.protocolGroup;
  let protocolGroup: string | null = null;
  if (typeof pgRaw === 'string' && pgRaw.trim().length > 0) {
    protocolGroup = pgRaw.trim().slice(0, 120);
  }

  const base: JudgingOrderLike = {
    judgeId: Number(raw.judgeId ?? raw.judge_id),
    catId: Number(raw.catId ?? raw.cat_id),
    tableNumber: Number(raw.tableNumber ?? raw.table_number ?? 1),
    protocolGroup,
    orderPosition: Number(raw.orderPosition ?? raw.order_position ?? 0),
    protocolCallStatus: pickProtocol(nomRaw, 'waiting'),
    ring1ProtocolCallStatus: pickProtocol(ring1Raw, 'waiting'),
    ring2ProtocolCallStatus: pickProtocol(ring2Raw, 'waiting'),
  };

  if (Number.isFinite(idNum)) {
    return { ...base, id: idNum };
  }
  return base;
}

/** Riadok s povinným `id` (0 = neplatný). */
type JudgingOrderRowStrict = JudgingOrderLike & { id: number };

export function parseJudgingOrderApiRowStrict(raw: Record<string, unknown>): JudgingOrderRowStrict {
  const b = parseJudgingOrderApiRow(raw)
  const id = Number(b.id)
  return {
    ...b,
    id: Number.isFinite(id) ? id : 0,
  }
}

export function protocolCallForRound(
  row: JudgingOrderLike | undefined,
  round: StewardJudgingRound,
): CatCallStatus | undefined {
  if (!row) return undefined;
  if (round === 'nomination') {
    return row.protocolCallStatus != null ? parseCatCallStatus(row.protocolCallStatus) : undefined;
  }
  if (round === 'ring1') {
    return parseCatCallStatus(row.ring1ProtocolCallStatus ?? 'waiting');
  }
  return parseCatCallStatus(row.ring2ProtocolCallStatus ?? 'waiting');
}

export function judgingOrderRowForJudgeCat(
  orders: JudgingOrderLike[],
  judgeId: number | null,
  catNumericId: number,
): JudgingOrderLike | undefined {
  if (judgeId == null) return undefined;
  return orders.find(
    (o) => Number(o.judgeId) === Number(judgeId) && Number(o.catId) === catNumericId,
  );
}

/** Stav vyvolávania pre sudcu z riadku protokolu pre danú fázu súťaže, inak fallback na cats.status. */
export function effectiveCatCallStatus(
  orders: JudgingOrderLike[],
  judgeId: number | null,
  catNumericId: number,
  catFallback: CatCallStatus,
  judgingRound: StewardJudgingRound,
): CatCallStatus {
  const row = judgingOrderRowForJudgeCat(orders, judgeId, catNumericId);
  const v = protocolCallForRound(row, judgingRound);
  if (v !== undefined) return v;
  return catFallback;
}

export function setOrderProtocolLocal(row: JudgingOrderLike, judgingRound: StewardJudgingRound, s: CatCallStatus) {
  switch (judgingRound) {
    case 'nomination':
      row.protocolCallStatus = s;
      break;
    case 'ring1':
      row.ring1ProtocolCallStatus = s;
      break;
    case 'ring2':
      row.ring2ProtocolCallStatus = s;
      break;
  }
}

/** Zoradenie riadkov protokolu: stôl → názov skupiny (locale) → poradie v skupine. */
export function compareJudgingOrders(a: JudgingOrderLike, b: JudgingOrderLike): number {
  const ta = Number(a.tableNumber ?? 1);
  const tb = Number(b.tableNumber ?? 1);
  if (ta !== tb) return ta - tb;
  const ga = normalizedProtocolGroupKey(a);
  const gb = normalizedProtocolGroupKey(b);
  if (ga !== gb) return ga.localeCompare(gb, 'sk', { numeric: true, sensitivity: 'base' });
  return Number(a.orderPosition ?? 0) - Number(b.orderPosition ?? 0);
}

/** Prepínač skupín protokolu pre jedného rozhodcu (`key` = hodnota do `v-model`, aj prázdny reťazec). */
export function protocolGroupTabsForJudge(
  orders: JudgingOrderLike[],
  judgeId: number | null,
): { key: string; label: string }[] {
  if (judgeId == null) return [];
  const rows = orders.filter((o) => Number(o.judgeId) === Number(judgeId));
  const keys = [...new Set(rows.map((o) => normalizedProtocolGroupKey(o)))].sort((a, b) =>
    a.localeCompare(b, 'sk', { numeric: true, sensitivity: 'base' }),
  );
  return keys.map((key) => ({
    key,
    label: key.length > 0 ? key : 'Bez skupiny',
  }));
}

/**
 * Rovnaké poradie fronty ako u stevarda podľa protokolu (stôl → skupina → poradie),
 * alebo bez protokolu podľa registračného čísla.
 * `protocolGroupKeyFilter`: ak je zadaný (vrátane `''` pre prázdnu skupinu), obmedz výber.
 */
export function catsInStewardCallOrder<T extends CatWithCallStatus & { registrationNumber: string }>(
  cats: T[],
  judgingOrders: JudgingOrderLike[],
  judgeId: number | null,
  protocolGroupKeyFilter?: string | null,
): T[] {
  if (judgeId == null) return [];
  if (judgingOrders.length === 0) {
    return [...cats].sort((a, b) =>
      a.registrationNumber.localeCompare(b.registrationNumber, undefined, { numeric: true }),
    );
  }
  const byNumId = new Map<number, T>();
  const byStrId = new Map<string, T>();
  for (const c of cats) {
    byStrId.set(c.id, c);
    const n = Number(c.id);
    if (!Number.isNaN(n)) byNumId.set(n, c);
  }
  let rows = judgingOrders.filter((o) => Number(o.judgeId) === Number(judgeId));
  if (protocolGroupKeyFilter !== undefined && protocolGroupKeyFilter !== null) {
    const want = normalizedProtocolGroupKey({ protocolGroup: protocolGroupKeyFilter });
    rows = rows.filter((o) => normalizedProtocolGroupKey(o) === want);
  }
  rows = [...rows].sort(compareJudgingOrders);
  const out: T[] = [];
  for (const o of rows) {
    const c = byNumId.get(o.catId) ?? byStrId.get(String(o.catId));
    if (c) out.push(c);
  }
  return out;
}

/** Posunie frontu v poradí stevarda (max. tri PATCHe na jedno kliknutie). */
export async function advanceSelfStewardCallNext<T extends CatWithCallStatus>(
  queue: T[],
  applyStatus: (cat: T, status: CatCallStatus) => Promise<void>,
): Promise<number> {
  let n = 0;
  const judging = queue.find((c) => c.status === 'judging');
  if (judging) {
    await applyStatus(judging, 'completed');
    n++;
  }
  const called = queue.find((c) => c.status === 'called');
  if (called) {
    await applyStatus(called, 'judging');
    n++;
  }
  const waiting = queue.find((c) => c.status === 'waiting');
  if (waiting) {
    await applyStatus(waiting, 'called');
    n++;
  }
  return n;
}
