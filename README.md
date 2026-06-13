# Nido 🪺

Una PWA de embarazo, gratuita e instalable, hecha para Paraguay. Privada por
diseño: los datos de salud quedan en el teléfono.

Nido no es una app global traducida: el contenido, la logística (carné
perinatal, IPS vs. sanatorio privado, trámites del Registro Civil, vacunas PAI,
derechos laborales) y el directorio están pensados para cómo funciona el
embarazo acá. Funciona offline, con poca data, y se instala desde un link.

---

## Desarrollo local

Requisitos: Node.js 22.x LTS.

```bash
npm install
cp .env.example .env        # completá los valores mínimos (ver abajo)
npm run dev                 # http://localhost:3000
```

Otros comandos:

```bash
npm run build               # build de producción (verifica tipos + genera el SW)
npm start                   # sirve el build de producción
npm test                    # tests (pregnancy math + whitelist de la API)
node scripts/gen-icons.mjs  # regenera los iconos PWA en public/icons/
```

> El service worker (Serwist) está **desactivado en desarrollo**. Para probar el
> comportamiento offline / instalable, usá `npm run build && npm start`.

## Variables de entorno (`.env`)

```ini
# --- MÍNIMO VIABLE (lanzar con esto) ---
NEXT_PUBLIC_APP_URL=                 # URL pública, ej. https://app.tudominio.com.py
NEXT_PUBLIC_BUSINESS_WHATSAPP=       # +595... contacto de respaldo
NEXT_PUBLIC_MEDICAL_REVIEWER=        # ej. "Dra. ___, gineco-obstetra"

# --- OPCIONALES (la app funciona sin esto) ---
SHEETS_WEBHOOK_URL=                  # atribución de clics opcional; sin valor = redirección directa
WP_API_URL=                          # fuente de contenido futura; sin valor = seed del repo
```

`SHEETS_WEBHOOK_URL` y `WP_API_URL` son **opcionales**: la app corre por
completo sin ellas, usando los datos seed del repositorio.

## Cómo editar el contenido

Todo el contenido vive tipado dentro de `lib/` — no hay base de datos ni CMS:

| Qué | Archivo | Forma |
| --- | --- | --- |
| Semanas 1–42 | `lib/weeks.ts` | `{ week, trimester (derivado), sizeComparison, lengthCm?, weightG?, milestone, tip }` |
| Departamentos | `lib/departments.ts` | `{ slug, name }` |
| Guías (8 artículos) | `lib/seed/articles.ts` | `{ slug, title, excerpt, html, date, author, reviewedBy?, cluster? }` |
| Directorio | `lib/seed/directory.json` | `DirectoryListing` (ver `lib/types.ts`) |
| Patrocinios | `lib/seed/placements.json` | `AdPlacement` (ver `lib/types.ts`) |
| Checklists | `lib/checklists.ts` | grupos de `{ key, label }` |

> El directorio y los patrocinios incluidos son **placeholders** (nombres
> inventados, números `+595` de ejemplo). Reemplazalos por listados reales y
> consentidos antes de lanzar.

`lib/wordpress.ts` es un hook opcional a futuro: si se define `WP_API_URL`,
podría leer una API REST de WordPress; mientras tanto devuelve el seed.

## Qué funciona offline

Precargado para uso sin conexión:

- El shell de la app (navegación, header).
- Las **42 páginas** de semana (`/semana/1` … `/semana/42`).
- Las **8 guías**.
- Las cuatro herramientas (**Pataditas, Contracciones, Peso, Checklist**)
  funcionan 100% offline: los datos son locales (IndexedDB).

Con estrategia *network-first* + caché de respaldo:

- `/api/v1/placements` y `/api/v1/directory` (si hay red, traen lo último; si
  no, usan lo cacheado).

**No** disponible offline: la primera carga del directorio/patrocinios si nunca
se cargaron antes con conexión.

## Privacidad (un pilar del producto)

- Sin cuenta, sin correo, sin teléfono.
- Los datos de salud **nunca salen del dispositivo** (IndexedDB).
- Lo único que viaja al servidor es el **trimestre** (1|2|3) derivado y el
  **departamento** guardado, para mostrar recursos cercanos. La API rechaza con
  `400` cualquier otro parámetro.
- Sin cookies de seguimiento, sin SDK de analítica.
- PIN opcional que cifra las notas del diario con WebCrypto (PBKDF2 + AES-GCM).
  Es cifrado del navegador, no de grado bancario: depende también de la
  seguridad del teléfono.
- "Borrar todos mis datos" (en Ajustes) elimina toda la base local y el PIN.

## Despliegue (Hostinger — Node.js Web App)

1. hPanel → **Websites → Add Website → Node.js Apps → Import Git Repository**.
2. Branch `main`, preset **Next.js** (autodetectado), root `./`.
3. Node version: **LTS actual (22.x)**, no el mayor más nuevo.
4. Agregá las variables de entorno en el panel (nunca commitees secretos).
5. **Deploy** y luego atá el dominio (se recomienda un subdominio, ej.
   `app.tudominio.com.py`).
6. Build/start estándar (`npm run build` / `npm start`).

CI en cada push: `npm ci && npm run build` (ver `.github/workflows/ci.yml`).

> El filesystem del host es **efímero**: ninguna ruta del código escribe
> archivos persistentes en el servidor.

## Aviso médico

Nido es una herramienta **informativa** y de acompañamiento. No reemplaza la
atención de un profesional de la salud y no realiza diagnósticos. Ante cualquier
duda o síntoma, contactá a tu sanatorio.
