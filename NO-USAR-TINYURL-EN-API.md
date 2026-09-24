# No usar TinyURL (ni acortadores) en la URL del API

Checklist para enlaces personales (`?c=`), carnets, consulta y validación.

## Regla

En el Base64 del parámetro `?c=` va **`UUID|URL_del_Web_App`**.

La **URL del API** debe ser la URL **`/exec`** del despliegue en Google Apps Script:

```text
https://script.google.com/macros/s/XXXXXXXX/exec
```

**No** uses TinyURL, bit.ly, t.co, etc. en esa parte. El acortador puede ir en otros sitios (correo, QR de marketing), pero **no** dentro de `uuid|apiUrl`.

### Por qué

- El carnet y la consulta llaman al API con **`fetch()`** desde `afatierno.github.io`.
- Los acortadores responden con CORS que **bloquea** esa petición (error en consola: `Access-Control-Allow-Origin: https://tinyurl.com`).
- El front tiene **JSONP como respaldo** para enlaces viejos, pero es legacy: más frágil y depende de `?callback=` en el script.
- La URL **`/exec` directa** funciona bien con `fetch` (CORS `*` en Apps Script).

---

## Dónde revisar / cambiar

| Qué | Dónde | Qué poner en `apiUrl` |
|-----|--------|------------------------|
| **Carnet familias** | Columna / fórmula **`UrlCarnet`** (Google Sheets) | URL `/exec` del script de carnet |
| **Emails carnet** | `EmailSender/gs/Code.gs` → columna **`UrlCarnet`**; plantilla `{{carnet}}` | Debe salir de `UrlCarnet` ya con `/exec` |
| **Tokens / Base64 en hoja** | `Token/gs/functions.gs` → hoja **Config** (`urlApi`, `urlApiSearch`, etc.) | `/exec` al generar Base64 consulta / validación |
| **Consulta socios** | Mismo Base64 que escribe Token o fórmula en hoja | URL `/exec` del script de consulta |
| **Validación QR** | El QR lleva el mismo `apiUrl` que el carnet | Hereda de `CONFIG.API_URL`; si el carnet usa `/exec`, el QR también |
| **Validación comercio / interna** | Enlaces `?c=` propios | `/exec` del script correspondiente |
| **Documentación interna** | Guías de comercio / carnet | No recomendar TinyURL para el API |

---

## Formato del enlace carnet (referencia)

```text
https://afatierno.github.io/web/carnet/web/?c=BASE64
```

Contenido decodificado de `BASE64`:

```text
48d0242e-c996-42a8-9290-9d6c1f5ea5cf|https://script.google.com/macros/s/AKfycb.../exec
```

Generación en hoja (ejemplo conceptual):

```text
BASE64( UUID & "|" & URL_EXEC_CARNET )
```

Frontend: `carnet/web/js/config.js` → `encodeAccessConfig(uuid, apiUrl)`.

---

## Enlaces ya enviados (TinyURL en el API)

- Siguen siendo válidos mientras el front use **JSONP de respaldo** (`carnet/web/js/api.js`, versión ≥ 0021).
- **No hace falta reenviar** carnets solo por TinyURL si el despliegue web está actualizado.
- Para **nuevos** envíos y mantenimiento a largo plazo: **solo `/exec`**.

---

## Comprobación rápida

1. Decodificar un `?c=` de prueba (Base64).
2. Confirmar que la parte tras `|` empieza por `https://script.google.com/macros/s/` y termina en `/exec`.
3. Abrir el carnet: en consola no debería aparecer CORS de `tinyurl.com` (o solo un intento `fetch` fallido antes del JSONP en enlaces viejos).

---

## URL `/exec` de referencia (carnet)

Sustituir cuando rote el despliegue; no commitear secretos, solo la URL pública del Web App:

- TinyURL actual en enlaces viejos: `https://tinyurl.com/3dufr2yr` → redirige al `/exec` de producción.
- Usar en fórmulas la URL **`/exec` final**, no el acortador.

---

## Front del carnet (sept 2026)

- **`fetch` primero**; si falla por red/CORS → **JSONP**.
- Validación carnet: `carnet/web/js/validacion-api.js`.
- Validación comercio / interna (escáner QR): `validacion/comercio/web/js/validation-api.js`, `validacion/interna/web/js/validation-api.js` (importan `carnet/web/js/api-url.js`).
- Con acortador en el API, se usa **JSONP directo** (sin intentar `fetch` primero).
- Versión JS carnet: `JS_CACHE_VERSION` en `carnet/web/js/asset-version.js` (+ `?v=` en HTML). Comercio/interna: `APP_VERSION` en su `asset-version.js`.

---

*Última actualización: septiembre 2026*
