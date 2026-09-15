# Guía del dosier de comercios colaboradores

Documento de referencia para mantener y ampliar el dosier (`index.html`, fichas individuales y estilos en `css/dossier.css`).

---

## Estructura del sitio

| Archivo | Uso |
|---------|-----|
| `index.html` | Página principal: cuadrícula 2 columnas, filtros y tarjetas |
| `en-construccion.html` | Ficha genérica mientras no exista página propia |
| `centro-optico-lookvision.html` | Ejemplo de ficha completa con texto ampliado |
| `css/dossier.css` | Estilos compartidos (badges, tipografía, layout base) |

---

## Listado de comercios

- Mantener los comercios **ordenados alfabéticamente** por nombre en `index.html`.
- Cada comercio va en un `<li data-category="…">` dentro de `#shop-grid`.

### Categorías de filtro

| Filtro | `data-category` | Ejemplos |
|--------|-----------------|----------|
| Todo | (sin filtrar) | — |
| Ocio | `ocio` | Parques, eventos, cafeterías de ocio |
| Salud | `salud` | Dental, óptica, fisioterapia |
| Extraescolares | `extraescolares` | Rocódromo, club de lectura, oratoria |
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

**Ejemplos:** Periko mucho (5% cumpleaños/eventos), Legapark, DIVERJUMP, Un sitio muy chulo.

### 3. Varios porcentajes distintos

Mostrar el **rango** mínimo–máximo, no listar cada uno en la tarjeta.

**Formato:**
- `5-10% en determinados artículos`
- `10-15% en determinados servicios`

**Ejemplos:** Papelería Los Colegios (5% libros / 10% papelería), Urban Planet (10% salto / 15% cumples).

### 4. Ventajas que no son porcentaje

Precios especiales, clases gratis, matrícula gratis, consumiciones, etc.

**Formato:** `Descuentos exclusivos de socios`

**Ejemplos:** Indoorwall, JumpYard, Club de lectura, Fisioterapia Getafe, Rey de Pikas.

### 5. Combinar porcentaje + otras ventajas

Si hay porcentaje **y** ventajas no porcentuales (revisiones gratis, TAC gratis, etc.).

**Formato:** dos badges en `.discount-badges`:
1. `X% de descuento`
2. `Descuentos exclusivos de socios`

**Ejemplo:** Clínica Delta Loyola (5% + revisiones/radiografías/TAC gratis).

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

1. Decidir categoría (`ocio`, `salud`, `extraescolares`, `compras`).
2. Insertar la tarjeta en **orden alfabético** en `#shop-grid`.
3. Elegir el texto del badge según las reglas de arriba.
4. Si el descuento es complejo, crear ficha propia; si no, enlazar a `en-construccion.html`.
5. Añadir imagen en `assets/images/` si está disponible.

---

## Comercios actuales (referencia rápida)

| Comercio | Categoría | Badge en dosier | Ficha |
|----------|-----------|-----------------|-------|
| Aula 7 | compras | 10% de descuento | en-construccion |
| Centro Óptico Look Visión | salud | 10% de descuento | centro-optico-lookvision.html |
| Club de lectura | extraescolares | Descuentos exclusivos de socios | en-construccion |
| DIVERJUMP Leganés | ocio | 10% en determinados servicios | en-construccion |
| Escritura creativa y Oratoria | extraescolares | Descuentos exclusivos de socios | en-construccion |
| Fisioterapia Getafe · Álvaro García | salud | Descuentos exclusivos de socios | en-construccion |
| Hop Galaxy Boadilla | ocio | Descuentos exclusivos de socios | en-construccion |
| Indoorwall Getafe | extraescolares | Descuentos exclusivos de socios | en-construccion |
| JumpYard Getafe | ocio | Descuentos exclusivos de socios | en-construccion |
| Legapark | ocio | 10% en determinados servicios | en-construccion |
| Clínica Delta Loyola | salud | 5% de descuento + Descuentos exclusivos de socios | en-construccion |
| Mundifantasía | ocio | 10% en determinados servicios | en-construccion |
| Ohana Acai Getafe | ocio | 10% de descuento | en-construccion |
| Papelería y Librería Los Colegios | compras | 5-10% en determinados artículos | en-construccion |
| Periko mucho | ocio | 5% en determinados servicios | en-construccion |
| Planeta Estrella | ocio | 10% en determinados servicios | en-construccion |
| Rey de Pikas | ocio | Descuentos exclusivos de socios | en-construccion |
| Un sitio muy chulo | ocio | 10% en determinados servicios | en-construccion |
| Urban Planet | ocio | 10-15% en determinados servicios | en-construccion |

---

*Última actualización: septiembre 2026*
