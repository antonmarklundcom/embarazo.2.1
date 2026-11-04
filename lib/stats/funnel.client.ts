import {
  RETURN_AFTER_DAYS,
  channelOf,
  landingFromSearch,
  type Channel,
  type FunnelEvent,
  type InstallKey,
} from "./funnel";
import type { OnboardingStep } from "@/lib/onboarding/progress";

// Growth plan items 16–18, device half. Everything "once per install" is
// decided here, from one localStorage entry the server never sees: the server
// only ever receives bare increments (`lib/stats/funnel.ts`).
//
// Events are queued before they are sent and removed only once the server
// accepted them, so an arrival on a flaky connection is sent on the next open
// instead of being lost — and never twice, because the "already queued" flags
// are set at queue time.

export const FUNNEL_STORAGE_KEY = "mibebe.funnel";

const DAY_MS = 86_400_000;

export interface FunnelState {
  /** The first page load on this device has been classified. */
  landed?: boolean;
  channel?: Channel;
  /** Epoch ms onboarding finished on this device. */
  onboardedAt?: number;
  firstTool?: boolean;
  return7?: boolean;
  /** Night run item 3 — install outcomes already counted on this device. */
  install?: InstallKey[];
  /** Night run item 3 — onboarding steps already counted on this device. */
  steps?: OnboardingStep[];
  pending?: FunnelEvent[];
}

/** The subset of `Storage` this module uses — injectable for tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStore(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Storage blocked (private mode, site data off): nothing is counted.
    return null;
  }
}

export function readState(store: KeyValueStore | null = browserStore()): FunnelState {
  if (!store) return {};
  try {
    const parsed: unknown = JSON.parse(store.getItem(FUNNEL_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as FunnelState) : {};
  } catch {
    return {};
  }
}

function writeState(state: FunnelState, store: KeyValueStore | null): void {
  if (!store) return;
  try {
    store.setItem(FUNNEL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or blocked storage — the count is lost, nothing else is.
  }
}

function update(
  store: KeyValueStore | null,
  change: (state: FunnelState) => FunnelState,
): FunnelState {
  const next = change(readState(store));
  writeState(next, store);
  return next;
}

/**
 * The first page load on this device fixes its channel, and queues the
 * arrival (item 16) and the QR source (item 18) when the URL carries them.
 * Every later load is a no-op, which is what makes both "once per install".
 */
export function captureLanding(search: string, store = browserStore()): FunnelState {
  return update(store, (state) => {
    if (state.landed) return state;
    const landing = landingFromSearch(search);
    const pending = [...(state.pending ?? [])];
    if (landing.medium) pending.push({ metric: "arrival", key: landing.medium });
    if (landing.src) pending.push({ metric: "qr", key: landing.src });
    if (landing.share) pending.push({ metric: "shared", key: landing.share });
    return { ...state, landed: true, channel: channelOf(landing), pending };
  });
}

/** Item 17 — onboarding finished. Once per device. */
export function markOnboarded(now = Date.now(), store = browserStore()): FunnelState {
  return update(store, (state) => {
    if (state.onboardedAt !== undefined) return state;
    return {
      ...state,
      onboardedAt: now,
      pending: [
        ...(state.pending ?? []),
        { metric: "onboarded", key: state.channel ?? "directo" },
      ],
    };
  });
}

/** A tool screen, not the toolbox index: `/herramientas/<slug>`. */
export function isToolPath(pathname: string): boolean {
  return /^\/herramientas\/[a-z0-9-]+/.test(pathname);
}

/**
 * Item 17 — the first tool opened after onboarding. Devices that onboarded
 * before this counter existed have no `onboardedAt` and are never counted,
 * which keeps the numbers a clean cohort rather than a mix.
 */
export function noteToolOpened(pathname: string, store = browserStore()): FunnelState {
  return update(store, (state) => {
    if (state.onboardedAt === undefined || state.firstTool || !isToolPath(pathname)) return state;
    return {
      ...state,
      firstTool: true,
      pending: [...(state.pending ?? []), { metric: "first_tool", key: "total" }],
    };
  });
}

/** Item 17 — opened again `RETURN_AFTER_DAYS`+ days after onboarding. */
export function noteOpen(now = Date.now(), store = browserStore()): FunnelState {
  return update(store, (state) => {
    if (state.onboardedAt === undefined || state.return7) return state;
    if (now - state.onboardedAt < RETURN_AFTER_DAYS * DAY_MS) return state;
    return {
      ...state,
      return7: true,
      pending: [...(state.pending ?? []), { metric: "return7", key: "total" }],
    };
  });
}

/**
 * Night run item 3 — an install outcome, at most once per device. Unlike the
 * cohort counters above this does not wait for `onboardedAt`: a visitor on a
 * public week page can install without ever onboarding.
 */
export function noteInstall(key: InstallKey, store = browserStore()): FunnelState {
  return update(store, (state) => {
    if (state.install?.includes(key)) return state;
    return {
      ...state,
      install: [...(state.install ?? []), key],
      pending: [...(state.pending ?? []), { metric: "install", key }],
    };
  });
}

/**
 * Night run item 3 — an onboarding step was shown, at most once per step per
 * device. A device that finished onboarding before this counter existed never
 * shows a step again, so it is never counted.
 */
export function noteOnboardingStep(step: OnboardingStep, store = browserStore()): FunnelState {
  return update(store, (state) => {
    if (state.onboardedAt !== undefined || state.steps?.includes(step)) return state;
    return {
      ...state,
      steps: [...(state.steps ?? []), step],
      pending: [...(state.pending ?? []), { metric: "onb_step", key: step }],
    };
  });
}

// One flush at a time per tab: onboarding's `onDone` and the shell's beacon can
// both ask within the same tick, and two flushes reading the same queue would
// send the same event twice. The second waits and then sees what is left.
let running: Promise<void> = Promise.resolve();

/**
 * Send what is queued; keep what the server did not accept. A 400 is dropped
 * rather than retried forever — the body will not become valid by waiting.
 */
export function flush(
  send: (event: FunnelEvent) => Promise<number> = postEvent,
  store = browserStore(),
): Promise<void> {
  const next = running.then(() => flushOnce(send, store));
  running = next.catch(() => {});
  return next;
}

async function flushOnce(
  send: (event: FunnelEvent) => Promise<number>,
  store: KeyValueStore | null,
): Promise<void> {
  const queued = readState(store).pending ?? [];
  if (queued.length === 0) return;
  const failed: FunnelEvent[] = [];
  for (const event of queued) {
    let status = 0;
    try {
      status = await send(event);
    } catch {
      status = 0;
    }
    if (status !== 204 && status !== 400) failed.push(event);
  }
  // Re-read: another tab may have queued something while this one was sending.
  update(store, (state) => {
    const sent = queued.filter((e) => !failed.includes(e));
    const rest = (state.pending ?? []).filter(
      (e) => !sent.some((s) => s.metric === e.metric && s.key === e.key),
    );
    return { ...state, pending: rest };
  });
}

async function postEvent(event: FunnelEvent): Promise<number> {
  const res = await fetch("/api/v1/stats/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  });
  return res.status;
}
