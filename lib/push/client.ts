"use client";

import { db, notDeleted } from "@/lib/db";
import {
  DEFAULT_CATEGORIES,
  normaliseCategories,
  type PushCategory,
} from "./categories";

// BUILD-PLAN B5 — the device half.
//
// Two rules from the task, both enforced here rather than by convention:
//
//   * **Permission is requested only from the settings toggle.** Nothing in
//     this module runs on page load, and `Notification.requestPermission()`
//     appears exactly once, inside `enablePush()`. A pregnancy app that asks
//     for notifications before the user has looked at it gets denied once and
//     forever — the permission prompt is not re-showable.
//   * **Declining degrades gracefully.** Every function returns a status; none
//     throws at a caller, and a refused permission leaves the app identical.

const LOCAL_KEY = "mibebe.push.categories";

export type PushStatus =
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "off"
  | "on";

export interface PushState {
  status: PushStatus;
  categories: PushCategory[];
  /** True on iOS Safari outside an installed PWA, where push cannot work. */
  needsInstall: boolean;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * iOS supports Web Push only from an installed PWA (iOS 16.4+). Detecting it
 * lets the settings screen say so plainly instead of showing a toggle that
 * silently fails — the task asks for honest copy about exactly this.
 */
export function isIosWithoutInstall(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && "ontouchend" in document);
  if (!isIos) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return !standalone;
}

function readLocalCategories(): PushCategory[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    return normaliseCategories(JSON.parse(raw) as string[]);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function writeLocalCategories(categories: PushCategory[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(categories));
  } catch {
    // Private browsing. The server copy is still authoritative for sending.
  }
}

async function existingSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function serverPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/push");
    if (!res.ok) return null;
    const body = (await res.json()) as { publicKey?: string };
    return body.publicKey ?? null;
  } catch {
    return null;
  }
}

export async function readPushState(): Promise<PushState> {
  const categories = supported() ? readLocalCategories() : DEFAULT_CATEGORIES;
  const needsInstall = isIosWithoutInstall();

  if (!supported()) return { status: "unsupported", categories, needsInstall };
  if ((await serverPublicKey()) === null) {
    return { status: "unconfigured", categories, needsInstall };
  }
  if (Notification.permission === "denied") {
    return { status: "denied", categories, needsInstall };
  }

  const subscription = await existingSubscription();
  return {
    status: subscription ? "on" : "off",
    categories,
    needsInstall,
  };
}

/**
 * base64url VAPID key → the bytes the PushManager wants.
 *
 * Typed as `ArrayBuffer` rather than `Uint8Array` because TS 5.7's
 * `BufferSource` no longer accepts a `Uint8Array<ArrayBufferLike>` — the same
 * stricter typing `lib/crypto.ts` works around.
 */
function urlBase64ToBytes(base64: string): ArrayBuffer {
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/**
 * The one place that asks for permission.
 *
 * Called only from the settings toggle. Returns a status rather than throwing:
 * "the user said no" is an ordinary outcome, not an error.
 */
export async function enablePush(
  categories: PushCategory[] = readLocalCategories(),
  companionAppointmentAt: number | null = null,
): Promise<PushStatus> {
  if (!supported()) return "unsupported";

  const publicKey = await serverPublicKey();
  if (!publicKey) return "unconfigured";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      // Required by every browser: a push that shows nothing is not allowed.
      // Ours always shows something — the SW composes it locally.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(publicKey),
    }));

  writeLocalCategories(categories);
  await syncSubscription(subscription, categories, companionAppointmentAt);
  return "on";
}

export async function disablePush(): Promise<PushStatus> {
  const subscription = await existingSubscription();
  if (!subscription) return "off";

  try {
    await fetch("/api/v1/push", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch {
    // Unsubscribing locally still stops notifications reaching this device;
    // the server drops the endpoint when the push service reports it gone.
  }
  await subscription.unsubscribe();
  return "off";
}

export async function setCategories(
  categories: PushCategory[],
  companionAppointmentAt: number | null = null,
): Promise<void> {
  writeLocalCategories(categories);
  const subscription = await existingSubscription();
  if (subscription) {
    await syncSubscription(subscription, categories, companionAppointmentAt);
  }
}

/**
 * K8 — turn the "acompañala al control" reminder on or off for this device.
 *
 * The flag goes to Dexie (the service worker reads it; it cannot read
 * localStorage) and the schedule is re-sent immediately, because the server
 * stores a list of fire times and replaces it wholesale on every publish.
 */
export async function setCompanionReminder(
  enabled: boolean,
  companionAppointmentAt: number | null,
): Promise<void> {
  try {
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (first?.id) {
      await db().profile.update(first.id, { companionReminder: enabled });
    }
  } catch {
    // No profile yet, or storage refused. The toggle simply does not stick.
  }
  await refreshReminders(companionAppointmentAt);
}

/**
 * Send the subscription, its opt-ins, and the times to poke it.
 *
 * The reminder times are computed HERE, from local data, because the server
 * cannot read an appointment (§4.3). It receives a list of epoch milliseconds
 * and nothing that says what they are for.
 */
async function syncSubscription(
  subscription: PushSubscription,
  categories: PushCategory[],
  companionAppointmentAt: number | null = null,
): Promise<void> {
  const json = subscription.toJSON();
  const reminders = categories.includes("recordatorios")
    ? await computeReminderTimes(Date.now(), companionAppointmentAt)
    : [];

  try {
    await fetch("/api/v1/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        categories,
        reminders,
      }),
    });
  } catch {
    // Offline. The next settings visit or the next appointment change
    // re-sends; nothing about the app breaks in the meantime.
  }
}

/** How long before an appointment to poke. */
export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

/**
 * When this device wants to be poked: the day before each upcoming prenatal
 * control. Exported for `refreshReminders`, which settings and the appointment
 * editor call after a change.
 */
export async function computeReminderTimes(
  now: number = Date.now(),
  companionAppointmentAt: number | null = null,
): Promise<number[]> {
  try {
    const profiles = notDeleted(await db().profile.toArray());
    const profile = profiles[0];

    const wanted: number[] = [];
    if (typeof profile?.nextAppointment === "number") {
      wanted.push(profile.nextAppointment);
    }
    // K8. The control of the pregnancy this device is accompanying. It comes
    // in as an argument rather than out of Dexie because it is somebody else's
    // appointment and is deliberately never stored here (K2: no cached copy of
    // a companion view, so that revocation cuts everything instantly). The
    // caller has it in memory from the shared-views fetch.
    if (profile?.companionReminder && typeof companionAppointmentAt === "number") {
      wanted.push(companionAppointmentAt);
    }

    return dedupe(
      wanted
        .map((appointment) => appointment - REMINDER_LEAD_MS)
        .filter((fireAt) => fireAt > now),
    );
  } catch {
    return [];
  }
}

/**
 * Two people, one control: the mamá tracking it herself and accompanying
 * somebody whose control is the same minute would otherwise schedule the same
 * poke twice, and B5's fallback would then fire a second, redundant
 * notification.
 */
function dedupe(times: number[]): number[] {
  return [...new Set(times)].sort((a, b) => a - b);
}

/**
 * Re-send the schedule after an appointment changed. Safe to call always.
 *
 * `companionAppointmentAt` is the control of the pregnancy this device
 * accompanies, when the caller happens to have it. Omitting it means "I do not
 * know", and the companion poke is simply not scheduled this round — never
 * "there is no appointment", which would silently cancel a reminder from a
 * screen that has no business deciding that.
 */
export async function refreshReminders(
  companionAppointmentAt: number | null = null,
): Promise<void> {
  const subscription = await existingSubscription();
  if (!subscription) return;
  await syncSubscription(
    subscription,
    readLocalCategories(),
    companionAppointmentAt,
  );
}
