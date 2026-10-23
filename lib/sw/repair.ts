/** Rebuild public offline entries before clearing any runtime responses. */
export async function repairPrecache(options: {
  storage: CacheStorage;
  cacheName: string;
  entries: ReadonlyMap<string, string>;
  pages: ReadonlySet<string>;
  fetcher: typeof fetch;
  integrityForKey?: (key: string) => string | undefined;
  progress?: (done: number, total: number) => void;
  resourceTimeoutMs?: number;
}): Promise<void> {
  const { storage, cacheName, entries, pages, fetcher } = options;
  const current = await storage.open(cacheName);
  const temporaryName = cacheName + "-repair-" + crypto.randomUUID();
  const staged = await storage.open(temporaryName);
  const expectedAssets = new Set([...entries.keys()].map(url => new URL(url).pathname));
  const pending: string[] = [];
  try {
    let done = 0;
    for (const [url, key] of entries) {
      const isPage = pages.has(new URL(url).pathname);
      // Content-addressed existing assets remain valid. Refresh documents and
      // fill missing assets, but retain the complete original until all succeed.
      if (!isPage && await current.match(key)) {
        options.progress?.(++done, entries.size);
        continue;
      }
      const controller = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          (async () => {
            const response = await fetcher(url, {
              cache: "reload", credentials: "same-origin", signal: controller.signal,
              integrity: options.integrityForKey?.(key),
            });
            if (!response.ok || response.type === "opaque") throw new Error("No pudimos descargar la copia sin conexión.");
            if (isPage) {
              if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("La página no está disponible.");
              const html = await response.clone().text();
              for (const match of html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g)) {
                if (!expectedAssets.has(new URL(match[1]!.replaceAll("&amp;", "&"), url).pathname)) {
                  throw new Error("La app cambió durante la reparación. Probá de nuevo.");
                }
              }
            }
            await staged.put(key, response);
          })(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              controller.abort();
              reject(new Error("La descarga tardó demasiado. Conservamos la copia anterior."));
            }, options.resourceTimeoutMs ?? 20_000);
          }),
        ]);
      } finally { clearTimeout(timeout); }
      pending.push(key);
      options.progress?.(++done, entries.size);
    }
    // No old key is deleted: a failed download or quota error keeps the previous
    // complete offline copy. Commit only after every replacement was staged.
    for (const key of pending) {
      const response = await staged.match(key);
      if (!response) throw new Error("No pudimos preparar la copia sin conexión.");
      await current.put(key, response);
    }
    // These contain replaceable navigation/API responses, never the public
    // precache, notification consent, local records or push subscription.
    await Promise.all(["apis", "pages", "pages-rsc", "pages-rsc-prefetch", "next-data", "cross-origin"]
      .map(name => storage.delete(name)));
  } finally {
    await storage.delete(temporaryName).catch(() => false);
  }
}
