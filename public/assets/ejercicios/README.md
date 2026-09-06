# Imágenes de "Ejercicios" (D6)

Cada ejercicio en `lib/seed/ejercicios.json` tiene 1–4 pasos, y cada paso
apunta hoy a `/assets/ejercicios/placeholder.webp` — esa imagen **no existe
todavía a propósito**: mientras el `imageSrc` de un paso diga "placeholder",
ese ejercicio queda oculto (la app ya sabe hacer esto solo, es la misma regla
que usa el directorio y los videos). La casilla "Ejercicios" en Herramientas
muestra "Pronto" hasta que el primer ejercicio quede completo.

## Cómo publicar un ejercicio

1. Generá o conseguí una foto/ilustración real por paso, mismo vocabulario
   visual que el resto de la app (cálido, ilustrado, no foto de stock
   clínica), formato `.webp`, orientación horizontal (aprox. 4:3).
2. Subí el archivo a esta carpeta (`public/assets/ejercicios/`) con **el
   nombre exacto** de la tabla de abajo.
3. Editá `lib/seed/ejercicios.json`: cambiá el `imageSrc` de ese paso de
   `/assets/ejercicios/placeholder.webp` al nombre real, por ejemplo
   `/assets/ejercicios/caminar-1.webp`.
4. Repetí para cada paso del ejercicio. Cuando **todos** los pasos de un
   ejercicio tengan una imagen real, ese ejercicio aparece solo en la lista —
   no hace falta tocar ningún archivo `.ts` ni pedir un build nuevo aparte del
   deploy normal.

Podés publicar de a un ejercicio por vez: no hace falta esperar a tener las
24 fotos para que la casilla se desbloquee (se desbloquea con el primero).

## Nombres de archivo esperados

| Ejercicio | Paso 1 | Paso 2 |
|---|---|---|
| Caminar | `caminar-1.webp` | `caminar-2.webp` |
| Inclinación pélvica de pie | `inclinacion-pelvica-1.webp` | `inclinacion-pelvica-2.webp` |
| Gato-vaca | `gato-vaca-1.webp` | `gato-vaca-2.webp` |
| Sentadilla con apoyo | `sentadilla-con-apoyo-1.webp` | `sentadilla-con-apoyo-2.webp` |
| Elevación lateral de pierna | `elevacion-lateral-de-pierna-1.webp` | `elevacion-lateral-de-pierna-2.webp` |
| Estiramiento de pantorrilla | `estiramiento-de-pantorrilla-1.webp` | `estiramiento-de-pantorrilla-2.webp` |
| Estiramiento de cuello y hombros | `estiramiento-de-cuello-y-hombros-1.webp` | `estiramiento-de-cuello-y-hombros-2.webp` |
| Respiración diafragmática | `respiracion-diafragmatica-1.webp` | `respiracion-diafragmatica-2.webp` |
| Círculos de tobillo | `circulos-de-tobillo-1.webp` | `circulos-de-tobillo-2.webp` |
| Elevación de talones | `elevacion-de-talones-1.webp` | `elevacion-de-talones-2.webp` |
| Estiramiento de espalda alta | `estiramiento-de-espalda-alta-1.webp` | `estiramiento-de-espalda-alta-2.webp` |
| Piso pélvico (Kegel) | `kegel-piso-pelvico-1.webp` | `kegel-piso-pelvico-2.webp` |

`npm run validate:content` fails the build if a step's `imageSrc` is neither
"placeholder" nor a file that actually exists here — so a typo in the
filename, or a file forgotten in this folder, is caught before it ships
rather than showing a broken image.
