# SaborMap · prototipo navegable

Prototipo de una app para descubrir restaurantes cercanos, consultar sus menús, ver la disponibilidad de cada plato en tiempo real y conocer las promociones del día.

Tiene dos vistas de la misma aplicación, con el sistema visual **Terracotta Epicure**:

- **Comensal** (`comensal/`): quien busca dónde comer.
- **Panel del local** (`local/`): el restaurante que administra su carta.

> **Alcance del producto:** la app es solo informativa. No hay compras, pedidos, carrito ni reservas. Las promociones se aplican directamente en cada restaurante.

## Cómo verlo

No necesita instalación ni compilación (solo Python 3, que trae `sqlite3` de serie). La forma recomendada es el servidor con base de datos:

```bash
python3 server.py        # http://localhost:8000
```

Luego abre <http://localhost:8000>. La portada enlaza las dos vistas. **Importante para el aviso de ubicación:** el navegador solo lo muestra en contextos seguros, es decir, servido por `localhost` (como arriba) o por HTTPS; con doble clic en `index.html` (`file://`) la geolocalización falla sin mostrar el aviso y el mapa queda en la zona de demostración. En pantallas anchas la vista comensal ocupa todo el ancho: las listas se reparten en columnas que crecen con la ventana y Explorar, la Bienvenida y el detalle de plato usan dos columnas (contenido y mapa o ficha). Para probar el recorrido en un teléfono usa el modo de diseño adaptable del navegador (F12 y luego Ctrl+Shift+M).

**Truco para ver la conexión entre vistas:** abre el panel del local y la vista comensal en dos pestañas. Marca «Pescado blanco» como agotado en el panel (pestaña Ingredientes → agotar) y recarga la carta del comensal: el carpaccio, los ravioles y el pescado del día aparecen en rojo.

## Estructura

```
sabormap-prototipo/
├── index.html              portada: elige la vista
├── server.py               servidor estático + API JSON sobre SQLite (solo stdlib)
├── tools/
│   └── generar-semilla.js  regenera data/semilla.json desde la semilla de db.js
├── data/
│   ├── semilla.json        semilla sintética (locales, cartas, promos, reseñas, comensal)
│   └── sabormap.sqlite     base de datos (se crea al arrancar server.py)
├── assets/                 compartido por las dos vistas
│   ├── base.css            reinicio, tipografía y foco
│   ├── componentes.css     botones, chips, pastillas de estado, campos, interruptores, diálogos, avisos
│   ├── logo.svg
│   ├── img/                fotos de ejemplo
│   └── js/
│       ├── iconos.js       iconos de línea y logo
│       ├── datos-demo.js   datos de La Trattoria del Sol (semilla original del panel)
│       └── db.js           base de datos compartida: SQLite vía API, con reserva en localStorage
├── design/                 compartido
│   ├── tokens.json         colores, estados de disponibilidad, tipografía, radios, sombras
│   ├── tokens.css          los mismos tokens como variables CSS (--sm-*)
│   └── DESIGN.md           guía original del sistema Terracotta Epicure
├── comensal/               vista comensal (8 pantallas pintadas desde la base)
│   ├── index.html, explorar.html, platos.html, restaurante.html,
│   │   plato.html, promociones.html, resenas.html, perfil.html
│   ├── comensal.css
│   ├── render.js           pinta cada página desde la base de datos
│   └── mapa.js             mapa real de Explorar y Bienvenida (Leaflet + OpenStreetMap)
└── local/                  panel del local (aplicación de una página)
    ├── index.html
    ├── local.css
    └── local.js
```

Todas las rutas son relativas (`../assets/`, `../design/`), así que la carpeta `local/` se puede renombrar sin tocar nada más. Solo hay que actualizar los enlaces que apuntan a ella desde la portada (`index.html`).

## Vista comensal

| Archivo | Pantalla |
|---|---|
| `index.html` | Bienvenida: mapa de la zona y permiso de ubicación (el botón dispara el permiso del navegador) |
| `explorar.html` | Mapa, restaurante seleccionado, promociones y lista cercana |
| `platos.html` | Buscador por disponibilidad con semáforo en vivo |
| `restaurante.html` | Ficha del restaurante, carta en vivo, promociones e información |
| `plato.html` | Detalle del plato |
| `promociones.html` | Promociones cercanas |
| `resenas.html` | Reseñas y fotos |
| `perfil.html` | Perfil del comensal: datos, avisos, preferencias y guardados |

Los mapas de `explorar` y de la bienvenida son reales: Leaflet con tiles de OpenStreetMap (attribution obligatoria, © OpenStreetMap contributors) y los pines del sistema visual como marcadores. La posición del comensal viene de la Geolocation API del navegador, de forma local (la coordenada no sale del dispositivo), y los locales de prueba se colocan en función de ella mediante offsets en grados, así las distancias de la demostración se ven bien en cualquier ciudad. La bienvenida pide el permiso al cargar (y su botón «Permitir ubicación» lo vuelve a intentar antes de continuar); sin permiso el mapa muestra un aviso visible y usa un centro de demostración en Santiago. Requiere conexión para los tiles; si el CDN de Leaflet no carga, la columna queda con el fondo del mapa y nada se rompe.

Flujo principal: `index` → `explorar` → `restaurante` → `plato`. Seis de las pantallas (explorar, restaurante, platos, promociones, resenas y perfil) se pintan desde la base de datos con `comensal/render.js` —semáforo real, precios con promoción, guardados—; el detalle de plato sigue siendo estático. Todas usan el sistema visual oficial: tokens de `design/tokens.css`, componentes `sm-*` de `assets/componentes.css`, clases de vista `cm-*` en `comensal/comensal.css` e iconos de `assets/js/iconos.js`, y arrancan dentro de `SaborMapDB.listo().then(...)` para pintar los iconos una vez cargados los datos.

## Panel del local

Es funcional: los cambios se guardan en la base compartida (SQLite al servir con `server.py`, con reserva en `localStorage` si no hay servidor) y se pueden deshacer desde el aviso que aparece tras cada acción. Solo administra la carta y lo asociado a ella; no incluye ventas, pedidos ni reservas.

| Sección | Qué permite |
|---|---|
| Inicio | Marcar agotado rápido (busca un ingrediente o un plato), semáforo de la carta, ingredientes agotados, platos con pocas porciones (contador), promociones de hoy y platos sin foto |
| Carta | Agregar, editar y eliminar platos: foto, nombre, descripción, precio, categoría, ingredientes, etiquetas, visibilidad y disponibilidad (disponible, pocas porciones con contador, agotado con hora de regreso) |
| Ingredientes | Marcar ingredientes como agotados o disponibles, agregarlos, renombrarlos, agruparlos y eliminarlos |
| Promociones | Crear y editar descuentos, 2x1, precios especiales y menús del día, con días, horario, fecha de término, condiciones y vista previa de cómo las ve el comensal |
| Información del local | Datos generales, fotos y portada, horario semanal, cierre temporal, servicios y reinicio diario de disponibilidad |

### Regla de disponibilidad

Cada plato tiene un **estado manual**: `disponible`, `pocas` o `agotado`. El comensal ve el plato **agotado** si falta cualquiera de sus ingredientes, sin importar el estado manual. Al reponer el ingrediente, el plato vuelve a su estado manual.

Ejemplo con los datos de prueba: al marcar «Pescado blanco» como agotado, se agotan automáticamente el carpaccio, los ravioles y el pescado del día. También se puede agotar un plato puntual, como el tiramisú, sin tocar sus ingredientes.

La lógica está en `efectivo()` dentro de `local/local.js` (panel) y se replica en `efectivo()` de `assets/js/db.js`, que es la que usa el comensal al pintar la carta.

Otras reglas del prototipo:
- Si las porciones de un plato llegan a cero, pasa a agotado.
- Una promoción asociada a un plato agotado u oculto deja de mostrarse. Lo mismo ocurre con todas las promociones si el local está cerrado temporalmente.
- El botón «Restablecer datos de prueba» vuelve a los datos de `assets/js/datos-demo.js`.

## Base de datos (SQLite)

```
data/sabormap.sqlite ── server.py ── assets/js/db.js ──┬── vista comensal  (comensal/render.js)
        ↑               (estáticos +     (abre con         └── panel del local (local/local.js)
        │                GET/PUT /api/db)  listo(), persiste
  siembra desde data/semilla.json            en cada cambio)
```

`server.py` crea `data/sabormap.sqlite` la primera vez y la siembra con `data/semilla.json` (generada con `node tools/generar-semilla.js`, misma semilla que usa el navegador sin servidor). Tablas: `locales`, `categorias`, `grupos`, `ingredientes`, `platos`, `promociones`, `resenas`, `comensal`, `guardados`, `preferencias` y `meta`; los campos compuestos (horario, fotos, ingredientes de un plato) van como columnas JSON.

- **API:** `GET /api/db` devuelve el documento completo; `PUT /api/db` lo reemplaza en una transacción.
- **Ambas vistas usan la misma base** (`assets/js/db.js`): el panel del local edita su carta y el comensal la ve al momento — la conexión entre vistas que faltaba en el prototipo puramente estático.
- **Datos sintéticos:** 4 locales (La Trattoria del Sol, Ramen Ya, Café Alameda y Puerto Sabor) con 26 platos, 59 ingredientes, 10 promociones, 5 reseñas y el perfil del comensal (nombre, guardados y preferencias).
- **Persistencia:** cada cambio (carta del panel, guardados con el ícono de marcador, interruptores del perfil) se escribe en SQLite y además se cachea en `localStorage`. Si el prototipo se abre con doble clic o con un servidor estático simple, `db.js` degrada a `localStorage` con la misma semilla y todo sigue funcionando en ese navegador; los datos migrados de versiones anteriores del panel se adoptan al primer arranque.
- Para inspeccionarla: `sqlite3 data/sabormap.sqlite "SELECT id, nombre, cocina FROM locales"`.

## Modelo de datos

El modelo completo, con ejemplos, está en `assets/js/datos-demo.js`:

- **Local:** nombre, descripción, tipo de cocina, rango y precios por persona, dirección, teléfono, web, fotos y portada, horario por día, cierre temporal, servicios y reinicio diario.
- **Categoría** y **grupo de ingredientes:** id y nombre.
- **Ingrediente:** nombre, grupo, disponible.
- **Plato:** nombre, descripción, categoría, precio, foto, ingredientes, etiquetas, estado manual, porciones restantes, hora de regreso, visible.
- **Promoción:** título, tipo (`porcentaje` | `2x1` | `precio` | `menu`), valor, plato asociado (opcional), días, horario o todo el día, fecha de término, condiciones, activa.

## Pendiente para la versión real

- Llevar la base a un backend real multiusuario (la SQLite local es de un solo navegador; ya no es el cuello de botella entre vistas, que comparten estos mismos datos).
- El mapa de Explorar usa el servidor de tiles público de OpenStreetMap, válido solo para demostración; para la versión real conviene un proveedor de tiles propio y coordenadas reales de los locales.
- Reemplazar las fotos de ejemplo, que son de baja resolución.
- Ejecutar el reinicio diario de disponibilidad en el servidor (en el prototipo la opción solo se guarda).
- Agregar autenticación para que cada local administre solo su carta.

Todos los restaurantes, platos, precios y reseñas son ficticios.
