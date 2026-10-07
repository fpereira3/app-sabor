# SaborMap · prototipo navegable

Prototipo de una app para descubrir restaurantes cercanos, consultar sus menús, ver la disponibilidad de cada plato en tiempo real y conocer las promociones del día.

Es la fusión de dos prototipos de Stitch ("restaurant availability map guide" y "santiago food finder app"), con el sistema visual **Terracotta Epicure** del primero.

> **Alcance del producto:** la app es solo informativa. No hay compras, pedidos, carrito ni reservas. Las promociones se aplican directamente en cada restaurante.

## Cómo verlo

No necesita instalación ni compilación: son archivos HTML estáticos.

```bash
cd sabormap-prototipo
python3 -m http.server 8000
```

Luego abre <http://localhost:8000> en el navegador. Para verlo como en un teléfono, usa el modo de diseño adaptable de las herramientas de desarrollo (F12 y luego Ctrl+Shift+M en Firefox o Chrome).

## Pantallas

| Archivo | Pantalla | Viene de |
|---|---|---|
| `index.html` | Bienvenida y permiso de ubicación | Santiago food finder |
| `explorar.html` | Mapa, restaurante seleccionado, promociones y lista cercana | Ambos |
| `platos.html` | Buscador por disponibilidad con semáforo en vivo | Availability map guide |
| `restaurante.html` | Ficha del restaurante, carta en vivo, promociones e información | Ambos |
| `plato.html` | Detalle del plato | Santiago food finder |
| `promociones.html` | Promociones cercanas | Santiago food finder |
| `resenas.html` | Reseñas y fotos | Availability map guide |

Flujo principal: `index` → `explorar` → `restaurante` → `plato`. La barra inferior lleva a Platos y Promos. Guardados y Perfil todavía no tienen pantalla.

## Estructura

```
sabormap-prototipo/
├── index.html y demás pantallas
├── assets/
│   ├── base.css        estructura de la columna móvil y barras fijas
│   ├── logo.svg
│   └── img/            fotos (recortes de las capturas de Stitch)
└── design/
    ├── tokens.json     colores, estados de disponibilidad, tipografía, radios, sombras
    ├── tokens.css      los mismos tokens como variables CSS (--sm-*)
    └── DESIGN.md       guía original del sistema Terracotta Epicure
```

## Notas para la implementación

- **Estilos en línea:** cada pantalla tiene sus estilos dentro del HTML porque vienen del lienzo de diseño. Sirven como referencia visual exacta, pero para la app real conviene convertirlos en componentes y usar `design/tokens.*`.
- **Fotos:** son de baja resolución y solo sirven de referencia. Hay que reemplazarlas por fotos reales de cada restaurante.
- **Mapa:** es una ilustración en SVG. En la app real se reemplaza por un mapa interactivo (MapLibre, Leaflet, Google Maps o Mapbox) con marcadores personalizados.
- **Datos:** todos los restaurantes, platos, precios y reseñas son ficticios.

### Componentes reutilizables

Barra superior con ubicación, buscador, chips de filtro, pastilla de estado (semáforo), tarjeta de restaurante, tarjeta de plato, tarjeta de promoción, fila de la carta, tarjeta de reseña, barra inferior de navegación y marcador del mapa.

### Modelo de datos sugerido

- **Restaurante:** nombre, barrio, dirección, coordenadas, tipo de cocina, rango de precio, horario, valoración, fotos.
- **Plato:** restaurante, nombre, descripción, categoría, precio, etiquetas (vegetariano, picante, sin gluten, alérgenos), foto.
- **Disponibilidad:** plato, estado (`disponible` | `pocas` | `agotado` | `sin_info`), porciones restantes (opcional), fecha de actualización, vuelve a estar disponible (opcional).
- **Promoción:** restaurante, plato (opcional), tipo (porcentaje, 2x1, menú), precio promocional, vigencia, condiciones.
- **Reseña:** restaurante, autor, puntuación, texto, fotos, platos mencionados con su estado, si el semáforo fue preciso.
