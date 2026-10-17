// /reparar — the way out when the installed app stops loading.
//
// A plain HTML response (no React, no app chunks), so it works even when the
// cached pages name JavaScript files a newer deploy deleted. It empties the
// service worker's Cache Storage and asks the browser for the newest worker,
// then opens Mi Bebé again. It does NOT unregister the worker (that would end
// the notification subscription) and never touches IndexedDB or localStorage,
// where her records and account link live.

export const dynamic = "force-static";

const PAGE = `<!doctype html>
<html lang="es-PY">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Reparar Mi Bebé</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#FCFBF9;color:#322E29;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
main{max-width:22rem;text-align:center}
h1{font-size:1.4rem;margin:0 0 .5rem}
p{color:#655F56;line-height:1.5}
a{color:#2F5D50;font-weight:700}
</style>
</head>
<body>
<main>
<h1>Reparando Mi Bebé…</h1>
<p id="estado" role="status">Estamos actualizando la app en este teléfono. Tus registros no se borran.</p>
<p><a href="/">Abrir Mi Bebé</a></p>
</main>
<script>
(async function () {
  var estado = document.getElementById("estado");
  try {
    if ("caches" in window) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (key) { return caches.delete(key); }));
    }
    if ("serviceWorker" in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function (reg) { return reg.update().catch(function () {}); }));
    }
    estado.textContent = "Listo. Abriendo Mi Bebé…";
  } catch (error) {
    estado.textContent = "No pudimos limpiar todo. Igual vamos a abrir la app.";
  }
  setTimeout(function () { location.replace("/"); }, 800);
})();
</script>
</body>
</html>`;

export function GET(): Response {
  return new Response(PAGE, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
