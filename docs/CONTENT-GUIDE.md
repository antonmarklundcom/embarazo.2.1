# Guía de contenido — cómo agregar contenido a Mi Bebé

Todo el contenido editable vive en `content/*.json`. No hace falta tocar código.
Después de editar, corré:

```bash
npm run validate:content
```

Si algo está mal, te dice **qué archivo, qué entrada y qué campo**, en
castellano. Lo mismo corre en CI, así que un error de contenido rompe el build
en vez de llegar a una usuaria.

> Para generar el contenido con un modelo de lenguaje (Gemini u otro), usá los
> prompts listos en **`docs/GEMINI-PROMPTS.md`** — ya piden exactamente este
> formato.

---

## Reglas que valen para todo

- **Castellano paraguayo con voseo**: *tomá, registrá, acercate, tenés*. Nunca
  *toma / registra / tienes*.
- **Nada de texto de relleno.** Las palabras `placeholder`, `TBD`, `xxx` y
  `lorem ipsum` hacen fallar la validación en cualquier campo.
- **Teléfonos**: formato `+595` + 9 dígitos, sin espacios ni guiones
  (`+595981234567`). El rango inventado `+595 981 000 0xx` está bloqueado.
- **Fechas**: `AAAA-MM-DD`. Se verifica que la fecha exista de verdad.
- **`slug` / `id`**: minúsculas, números y guiones (`dengue-en-el-embarazo`).
  No se pueden repetir dentro del mismo archivo.
- **Nada de inventar.** Si no sabés un dato (un teléfono, una dirección, si un
  alimento es seguro), dejá la entrada afuera. Una entrada inventada en una app
  de salud es peor que una entrada faltante.

---

## `content/articles.json` — las guías

```json
{
  "articles": [
    {
      "slug": "anemia-y-hierro-en-el-embarazo",
      "title": "Anemia y hierro en el embarazo",
      "excerpt": "Por qué es tan común en Paraguay y qué podés hacer.",
      "date": "2026-08-01",
      "author": "Mi Bebé",
      "reviewedBy": null,
      "cluster": "salud",
      "week": 20,
      "html": "<p>…</p><h2>…</h2><ul><li>…</li></ul>"
    }
  ]
}
```

| Campo | Qué va |
|---|---|
| `cluster` | `salud`, `logistica`, `tramites`, `derechos`, `alimentacion`, `parto`, `postparto`, `bienestar` |
| `week` | *(opcional)* semana 1–42 a la que corresponde, para el feed semanal |
| `reviewedBy` | El nombre real de quien lo revisó, o **`null`** si todavía nadie lo revisó |
| `html` | 600–900 palabras. Solo `<p> <h2> <h3> <ul> <ol> <li> <strong> <em> <a>`. Sin `<script>` |

**Sobre `reviewedBy`:** `null` es correcto y honesto. El artículo se publica
igual, simplemente sin firma de revisión. Lo que no se puede es poner un nombre
que no revisó nada.

Todo artículo termina con: *«Esta guía es informativa y no reemplaza la consulta
con un profesional.»*

---

## `content/food.json` — ¿puedo comer esto?

```json
{
  "foods": [
    {
      "id": "terere",
      "name": "Tereré",
      "aliases": ["terere", "mate frío"],
      "verdict": "cuidado",
      "reason": "Tiene cafeína. Hasta 200 mg por día se considera seguro.",
      "advice": "Cargá menos yerba y no tomes más de un termo por día.",
      "reviewedBy": null
    }
  ]
}
```

| `verdict` | Significa |
|---|---|
| `si` | Se puede sin problema |
| `cuidado` | Se puede con condiciones — explicalas en `advice` |
| `evitar` | Mejor no durante el embarazo |

**Importante:** a diferencia de los artículos, **un alimento sin
`reviewedBy` NO se publica**. Decir «sí, podés comer esto estando embarazada»
es una afirmación médica, no información general. Van a quedar guardados,
invisibles, hasta que la profesional los firme.

---

## `content/week-notes.json` — la frase de cada semana

Una sola frase concreta sobre lo que pasa esa semana. Es la línea que va debajo
de la foto en la pantalla principal.

```json
{
  "notes": [
    {
      "week": 24,
      "text": "Esta semana tu bebé empieza a recibir anticuerpos tuyos a través de la placenta.",
      "reviewedBy": null
    }
  ]
}
```

Máximo 160 caracteres. **Una** frase. Si necesitás dos, eso va en la página de
la semana, no acá.

---

## `content/directory.json` — lugares cerca tuyo

```json
{
  "listings": [
    {
      "id": "sanatorio-migone",
      "name": "Sanatorio Migone Battilana",
      "category": "sanatorio",
      "department": "capital",
      "city": "Asunción",
      "address": "Eligio Ayala 1293",
      "whatsappNumber": "+595981234567",
      "mapsUrl": "https://maps.google.com/?q=...",
      "isSponsored": false,
      "priority": 10,
      "consentedAt": "2026-08-05"
    }
  ]
}
```

`category`: `sanatorio`, `obstetra`, `ecografia`, `cordon`, `pediatra`,
`lactancia`, `vacunatorio`, `tienda_bebe`, `farmacia`.
`department`: el slug del departamento (`capital`, `central`, `alto-parana`,
`itapua`, …).

**`consentedAt` es obligatorio**: la fecha en que el negocio dijo que sí a
aparecer. Es un campo y no una costumbre justamente para que no se saltee. Un
número de WhatsApp que no contesta, o un lugar que no sabe que está listado, es
exactamente el problema que esta app no puede darse el lujo de tener.

---

## `content/events.json` — charlas y talleres

```json
{
  "events": [
    {
      "id": "charla-lactancia-agosto",
      "title": "Charla de lactancia materna",
      "type": "taller",
      "department": "central",
      "city": "San Lorenzo",
      "venue": "Centro de Salud Familiar",
      "startsAt": "2026-08-14T18:30",
      "description": "Encuentro abierto para embarazadas y mamás recientes.",
      "organizer": "Grupo de apoyo a la lactancia",
      "whatsappNumber": "+595981234567",
      "isSponsored": false
    }
  ]
}
```

`type`: `charla`, `taller`, `feria`, `clase`, `encuentro`.
`startsAt`: fecha y hora **fijas**, hora de Paraguay (`AAAA-MM-DDTHH:MM`).

---

## `content/videos.json`

```json
{
  "videos": [
    {
      "id": "lactancia-primeros-dias",
      "title": "Lactancia: los primeros días",
      "description": "Cómo lograr un buen agarre desde el principio.",
      "topic": "Lactancia",
      "trimester": 3,
      "youtubeId": "AbCdEfGhIjK",
      "durationLabel": "6 min"
    }
  ]
}
```

`trimester`: `0` (general), `1`, `2` o `3`.
`youtubeId`: los 11 caracteres después de `v=` en la URL de YouTube.
Verificá que el video permita ser embebido y que la fuente sea confiable
(MSPBS, OPS/OMS, hospitales, sociedades médicas).

---

## Cómo subir los archivos

1. **GitHub web**: abrí el archivo en `content/`, botón del lápiz, pegá,
   *Commit changes* en una rama nueva. Sirve para cambios chicos.
2. **Git local**: editá, `git add content && git commit && git push`. Es lo
   práctico cuando son muchos.

En los dos casos, CI valida antes de que se pueda mergear.
