import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The state-of-the-service strip at the top of /admin, rendered for real with
// no database configured. The admin guard itself (`requireAdmin`) is covered
// by lib/server/admin.test.ts and the layout; here it is stubbed to "is admin".

const requireAdmin = vi.fn(async () => ({ id: "admin", email: "admin@example.test" }));

vi.mock("@/lib/server/admin", () => ({
  adminDb: () => null,
  findUserByEmail: async () => [],
  recentAudit: async () => [],
  requireAdmin: () => requireAdmin(),
}));

beforeEach(() => {
  requireAdmin.mockClear();
});

async function render(): Promise<string> {
  const { default: AdminHomePage } = await import("./page");
  const tree = await AdminHomePage({ searchParams: Promise.resolve({}) });
  return renderToStaticMarkup(tree);
}

describe("/admin home summary without a database", () => {
  it("stays behind the admin guard", async () => {
    await render();
    expect(requireAdmin).toHaveBeenCalledOnce();
  });

  it("says 'sin base de datos' instead of crashing, and still shows revision and flags", async () => {
    const html = await render();
    expect(html).toContain("Estado ahora");
    expect(html).toContain("Versión publicada");
    expect(html).toContain("Último aviso enviado");
    expect(html).toContain("Avisos atrasados");
    expect(html.match(/sin base de datos/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Sin base de datos: las funciones están en su valor por defecto.");
    for (const key of ["ai_baby_paused", "recomendados", "guarani", "nombres_link"]) {
      expect(html).toContain(key);
    }
    expect(html).toContain("Apagada");
  });

  it("keeps the account search and the audit list", async () => {
    const html = await render();
    expect(html).toContain("Buscar una cuenta");
    expect(html).toContain("Últimas acciones del panel");
  });
});
