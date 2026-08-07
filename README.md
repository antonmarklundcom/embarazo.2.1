# Nido 🪺

Una PWA de embarazo, gratuita e instalable, hecha para Paraguay. Privada por
diseño: los datos de salud quedan en el teléfono.

Nido no es una app global traducida: el contenido, la logística (carné
perinatal, IPS vs. sanatorio privado, trámites del Registro Civil, vacunas PAI,
derechos laborales) y el directorio están pensados para cómo funciona el
embarazo acá. Funciona offline, con poca data, y se instala desde un link.

Tiene dos modos (elegibles en el onboarding y cambiables desde **Ajustes** sin
perder datos):

- **Estoy embarazada** — seguimiento semana a semana (la semana grande es la
  amigable, "Semana 18", con la convención médica de semanas completas debajo,
  "17 semanas y 2 días"), herramientas y el resumen para el control prenatal.
- **Estoy planeando / buscando** — calendario menstrual, días fértiles
  estimados (es una estimación, **no** un método anticonceptivo) y checklist
  preconcepción.

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

# --- CUENTAS (opcional; sin esto la app corre en modo local) ---
DATABASE_URL=                        # mysql://... ; sin valor = solo dispositivo
AUTH_SECRET=                         # openssl rand -base64 32
AUTH_URL=                            # https://... (solo producción)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_FACEBOOK_ENABLED=false          # requiere verificación de negocio en Meta
AUTH_FACEBOOK_ID=
AUTH_FACEBOOK_SECRET=

# --- OPCIONALES (la app funciona sin esto) ---
SHEETS_WEBHOOK_URL=                  # atribución de clics opcional; sin valor = redirección directa
WP_API_URL=                          # fuente de contenido futura; sin valor = seed del repo
```

`SHEETS_WEBHOOK_URL` y `WP_API_URL` son **opcionales**: la app corre por
completo sin ellas, usando los datos seed del repositorio.

Las variables de cuentas también son opcionales. Con `AUTH_SECRET`,
`AUTH_GOOGLE_*` o `DATABASE_URL` sin valor, la app corre completa en modo
**"seguir sin cuenta"**: `/cuenta` explica que el ingreso no está activo,
`/ajustes` muestra el bloque de cuenta en su estado local, y
`/api/auth/*` responde 404 en lugar de fallar
(ARCHITECTURE.md §4.2). Es la configuración con la que corre CI.

### Configurar el cliente OAuth de Google

En Google Cloud Console → *APIs & Services* → *Credentials* → *OAuth client
ID* (tipo **Web application**):

- **Authorized JavaScript origins**: `https://tu-dominio.com.py`
  (y `http://localhost:3000` para desarrollo).
- **Authorized redirect URIs**:
  `https://tu-dominio.com.py/api/auth/callback/google`
  (y `http://localhost:3000/api/auth/callback/google`).

Los alcances son los que Auth.js pide por defecto — `openid`, `email`,
`profile` — y no se amplían nunca: de Google solo se guardan nombre, correo
y foto de perfil (ARCHITECTURE.md §4.7).

**Facebook** queda detrás de `AUTH_FACEBOOK_ENABLED`. Mientras esté en
`false` o sin valor, el proveedor no existe: no aparece en `/cuenta`, no se
registra en Auth.js y no bloquea nada. Meta exige verificación de negocio y
revisión de la app —que tarda semanas y necesita la política de privacidad
publicada— antes de poder activarlo.

## Cómo editar el contenido

Todo el contenido vive tipado dentro de `lib/` — no hay base de datos ni CMS:

| Qué | Archivo | Forma |
| --- | --- | --- |
| Semanas 1–42 | `lib/weeks.ts` | `{ week, trimester (derivado), sizeComparison, lengthCm?, weightG?, milestone, tip }` |
| Tips diarios | `lib/dailyTips.ts` | `{ id, text, trimester }` (trimester 0 = todos) |
| Departamentos | `lib/departments.ts` | `{ slug, name }` |
| Guías (8 artículos) | `lib/seed/articles.ts` | `{ slug, title, excerpt, html, date, author, reviewedBy?, cluster? }` |
| Directorio ("Cerca tuyo") | `lib/seed/directory.json` | `DirectoryListing` (ver `lib/types.ts`) |
| Categorías del directorio | `lib/directoryCategories.ts` | etiquetas es-PY por categoría |
| Eventos | `lib/seed/events.ts` | `EventItem` (ver `lib/types.ts`) |
| Patrocinios | `lib/seed/placements.json` | `AdPlacement` (ver `lib/types.ts`) |
| Checklists | `lib/checklists.ts` | grupos de `{ key, label }` |
| Checklist preconcepción | `lib/preconception.ts` | `{ key, label, detail, source }` |
| Videos | `lib/seed/videos.ts` | `VideoItem` (ver `lib/types.ts`) |

> El directorio, los eventos, los patrocinios y los **videos** incluidos son
> **placeholders** (nombres inventados, números `+595` de ejemplo, IDs de
> YouTube de ejemplo). Reemplazalos por listados reales y consentidos antes de
> lanzar. Los videos se embeben vía `youtube-nocookie.com` (privacidad mejorada);
> editá `lib/seed/videos.ts` para cambiar título, tema, trimestre y `youtubeId`.
>
> El directorio admite estas categorías: `sanatorio`, `obstetra`, `ecografia`,
> `cordon`, `pediatra`, `lactancia`, `vacunatorio`, `tienda_bebe`, `farmacia`.
> Los eventos usan `type`: `charla`, `taller`, `feria`, `clase`, `encuentro`.
> Las fechas de los eventos seed se calculan relativas a "hoy" para mantener una
> mezcla realista de próximos y pasados; para datos reales usá timestamps fijos.

`lib/wordpress.ts` es un hook opcional a futuro: si se define `WP_API_URL`,
podría leer una API REST de WordPress; mientras tanto devuelve el seed.

## Qué funciona offline

Precargado para uso sin conexión:

- El shell de la app (navegación, header).
- Las **42 páginas** de semana (`/semana/1` … `/semana/42`).
- Las **8 guías**.
- El **tip de hoy** y los **eventos** (datos seed en el repo).
- **Tus derechos y beneficios** (`/derechos`): navegador de derechos (Ley
  5508, Ley 7383/2024, IPS, gratuidad, Tekoporã) con las fechas de licencia
  calculadas localmente.
- **Emergencia** (`/emergencia`, botón SOS del header): 141/911 con un toque,
  señales de alarma (castellano + guaraní) y tus contactos guardados.
- Las herramientas (**Síntomas y ánimo, Diario de fotos, Carné perinatal,
  Pataditas, Contracciones, Peso, Checklist**) funcionan 100% offline: los
  datos son locales (IndexedDB).

Con estrategia *network-first* + caché de respaldo:

- `/api/v1/placements` y `/api/v1/directory` (si hay red, traen lo último; si
  no, usan lo cacheado).

**No** disponible offline: la primera carga del directorio/patrocinios si nunca
se cargaron antes con conexión.

## Qué se guarda en el dispositivo

Todo lo personal vive solo en IndexedDB (Dexie) y **nunca se transmite**:

- Perfil (departamento, ciudad, **modo de uso**: embarazada o planeando) y datos
  del embarazo (última regla, fecha probable de parto). La fecha es editable
  desde **Ajustes**.
- **Fecha del próximo control prenatal** (recordatorio in-app, sin push).
- **Registros de síntomas y ánimo** (diario), con nota opcional cifrada si hay
  PIN.
- **Fotos de la panza** (Blob redimensionado a ~1280px, nunca subido).
- **Copia del carné perinatal** (fotos de las páginas) y **datos clave**
  (grupo sanguíneo, alergias, notas).
- **Contactos de emergencia** (sanatorio y persona de confianza).
- Pataditas, contracciones, peso y checklists.
- **Calendario menstrual** (modo planeando): reglas registradas y promedios de
  ciclo (`cycles` + `cycleSettings`).

El **Resumen para mi control prenatal** (`herramientas/resumen`) solo organiza
estos datos locales en una hoja imprimible; no interpreta nada ni los transmite,
y se comparte únicamente cuando la persona lo imprime o lo muestra.

"Borrar todos mis datos" (en Ajustes) elimina toda la base local y el PIN.

## Privacidad (un pilar del producto)

- Sin cuenta, sin correo, sin teléfono.
- Los datos de salud **nunca salen del dispositivo** (IndexedDB): incluye los
  registros de síntomas y ánimo, las fotos de la panza, el calendario menstrual
  y la fecha del próximo control.
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
