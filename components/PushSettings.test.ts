import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, effect: undefined as (() => void) | undefined }));
const client = vi.hoisted(() => ({ read: vi.fn(), enable: vi.fn(), disable: vi.fn(), test: vi.fn(), categories: vi.fn() }));
vi.mock("react", () => ({
  useState(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (next: unknown) => { hooks.values[index] = next; }];
  },
  useEffect(effect: () => void) { hooks.effect ??= effect; },
}));
vi.mock("@/lib/push/client", () => ({
  readPushState: client.read, enablePush: client.enable, disablePush: client.disable,
  sendTestNotification: client.test, setCategories: client.categories, pushResyncPending: () => false,
}));
import { PushSettings } from "./PushSettings";

type Element = { type: unknown; props: { children?: unknown; disabled?: boolean; onClick?: () => Promise<void> } };
function descendants(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...descendants(element.props.children)];
}
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node && typeof node === "object" && "props" in node) return text((node as Element).props.children);
  return typeof node === "string" ? node : "";
}
const render = () => { hooks.cursor = 0; return PushSettings({}); };
const button = (label: string) => descendants(render()).find((element) => element.type === "button" && text(element.props.children).includes(label))!;

describe("push settings recover their controls after browser rejection", () => {
  beforeEach(() => {
    hooks.values = []; hooks.cursor = 0; hooks.effect = undefined; vi.clearAllMocks();
    client.read.mockResolvedValue({ status: "off", categories: ["consejos"], needsInstall: false });
    client.enable.mockRejectedValue(new DOMException("synthetic refusal", "AbortError"));
    client.disable.mockRejectedValue(new Error("synthetic refusal"));
    client.test.mockRejectedValue(new Error("synthetic refusal"));
    vi.stubGlobal("window", { location: { search: "" } });
  });
  afterEach(() => vi.unstubAllGlobals());
  async function mount() { render(); hooks.effect!(); await Promise.resolve(); await Promise.resolve(); }

  it("always clears busy and preparation after an enable failure", async () => {
    await mount();
    const action = button("Activar avisos").props.onClick!();
    expect(button("Un momento").props.disabled).toBe(true);
    await action;
    expect(button("Activar avisos").props.disabled).toBe(false);
    expect(text(render())).toContain("Probá de nuevo");
    expect(text(render())).not.toContain("Preparando los avisos");
    expect(hooks.values[0]).toMatchObject({ categories: ["consejos"] });
  });

  it("shows usable retry controls when the passive read rejects", async () => {
    client.read.mockRejectedValueOnce(new Error("synthetic read failure"));
    await mount();
    expect(button("Activar avisos").props.disabled).toBe(false);
    expect(text(render())).toContain("Probá de nuevo");
  });

  it("restores the disable control after rejection without claiming success", async () => {
    client.read.mockResolvedValueOnce({ status: "on", categories: ["consejos"], needsInstall: false });
    await mount();
    await button("Desactivar avisos").props.onClick!();
    expect(button("Desactivar avisos").props.disabled).toBe(false);
    expect(text(render())).toContain("Probá de nuevo");
  });
});
