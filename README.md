# Proyecto del primer parcial de Ingeniería Económica

Web académica interactiva de la Universidad Agraria del Ecuador, carrera de Ingeniería en Ciencias de la Computación en línea, paralelo **6SB**, **grupo 6**, período 2026–2027 Ciclo II.

**Página publicada:** https://jorgesanaguaray.github.io/interes-simple/

## Contenido

El proyecto reúne los cuatro bloques solicitados para el primer parcial y los organiza en nueve módulos:

| Bloque | Módulos |
| --- | --- |
| Interés simple | Interés simple; descuento simple; diagrama de tiempo; ecuaciones de valor simple |
| Interés compuesto | Interés compuesto; tasas nominales, efectivas y equivalentes; ecuaciones de valor compuesto |
| Anualidades | Series vencidas, anticipadas, diferidas y perpetuas; cálculo del pago desde el valor presente |
| Gradientes | Aritméticos y geométricos; series crecientes y decrecientes; valor presente y futuro |

Cada módulo contiene conceptos, fórmulas, condiciones de cálculo, una calculadora editable, procedimientos verificables y ejercicios resueltos. Los diagramas se generan a partir de los flujos registrados. El proyecto incluye **35 ejercicios**: dieciocho del material de clase y diecisiete casos académicos propuestos por el grupo. Las siete semanas de diapositivas de la docente son la referencia principal; cada caso de clase indica su archivo, semana y página.

## Integrantes

- Luna Peñafiel Romina
- Pérez Abad Evelyn
- Saa Chichande Solange
- Sanaguaray Gusqui Jorge
- Solís Calderón Dayanna

**Docente:** Ing. María del Pilar Avilés Vera.

## Uso

Selecciona un tema en la navegación. Cambia los datos de la calculadora para actualizar los resultados y sus pasos. En los ejercicios, el botón **Cargar datos en la calculadora** permite reproducir el caso y modificarlo.

En diagramas y ecuaciones, las entradas se registran con signo positivo y las salidas con signo negativo. Las fechas y tasas deben usar la misma unidad. La herramienta declara la fecha focal y la convención de traslado. En interés simple, cambiar la fecha focal puede modificar la equivalencia; bajo capitalización compuesta se conserva el pago equivalente.

Los importes se expresan en dólares de Estados Unidos. Se conserva la precisión interna y se redondea al presentar la respuesta. Los ejemplos son modelos académicos sin comisiones ni otros flujos adicionales.

## Archivos

- `index.html`: estructura y navegación del proyecto.
- `styles.css`: diseño adaptable, accesibilidad y presentación para impresión.
- `module-data.js`: conceptos, fórmulas, campos, ejemplos y referencias.
- `app.js`: navegación por temas, formularios, resultados y diagramas SVG.
- `finance-core.js`: motor numérico de los nueve módulos, independiente de la interfaz.
- `finance.js`: operaciones de interés simple conservadas y reutilizadas por el motor.
- `.nojekyll`: publicación estática directa mediante GitHub Pages.

La web utiliza HTML, CSS y JavaScript sin dependencias externas ni proceso de compilación. Todos los recursos usan rutas relativas, compatibles con la carpeta de proyecto `/interes-simple/`. Puede ejecutarse con un servidor HTTP estático o abrirse desde `index.html`.

## Referencias

- Avilés Vera, M. del P. (2026). *Ingeniería Económica, semanas 1 a 7* [Diapositivas de clase]. Universidad Agraria del Ecuador. Unidad 1: `S1-U1_IE_2C.pdf`, `S2-U1_IE_2C.pdf`, `S3-U1_IE_2C.pdf`, `S4-U1_IE_2C.pdf` y `S5-U1_IE_2C.pdf`. Unidad 2: `S6-U2_IE_2C .pdf` y `S7-U2_IE_2C .pdf`. Las referencias específicas y páginas están en cada módulo.
- Krajisnik, S., Leppinen, C. y Loncar-Vines, J. (s. f.). *Business Math: A Step-by-Step Handbook Abridged*. Capítulos 9, 11 y 12. https://ecampusontario.pressbooks.pub/businessmathtextbook/
- Lipsett, M. G. (2010). *A Brief Guide to Engineering Management Financial Calculations*. University of Alberta. https://sites.ualberta.ca/~mlipsett/ENGM401_620/Guide_to_Calculations.pdf

Las referencias específicas de cada tema también aparecen en la web, junto con el apartado **Equipo y fuentes**. El caso de valor presente de la semana 5, página 8, se recalcula como $4.101,74; la lámina muestra $4.101,62. El caso aritmético de la semana 7, página 10, utiliza Aₖ = A₁ + (k − 1)G, coherente con sus datos y su tabla. En las anualidades, la inmediata corresponde a d = 0 y el diferimiento se declara en periodos de pago completos.
