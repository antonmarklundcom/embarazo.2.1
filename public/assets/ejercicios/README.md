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


## Brief de arte (plan de crecimiento, ítem 15)

Nada de esto está generado: es el pedido exacto para cuando Anton diga "Generate image".
Una imagen por paso, 24 en total.

**Estilo común (igual para las 24).** Ilustración editorial plana, estilo libro ilustrado
suave, formas orgánicas, textura de papel sutil, contorno dibujado a mano en verde petróleo
`#2F5D50`. Paleta cálida: durazno `#F4D3C2` / `#EFC6B0`, rosa `#F3DAD4`, salvia `#DFE8D8`,
detalles petróleo. Es el mismo vocabulario que `docs/imagery-manifest.json` fijó para las
semanas, así la app se ve como una sola familia.

**Protagonista (igual en las 24).** Una mujer embarazada de unos 25 a 35 años, panza visible
de segundo trimestre, piel morena cálida, pelo oscuro recogido, expresión tranquila, ropa
cómoda (remera suelta y calza o pantalón de algodón en tonos salvia o durazno), descalza o
con zapatillas según el paso. Nada de ropa deportiva de marca, ni texto, ni logos.

**Encuadre.** Horizontal 4:3, generar a 1200×900 o más. La figura completa y centrada, con
aire alrededor: la app recorta a 4:3 con `object-cover` y la muestra a 480 px de ancho, así
que nada importante puede quedar a menos del 8 % del borde. Fondo liso color arena
`#F8E2CB`, sin degradé, con como mucho un objeto de apoyo (silla de madera, pared clara,
almohadón). Sin texto, flechas ni números dentro de la imagen: el paso ya los tiene debajo.

**Lo que NO va.** Fotos, 3D realista, equipos médicos, gimnasio, poses de esfuerzo o de
dolor, cuerpos sexualizados, bebés dibujados dentro de la panza.

| Archivo | Qué se ve (pose exacta del texto del paso) |
|---|---|
| `caminar-1.webp` | De perfil, caminando a paso tranquilo por una vereda con un lapacho florecido al fondo, brazos sueltos, hablando con alguien fuera de cuadro (sonrisa). |
| `caminar-2.webp` | De tres cuartos, atándose una zapatilla cómoda sentada en un banco bajo; al lado, una botella de agua. Luz de atardecer suave. |
| `inclinacion-pelvica-1.webp` | De perfil, espalda apoyada contra una pared clara, rodillas apenas flexionadas, manos sobre los muslos. |
| `inclinacion-pelvica-2.webp` | Misma pose de perfil; la zona lumbar pegada a la pared, una mano sobre la panza, gesto de exhalar suave. Una línea curva petróleo muy sutil marca la parte baja de la espalda contra la pared. |
| `gato-vaca-1.webp` | De perfil sobre una colchoneta, en cuatro apoyos: manos bajo los hombros, rodillas bajo la cadera, espalda neutra, panza colgando relajada. |
| `gato-vaca-2.webp` | Misma posición de perfil, espalda redondeada hacia arriba (gato), cabeza hacia abajo mirando la panza, gesto de exhalar. |
| `sentadilla-con-apoyo-1.webp` | De frente, de pie delante de una silla de madera, pies al ancho de la cadera, brazos extendidos hacia adelante para el equilibrio. |
| `sentadilla-con-apoyo-2.webp` | De perfil, bajando como para sentarse, cadera hacia atrás y apenas por encima del asiento de la silla, espalda recta, brazos adelante. |
| `elevacion-lateral-de-pierna-1.webp` | Acostada de costado sobre una colchoneta, cabeza sobre el brazo y una almohada, piernas juntas y rodillas apenas flexionadas, panza apoyada. |
| `elevacion-lateral-de-pierna-2.webp` | Misma posición, la pierna de arriba levantada unos 30°, cadera alineada (no girada hacia atrás). |
| `estiramiento-de-pantorrilla-1.webp` | De perfil frente a una pared, manos apoyadas en la pared a la altura de los hombros, pies juntos. |
| `estiramiento-de-pantorrilla-2.webp` | Misma escena, una pierna atrás con el talón en el piso y la rodilla estirada, la de adelante flexionada, cuerpo inclinado suave hacia la pared. |
| `estiramiento-de-cuello-y-hombros-1.webp` | De frente, sentada en una silla, cabeza inclinada suave hacia el hombro derecho, hombros bajos, ojos cerrados. |
| `estiramiento-de-cuello-y-hombros-2.webp` | Misma escena, hombros subiendo y yendo hacia atrás; dos pequeñas curvas petróleo alrededor de cada hombro indican el círculo. |
| `respiracion-diafragmatica-1.webp` | De frente, sentada cómoda con la espalda apoyada, una mano sobre el pecho y la otra sobre la panza, ojos cerrados. |
| `respiracion-diafragmatica-2.webp` | Misma escena, panza un poco más llena, boca apenas abierta exhalando; unas líneas suaves salen de la boca. Gesto relajado, nunca de aguantar el aire. |
| `circulos-de-tobillo-1.webp` | De tres cuartos, sentada en una silla, un pie levantado del piso con la pierna extendida. |
| `circulos-de-tobillo-2.webp` | Primer plano medio de la pierna levantada; una curva petróleo circular alrededor del tobillo indica el giro. El otro pie en el piso. |
| `elevacion-de-talones-1.webp` | De perfil, de pie tomada del respaldo de una silla de madera, pies planos. |
| `elevacion-de-talones-2.webp` | Misma escena, en puntitas de pie, talones levantados, cuerpo erguido y tranquilo. |
| `estiramiento-de-espalda-alta-1.webp` | De frente, sentada en una silla, brazos cruzados delante del pecho, cada mano sobre el hombro opuesto. |
| `estiramiento-de-espalda-alta-2.webp` | De tres cuartos, misma pose, espalda alta redondeada suave como abrazándose, mentón hacia el pecho. |
| `kegel-piso-pelvico-1.webp` | De frente, sentada derecha en una silla, manos sobre los muslos, expresión concentrada y tranquila. Sin anatomía dibujada: el ejercicio no se ve, se transmite la calma. |
| `kegel-piso-pelvico-2.webp` | Misma mujer sentada mirando un celular en la mano con un cronómetro circular simple en la pantalla (sin texto legible). |

**Cuando existan las imágenes.** Guardalas con el nombre de la tabla (el mismo nombre, en PNG, JPG o WebP) en `public/assets/ejercicios/src/` y corré
`node scripts/place-exercise-art.mjs`: recorta a 4:3, las deja en 960×720 WebP de menos de
90 KB, apunta cada `imageSrc` del seed a su archivo y te dice qué ejercicios quedaron
completos. Después `npm run validate:content` y commit.
