// Plain HTML recovery remains usable when the app's JavaScript chunks fail.
// Never delete offline coverage first; ask the current worker to stage a safe
// replacement. This preserves IndexedDB/localStorage and the push registration.
export const dynamic = "force-static";

const PAGE = `<!doctype html>
<html lang="es-PY"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Reparar Mi Bebé</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#FCFBF9;color:#322E29;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}main{max-width:24rem;text-align:center}h1{font-size:1.4rem}p{color:#655F56;line-height:1.5}a{display:inline-flex;align-items:center;min-height:44px;color:#2F5D50;font-weight:700}</style></head>
<body><main><h1>Reparando Mi Bebé…</h1><p id="estado" role="status">Estamos preparando la copia sin conexión. Tus registros no se borran.</p><p><a href="/">Abrir Mi Bebé</a></p></main>
<script>
(async function () {
  var estado = document.getElementById("estado");
  function timed(task, ms) {
    var timer;
    return Promise.race([task, new Promise(function (_, reject) { timer=setTimeout(function(){reject(new Error("timeout"));},ms); })]).finally(function(){clearTimeout(timer);});
  }
  try {
    if (!("serviceWorker" in navigator) || !("caches" in window)) throw new Error("unsupported");
    var reg = await timed(navigator.serviceWorker.getRegistration("/"), 15000);
    if (!reg) reg = await timed(navigator.serviceWorker.register("/sw.js"), 30000);
    await timed(reg.update(), 30000);
    var worker = reg.installing || reg.waiting || reg.active;
    if (!worker) throw new Error("missing");
    if (worker.state !== "activated") {
      if (reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"});
      await timed(new Promise(function(resolve,reject){
        function changed(){if(worker.state==="activated"){worker.removeEventListener("statechange",changed);resolve();}else if(worker.state==="redundant"){worker.removeEventListener("statechange",changed);reject(new Error("install"));}}
        worker.addEventListener("statechange",changed);changed();
      }),90000);
    }
    await new Promise(function(resolve,reject){
      var channel=new MessageChannel();
      var timer;
      function reset(){clearTimeout(timer);timer=setTimeout(function(){channel.port1.close();reject(new Error("timeout"));},30000);}
      reset();
      channel.port1.onmessage=function(event){
        var data=event.data||{};
        if(data.type==="MIBEBE_REPAIR_PROGRESS"){reset();estado.textContent="Preparando sin conexión: "+data.done+" de "+data.total+".";}
        else if(data.type==="MIBEBE_REPAIR_COMPLETE"){clearTimeout(timer);channel.port1.close();resolve();}
        else if(data.type==="MIBEBE_REPAIR_FAILED"){clearTimeout(timer);channel.port1.close();reject(new Error("repair"));}
      };
      worker.postMessage({type:"MIBEBE_REPAIR_PRECACHE"},[channel.port2]);
    });
    estado.textContent="Listo. La copia sin conexión está preparada. Abriendo Mi Bebé…";
    location.replace("/");
  } catch (_) {
    estado.textContent="No pudimos completar la reparación. Conservamos la copia anterior y tus registros. Conectate y volvé a intentar, o abrí la app.";
  }
})();
</script></body></html>`;

export function GET(): Response {
  return new Response(PAGE, { headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
  } });
}
