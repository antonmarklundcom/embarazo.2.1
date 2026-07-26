# Prompts för att generera innehåll till Mi Bebé

Kör dessa i Gemini (eller vilken modell som helst). Varje prompt ber om **exakt
det JSON-format som `npm run validate:content` kräver** — se
`docs/CONTENT-GUIDE.md`.

## Så här använder du dem

1. Kopiera hela prompten (inklusive `CONTEXTO`-blocket).
2. Klistra in svaret i rätt fil under `content/`.
3. Kör `npm run validate:content`. Fixa det den klagar på.
4. Commita.

**Kör en prompt i taget och i mindre satser.** Be om 6–8 artiklar per körning,
inte 30. Modeller tappar formatet och blir vagare ju längre svaret blir, och du
vill kunna läsa igenom det du klistrar in.

**Innan du kör:** ta bort `"reviewedBy": null` först när din barnmorska/läkare
faktiskt har läst texten, och byt då till hennes riktiga namn. `null` är rätt
svar så länge ingen har granskat.

---

## Block som ska ligga först i varje prompt

```
CONTEXTO — leé esto antes de responder:

Escribís para "Mi Bebé", una app de embarazo hecha para Paraguay.
Tu lectora es una mujer embarazada paraguaya, de cualquier nivel educativo,
que probablemente lee en el celular con datos limitados.

REGLAS DE ESCRITURA (no negociables):
1. Castellano paraguayo con VOSEO: "tomá", "registrá", "acercate", "tenés",
   "podés", "vos". NUNCA "toma", "registra", "tienes", "puedes", "tú".
2. Realidad paraguaya concreta: IPS vs. sanatorio privado vs. hospital público
   del MSPBS, carné perinatal, PAI, USF, Registro Civil, precios en guaraníes,
   comida paraguaya real, calor, dengue, tereré.
3. Tono cálido y directo, nunca alarmista, nunca infantilizante. Hablás como
   una amiga que sabe del tema, no como un folleto.
4. NUNCA diagnosticás ni indicás tratamiento ni dosis. Ante síntomas, la
   respuesta siempre es consultar con su médico/a o ir a la guardia.
5. NO inventes datos. Si no sabés un teléfono, una dirección, un precio o si
   algo es seguro, omitilo. En una app de salud, un dato inventado es peor que
   un dato faltante.
6. Frases cortas. Nada de jerga médica sin explicarla en la misma frase.

FORMATO DE RESPUESTA:
Devolvé ÚNICAMENTE JSON válido, sin explicaciones antes ni después, sin
```json ni ningún otro envoltorio. Empezá con { y terminá con }.
```

---

## 1. Guías (artiklar) — den största jobbet

Detta är innehållsvallgraven. Kör i satser om 6.

```
[PEGAR EL BLOQUE CONTEXTO ACÁ]

TAREA: escribí 6 guías para la app.

Formato exacto:
{
  "articles": [
    {
      "slug": "en-minusculas-con-guiones",
      "title": "Título en castellano",
      "excerpt": "Una o dos líneas, máximo 200 caracteres.",
      "date": "2026-08-01",
      "author": "Mi Bebé",
      "reviewedBy": null,
      "cluster": "salud",
      "week": 20,
      "html": "<p>...</p>"
    }
  ]
}

Reglas del campo "cluster": elegí uno de salud, logistica, tramites, derechos,
alimentacion, parto, postparto, bienestar.

Reglas del campo "week": la semana de embarazo (1 a 42) en la que esa guía es
más útil. Si aplica a todo el embarazo, omití el campo.

Reglas del campo "html":
- Entre 600 y 900 palabras.
- Solo estas etiquetas: <p> <h2> <h3> <ul> <ol> <li> <strong> <em>
- Empezá con un párrafo que explique por qué le importa a ella, no con
  definiciones.
- Usá <h2> para 3 o 4 secciones prácticas.
- Terminá SIEMPRE con este párrafo exacto:
  <p>Esta guía es informativa y no reemplaza la consulta con un profesional.</p>
- Escapá las comillas dobles dentro del HTML como \"

TEMAS para esta tanda (uno por guía):
1. Alimentación en el embarazo con comida paraguaya (mandioca, chipa, asado,
   pescado de río y mercurio, quesú Paraguay)
2. Anemia y hierro en el embarazo
3. Preeclampsia y presión alta: qué señales mirar
4. Diabetes gestacional y la curva de azúcar
5. Parto normal vs. cesárea en Paraguay: qué preguntar antes
6. Lactancia: los primeros días, el agarre y los mitos
```

**Teman till följande körningar** (byt bara ut listan i slutet):

- 7–12: salud mental perinatal · sexo en el embarazo · ecografías (cuáles,
  cuándo, cuánto cuestan) · embarazo adolescente · violencia durante el
  embarazo (Línea 137) · toxoplasmosis, chagas y otras infecciones locales
- 13–18: medicamentos comunes · el puerperio, los primeros 40 días · trámites
  IPS paso a paso · preparar a los hermanitos · calor extremo y embarazo ·
  yuyos y remedios caseros

---

## 2. Alimentos — "¿puedo comer esto?"

Det här är det enskilt mest värdefulla innehållet vi kan ha. Ingen global app
har paraguayansk mat på es-PY.

```
[PEGAR EL BLOQUE CONTEXTO ACÁ]

TAREA: armá una base de datos de alimentos para responder "¿puedo comer esto
estando embarazada?".

Formato exacto:
{
  "foods": [
    {
      "id": "terere",
      "name": "Tereré",
      "aliases": ["terere", "mate frío"],
      "verdict": "cuidado",
      "reason": "Una línea explicando por qué. Máximo 240 caracteres.",
      "advice": "Qué hacer para que sea seguro. Máximo 240 caracteres.",
      "reviewedBy": null
    }
  ]
}

"verdict" es uno de:
- "si"      → se puede sin problema
- "cuidado" → se puede con condiciones (explicalas en "advice")
- "evitar"  → mejor no durante el embarazo

"advice" es opcional: incluilo solo cuando hay algo concreto que hacer.
"aliases": otras formas de escribirlo o nombrarlo que alguien podría buscar,
incluyendo sin tildes.

IMPORTANTE: el "reason" tiene que decir POR QUÉ, no solo repetir el veredicto.
"Tiene cafeína, y más de 200 mg por día se asocia a riesgos" sirve.
"No es recomendable" no sirve.

Cubrí estos 30 alimentos y bebidas, tal como se consumen en Paraguay:
tereré, mate, mate cocido, café, chipa, chipa guasu, sopa paraguaya, mandioca,
asado / carne asada, chorizo, morcilla, milanesa, quesú Paraguay, queso fresco
sin pasteurizar, leche sin pasteurizar, huevo poco cocido, mayonesa casera,
surubí, dorado, pacú, sushi, embutidos y fiambres, paté, ensaladas de
verdulería sin lavar, brotes crudos, hígado, gaseosas, jugos naturales,
edulcorantes, alcohol.
```

Kör sedan en andra körning för `yuyos`: *ka'a he'ẽ, cedrón, burrito, menta'i,
manzanilla, boldo, cola de caballo, ruda, ajenjo*. Örter är där det farligaste
sitter, och där det finns minst pålitlig information på spanska.

---

## 3. Veckofraser (42 stycken)

```
[PEGAR EL BLOQUE CONTEXTO ACÁ]

TAREA: escribí UNA frase para cada semana de embarazo, de la 1 a la 42.

Formato exacto:
{
  "notes": [
    { "week": 1, "text": "…", "reviewedBy": null }
  ]
}

Cada "text":
- UNA sola oración, máximo 160 caracteres.
- Dice algo CONCRETO que está pasando esa semana, no una generalidad.
  Bien: "Esta semana tu bebé empieza a recibir anticuerpos tuyos a través de
  la placenta."
  Mal: "Tu bebé sigue creciendo y desarrollándose."
- Le habla a ella de vos.
- Semanas 1 y 2: aclarar con honestidad que todavía no hay embrión, porque las
  semanas se cuentan desde la última menstruación.

Devolvé las 42 en una sola respuesta.
```

---

## 4. Directorio (kör INTE detta i Gemini)

**Katalogen får inte genereras.** Varje post kräver ett telefonnummer som
faktiskt svarar och ett företag som sagt ja till att listas — det är därför
`consentedAt` är ett obligatoriskt fält. En modell kan inte ringa någon.

Använd Gemini bara för att bygga *ringlistan*:

```
[PEGAR EL BLOQUE CONTEXTO ACÁ]

TAREA: listá sanatorios, centros de ecografía y consultorios de
gineco-obstetricia conocidos de Asunción y del departamento Central.

Devolvé solo nombres y barrio o ciudad, en texto plano, una por línea.
NO inventes teléfonos, direcciones ni sitios web: solo el nombre y la zona.
Si no estás seguro de que un lugar exista, no lo incluyas.
```

Ring sedan varje ställe, bekräfta att de tar emot frågor via WhatsApp, be om ett
uttryckligt ja till att listas, och skriv in posten för hand med dagens datum i
`consentedAt`. Sikta på 30–50 poster i Asunción + Central före lansering — det
är ungefär 70 % av marknaden.

---

## 5. Videor (samma sak — verifiera själv)

Låt Gemini föreslå kanaler och söktermer, men **hämta id:t själv från YouTube**
och kontrollera att videon går att bädda in. En modell kan inte se om ett
video-id existerar och hittar gärna på elva tecken som ser rätt ut.

```
[PEGAR EL BLOQUE CONTEXTO ACÁ]

TAREA: sugerí qué buscar en YouTube para encontrar 10 videos educativos
confiables sobre embarazo, parto y lactancia en español.

Para cada uno devolvé, en texto plano: el tema, el término de búsqueda exacto,
y qué canal oficial sería la mejor fuente (MSPBS Paraguay, OPS/OMS, sociedades
de ginecología, hospitales universitarios).

NO inventes IDs de YouTube ni enlaces.
```

---

## Vad du gör efter varje körning

```bash
npm run validate:content
```

Fungerar det, commita. Klagar den, står det i klartext vilken post och vilket
fält som är fel — klistra gärna in felmeddelandet i Gemini och be om en rättad
version av just den posten.

Två saker som validatorn **inte** kan fånga åt dig, och som du måste läsa
själv:

- **Om innehållet är sant.** Schemat kontrollerar formen, inte medicinen. Allt
  hälsorelaterat behöver din granskares ögon innan `reviewedBy` fylls i.
- **Om tonen stämmer.** Modeller glider från voseo till neutral spanska efter
  några stycken. Sök efter "tienes", "puedes", "toma" i det du fått — hittar du
  dem har den tappat rösten och du bör be om en omskrivning.
