# Guía del dosier de comercios colaboradores

Documento de referencia para mantener y ampliar el dosier (`index.html`, fichas individuales y estilos en `css/dossier.css`).

---

## Estructura del sitio

| Archivo | Uso |
|---------|-----|
| `index.html` | Página principal: cuadrícula 2 columnas, filtros y tarjetas |
| `en-construccion.html` | Ficha genérica mientras no exista página propia |
| `centro-optico-lookvision.html` | Ejemplo de ficha completa con texto ampliado |
| `fisioterapia-alvaro-garcia.html` | Ficha completa de Fisioterapia Álvaro García |
| `un-sitio-muy-chulo.html` | Ficha completa de Un sitio muy chulo |
| `css/dossier.css` | Estilos compartidos (badges, tipografía, layout base) |

---

## Listado de comercios

- Mantener los comercios **ordenados alfabéticamente** por nombre en `index.html`.
- Cada comercio va en un `<li data-category="…">` dentro de `#shop-grid`.

### Categorías de filtro

| Filtro | `data-category` | Ejemplos |
|--------|-----------------|----------|
| Todo | (sin filtrar) | — |
| Cultura | `cultura` | Teatro, cafeterías |
| Locales de actividades | `locales-actividades` | Rocódromo, parques infantiles, trampolines, cumpleaños |
| Salud | `salud` | Dental, óptica, fisioterapia |
| Compras | `compras` | Librería, papelería, tienda de música |

---

## Tarjeta en el dosier (vista compacta)

Cada tarjeta incluye:

1. Imagen (placeholder «Imagen» o foto en `assets/images/`)
2. Fila superior: nombre del comercio (`<h2>`) y «Ver ficha →» alineados (`shop-tile-header`)
3. Tipo (`<span class="type-badge">`)
4. Badge(s) de descuento en una sola línea (`shop-tile-offers`; ver reglas abajo)
5. Toda la tarjeta es clicable vía `stretch-link` (el enlace visible es decorativo)

### Imágenes

- Contenedor cuadrado (`aspect-ratio: 1 / 1`).
- Usar `object-fit: contain` para logos/banners anchos (no deformar ni desbordar).

---

## Reglas para el texto del badge de descuento

El badge va en `<span class="discount-badge">` dentro de `.shop-tile-offers`.
Si hace falta combinar dos badges, poner ambos `<span class="discount-badge">` seguidos en la misma `.shop-tile-offers`.

### 1. Un solo porcentaje general

Cuando el descuento aplica de forma general al comercio (sin restricciones de producto/servicio concretos).

**Formato:** `X% de descuento`

**Ejemplos:** Look Visión, Ohana Acai, Aula 7 (si es en toda la tienda).

### 2. Porcentaje solo en ciertas cosas

Cuando el descuento es parcial (cumpleaños, ciertos días, cafetería, salto, etc.).

**Formato:**
- `X% en determinados servicios` — ocio, eventos, actividades, tratamientos acotados
- `X% en determinados artículos` — tiendas, librerías, papelería, productos físicos

**Ejemplos:** Pekiro mucho (5% cumpleaños/eventos), Legapark, DIVERJUMP, Un sitio muy chulo.

### 3. Varios porcentajes distintos

Mostrar el **rango** mínimo–máximo, no listar cada uno en la tarjeta.

**Formato:**
- `5-10% en determinados artículos`
- `10-15% en determinados servicios`

**Ejemplos:** Papelería Los Colegios (5% libros / 10% papelería), Urban Planet (10% salto / 15% cumples), Fisioterapia Álvaro García (10% fisioterapia / 20% menores de 14).

### 4. Ventajas que no son porcentaje

Precios especiales, clases gratis, matrícula gratis, consumiciones, etc.

**Formato:** `Descuentos exclusivos de socios`

**Ejemplos:** Indoorwall, JumpYard, Rey de Pikas.

### 5. Combinar porcentaje + otras ventajas

Si hay porcentaje **y** ventajas no porcentuales (revisiones gratis, TAC gratis, etc.).

**Formato:** dos badges en `.discount-badges`:
1. `X% de descuento`
2. `Descuentos exclusivos de socios`

**Ejemplo:** Clínica Dental Loyola (5% + revisiones/radiografías/TAC gratis).

---

## Fichas individuales

- Si el comercio tiene **texto largo o varias ventajas**, crear una página propia (p. ej. `centro-optico-lookvision.html`).
- En `index.html`, enlazar la tarjeta a esa ficha en lugar de `en-construccion.html`.
- En la ficha, desarrollar el detalle completo: condiciones, listas, dirección, etc.
- **Dirección:** enlazar a Google Maps cuando se conozca la ubicación:

```html
<a class="address-link"
   href="https://www.google.com/maps/search/?api=1&query=NOMBRE+COMERCIO,+DIRECCIÓN,+CP+LOCALIDAD,+España"
   target="_blank"
   rel="noopener noreferrer">
  Texto visible de la dirección
</a>
```

  Sustituir espacios por `+` y acentos por URL encoding en el parámetro `query`.
- El enlace «Volver al dosier» debe usar `history.back()` si el usuario viene del dosier; si no, fallback a `index.html` (ver `en-construccion.html` o la ficha de Look Visión).

---

## Añadir un comercio nuevo (checklist)

1. Decidir categoría (`cultura`, `locales-actividades`, `salud`, `compras`).
2. Insertar la tarjeta en **orden alfabético** en `#shop-grid`.
3. Elegir el texto del badge según las reglas de arriba.
4. Si el descuento es complejo, crear ficha propia; si no, enlazar a `en-construccion.html`.
5. Añadir imagen en `assets/images/` si está disponible.

---

## Comercios actuales (referencia rápida)

| Comercio | Categoría | Badge en dosier | Ficha |
|----------|-----------|-----------------|-------|
| Aula 7 | compras | 10% de descuento | aula-7.html |
| Centro Óptico Look Visión | salud | 10% de descuento | centro-optico-lookvision.html |
| Clínica Dental Loyola | salud | 5% de descuento + Descuentos exclusivos de socios | clinica-dental-loyola.html |
| DIVERJUMP Leganés | locales-actividades | 10% en cumpleaños | diverjump-leganes.html |
| Fisioterapia Getafe · Álvaro García | salud | 10-20% en determinados servicios | fisioterapia-alvaro-garcia.html |
| Hop Galaxy Boadilla | locales-actividades | 2 €/niño en grupos (lun-jue) | hop-galaxy-boadilla.html |
| Indoorwall Getafe | locales-actividades | Matrícula escuela gratis + Actividades 8,5 € niños | indoorwall-getafe.html |
| JumpYard Getafe | locales-actividades | Cumpleañero gratis (cumpleaños) | jumpyard-getafe.html |
| Legapark | locales-actividades | 10% en determinados servicios | legapark.html |
| Mundifantasía | locales-actividades | 10% en determinados servicios | mundifantasia.html |
| Ohana Acai Getafe | cultura | 10% de descuento | ohana-acai-getafe.html |
| Papelería y Librería Los Colegios | compras | 5-10% en determinados artículos | papeleria-los-colegios.html |
| Pekiro mucho | locales-actividades | 5% en cumpleaños y eventos | pekiro-mucho.html |
| Planeta Estrella | locales-actividades | 10% en determinados servicios | planeta-estrella.html |
| Rey de Pikas | cultura | 1 consumición gratis por entrada | rey-de-pikas.html |
| Un sitio muy chulo | locales-actividades | 10% en determinados servicios | un-sitio-muy-chulo.html |
| Urban Planet | locales-actividades | 10-15% en determinados servicios | urban-planet-leganes.html |

---

*Última actualización: septiembre 2026*
