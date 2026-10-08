/* SaborMap · datos de demostración compartidos.
   Describen un local de ejemplo (La Trattoria del Sol) con su carta, ingredientes,
   promociones e información. Es el mismo modelo que deberían usar la vista comensal
   y el panel del local cuando se conecten a un backend.

   Convenciones:
   - Las fotos se guardan como nombre de archivo dentro de assets/img/ o como data URL
     cuando el local sube una foto nueva desde el panel.
   - Los días usan la numeración de JavaScript: 0 = domingo, 1 = lunes … 6 = sábado.
   - Estado manual de un plato: "disponible" | "pocas" | "agotado".
     El estado que ve el comensal es "agotado" si falta cualquiera de sus ingredientes.
*/
(function () {
  'use strict';

  function mananaALas(hora) {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + hora;
  }

  var catalogos = {
    diasSemana: [
      { dia: 1, corto: 'Lun', nombre: 'lunes' },
      { dia: 2, corto: 'Mar', nombre: 'martes' },
      { dia: 3, corto: 'Mié', nombre: 'miércoles' },
      { dia: 4, corto: 'Jue', nombre: 'jueves' },
      { dia: 5, corto: 'Vie', nombre: 'viernes' },
      { dia: 6, corto: 'Sáb', nombre: 'sábado' },
      { dia: 0, corto: 'Dom', nombre: 'domingo' }
    ],
    etiquetas: [
      { id: 'vegetariano', nombre: 'Vegetariano' },
      { id: 'vegano', nombre: 'Vegano' },
      { id: 'sin-gluten', nombre: 'Sin gluten' },
      { id: 'picante', nombre: 'Picante' },
      { id: 'para-compartir', nombre: 'Para compartir' },
      { id: 'contiene-alcohol', nombre: 'Contiene alcohol' }
    ],
    servicios: [
      { id: 'terraza', nombre: 'Terraza' },
      { id: 'mascotas', nombre: 'Admite mascotas' },
      { id: 'vegetariano', nombre: 'Opciones vegetarianas' },
      { id: 'sin-gluten', nombre: 'Opciones sin gluten' },
      { id: 'accesible', nombre: 'Acceso para silla de ruedas' },
      { id: 'estacionamiento', nombre: 'Estacionamiento cercano' },
      { id: 'wifi', nombre: 'Wifi' },
      { id: 'infantil', nombre: 'Menú infantil' }
    ],
    tiposPromocion: [
      { id: 'porcentaje', nombre: 'Descuento (%)' },
      { id: '2x1', nombre: '2x1' },
      { id: 'precio', nombre: 'Precio especial' },
      { id: 'menu', nombre: 'Menú del día' }
    ]
  };

  var datos = {
    version: 1,
    local: {
      id: 'trattoria-del-sol',
      nombre: 'La Trattoria del Sol',
      descripcion: 'Pastas frescas hechas a mano y pizzas a la leña en Barrio Italia.',
      cocina: 'Italiana',
      rangoPrecio: 2,
      precioDesde: 10000,
      precioHasta: 18000,
      direccion: 'Calle Condell 1250, Barrio Italia, Providencia',
      telefono: '+56 2 2345 6789',
      web: 'instagram.com/trattoriadelsol',
      fotos: [
        { id: 'f1', archivo: 'horno.jpg', descripcion: 'Horno de leña' },
        { id: 'f2', archivo: 'ambiente.jpg', descripcion: 'Salón principal' },
        { id: 'f3', archivo: 'rev2.jpg', descripcion: 'Mesa para compartir' }
      ],
      portada: 'f1',
      horario: [
        { dia: 1, abierto: true, desde: '12:30', hasta: '23:00' },
        { dia: 2, abierto: true, desde: '12:30', hasta: '23:00' },
        { dia: 3, abierto: true, desde: '12:30', hasta: '23:00' },
        { dia: 4, abierto: true, desde: '12:30', hasta: '23:00' },
        { dia: 5, abierto: true, desde: '12:30', hasta: '00:30' },
        { dia: 6, abierto: true, desde: '12:30', hasta: '00:30' },
        { dia: 0, abierto: true, desde: '12:30', hasta: '17:00' }
      ],
      cierreTemporal: { activo: false, motivo: '', hasta: '' },
      servicios: ['terraza', 'mascotas', 'vegetariano', 'sin-gluten'],
      reinicioDiario: { activo: true, hora: '12:00' }
    },

    categorias: [
      { id: 'entradas', nombre: 'Entradas' },
      { id: 'pastas', nombre: 'Pastas frescas' },
      { id: 'pizzas', nombre: 'Pizzas' },
      { id: 'principales', nombre: 'Principales' },
      { id: 'postres', nombre: 'Postres' }
    ],

    gruposIngredientes: [
      { id: 'pescados', nombre: 'Pescados y mariscos' },
      { id: 'carnes', nombre: 'Carnes y embutidos' },
      { id: 'lacteos', nombre: 'Lácteos y huevos' },
      { id: 'verduras', nombre: 'Verduras, hierbas y frutas' },
      { id: 'masas', nombre: 'Masas, pastas y granos' },
      { id: 'despensa', nombre: 'Despensa' },
      { id: 'otros', nombre: 'Otros' }
    ],

    ingredientes: [
      { id: 'pescado-blanco', nombre: 'Pescado blanco', grupo: 'pescados', disponible: true },
      { id: 'camarones', nombre: 'Camarones', grupo: 'pescados', disponible: true },
      { id: 'almejas', nombre: 'Almejas', grupo: 'pescados', disponible: true },
      { id: 'carne-vacuno', nombre: 'Carne de vacuno', grupo: 'carnes', disponible: true },
      { id: 'carne-cerdo', nombre: 'Carne de cerdo', grupo: 'carnes', disponible: true },
      { id: 'salame-picante', nombre: 'Salame picante', grupo: 'carnes', disponible: true },
      { id: 'mozzarella-bufala', nombre: 'Mozzarella de búfala', grupo: 'lacteos', disponible: true },
      { id: 'mozzarella-fior', nombre: 'Mozzarella fior di latte', grupo: 'lacteos', disponible: true },
      { id: 'burrata', nombre: 'Burrata', grupo: 'lacteos', disponible: true },
      { id: 'parmesano', nombre: 'Parmesano', grupo: 'lacteos', disponible: true },
      { id: 'mascarpone', nombre: 'Mascarpone', grupo: 'lacteos', disponible: true },
      { id: 'crema', nombre: 'Crema de leche', grupo: 'lacteos', disponible: true },
      { id: 'mantequilla', nombre: 'Mantequilla', grupo: 'lacteos', disponible: true },
      { id: 'leche', nombre: 'Leche', grupo: 'lacteos', disponible: true },
      { id: 'huevo', nombre: 'Huevo', grupo: 'lacteos', disponible: true },
      { id: 'tomate', nombre: 'Tomate fresco', grupo: 'verduras', disponible: true },
      { id: 'albahaca', nombre: 'Albahaca', grupo: 'verduras', disponible: true },
      { id: 'rucula', nombre: 'Rúcula', grupo: 'verduras', disponible: true },
      { id: 'limon', nombre: 'Limón', grupo: 'verduras', disponible: true },
      { id: 'ajo', nombre: 'Ajo', grupo: 'verduras', disponible: true },
      { id: 'perejil', nombre: 'Perejil', grupo: 'verduras', disponible: true },
      { id: 'frutos-rojos', nombre: 'Frutos rojos', grupo: 'verduras', disponible: false },
      { id: 'masa-pizza', nombre: 'Masa madre para pizza', grupo: 'masas', disponible: true },
      { id: 'pan-masa-madre', nombre: 'Pan de masa madre', grupo: 'masas', disponible: true },
      { id: 'pasta-fresca', nombre: 'Pasta fresca al huevo', grupo: 'masas', disponible: true },
      { id: 'arroz-arborio', nombre: 'Arroz arborio', grupo: 'masas', disponible: true },
      { id: 'bizcochos', nombre: 'Bizcochos de soletilla', grupo: 'masas', disponible: true },
      { id: 'salsa-tomate', nombre: 'Salsa de tomate San Marzano', grupo: 'despensa', disponible: true },
      { id: 'aceite-oliva', nombre: 'Aceite de oliva', grupo: 'despensa', disponible: true },
      { id: 'alcaparras', nombre: 'Alcaparras', grupo: 'despensa', disponible: true },
      { id: 'pinones', nombre: 'Piñones', grupo: 'despensa', disponible: true },
      { id: 'trufa-negra', nombre: 'Trufa negra', grupo: 'despensa', disponible: true },
      { id: 'cafe', nombre: 'Café espresso', grupo: 'despensa', disponible: true },
      { id: 'cacao', nombre: 'Cacao', grupo: 'despensa', disponible: true },
      { id: 'azucar', nombre: 'Azúcar', grupo: 'despensa', disponible: true }
    ],

    platos: [
      { id: 'carpaccio-pescado', nombre: 'Carpaccio de pescado blanco', categoria: 'entradas', precio: 8900, foto: 'ceviche.jpg',
        descripcion: 'Láminas finas de pescado fresco con limón, alcaparras, rúcula y aceite de oliva.',
        ingredientes: ['pescado-blanco', 'limon', 'alcaparras', 'rucula', 'aceite-oliva'], etiquetas: ['sin-gluten'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'bruschetta', nombre: 'Bruschetta clásica', categoria: 'entradas', precio: 5900, foto: '',
        descripcion: 'Pan de masa madre tostado con tomate, ajo, albahaca y aceite de oliva.',
        ingredientes: ['pan-masa-madre', 'tomate', 'ajo', 'albahaca', 'aceite-oliva'], etiquetas: ['vegano'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'fettuccine-pesto', nombre: 'Fettuccine al pesto con burrata', categoria: 'pastas', precio: 11900, foto: 'fettuccine.jpg',
        descripcion: 'Pasta fresca al huevo, pesto de albahaca, piñones tostados y una burrata cremosa entera.',
        ingredientes: ['pasta-fresca', 'albahaca', 'pinones', 'parmesano', 'burrata', 'aceite-oliva'], etiquetas: ['vegetariano'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'fettuccine-tartufo', nombre: 'Fettuccine al tartufo', categoria: 'pastas', precio: 14500, foto: 'trattoria.jpg',
        descripcion: 'Fettuccine en mantequilla, parmesano y láminas de trufa negra.',
        ingredientes: ['pasta-fresca', 'trufa-negra', 'parmesano', 'mantequilla'], etiquetas: ['vegetariano'],
        estado: 'pocas', porciones: 3, vuelve: '', visible: true },
      { id: 'lasana', nombre: 'Lasaña boloñesa de 8 capas', categoria: 'pastas', precio: 12400, foto: 'rev2.jpg',
        descripcion: 'Pasta casera, ragú de vacuno y cerdo, bechamel suave y parmesano gratinado.',
        ingredientes: ['pasta-fresca', 'carne-vacuno', 'carne-cerdo', 'salsa-tomate', 'leche', 'mantequilla', 'parmesano'], etiquetas: ['para-compartir'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'ravioles-mar', nombre: 'Ravioles de pescado y camarones', categoria: 'pastas', precio: 13900, foto: '',
        descripcion: 'Ravioles rellenos de pescado blanco y camarones en salsa de crema y ajo.',
        ingredientes: ['pasta-fresca', 'pescado-blanco', 'camarones', 'crema', 'ajo'], etiquetas: [],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'margherita', nombre: 'Pizza Margherita D.O.P.', categoria: 'pizzas', precio: 11990, foto: 'margherita.jpg',
        descripcion: 'Masa madre de 48 horas, tomate San Marzano, mozzarella de búfala y albahaca.',
        ingredientes: ['masa-pizza', 'salsa-tomate', 'mozzarella-bufala', 'albahaca', 'aceite-oliva'], etiquetas: ['vegetariano'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'diavola', nombre: 'Pizza Diavola Piccante', categoria: 'pizzas', precio: 12500, foto: 'diavola.jpg',
        descripcion: 'Salsa pomodoro, mozzarella fior di latte, salame picante y peperoncino.',
        ingredientes: ['masa-pizza', 'salsa-tomate', 'mozzarella-fior', 'salame-picante'], etiquetas: ['picante'],
        estado: 'pocas', porciones: 4, vuelve: '', visible: true },
      { id: 'margherita-trufada', nombre: 'Pizza Margherita trufada', categoria: 'pizzas', precio: 13900, foto: 'brunapoli.jpg',
        descripcion: 'Masa madre de 48 horas, tomate San Marzano, mozzarella de búfala y trufa negra.',
        ingredientes: ['masa-pizza', 'salsa-tomate', 'mozzarella-bufala', 'trufa-negra'], etiquetas: ['vegetariano'],
        estado: 'agotado', porciones: null, vuelve: mananaALas('13:00'), visible: true },
      { id: 'frutti-di-mare', nombre: 'Pizza frutti di mare', categoria: 'pizzas', precio: 14900, foto: '',
        descripcion: 'Salsa de tomate, camarones, almejas, ajo y perejil fresco.',
        ingredientes: ['masa-pizza', 'salsa-tomate', 'camarones', 'almejas', 'ajo', 'perejil'], etiquetas: [],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'pescado-dia', nombre: 'Pescado del día con risotto al limón', categoria: 'principales', precio: 15900, foto: '',
        descripcion: 'Pescado blanco a la plancha sobre risotto cremoso de limón y parmesano.',
        ingredientes: ['pescado-blanco', 'arroz-arborio', 'limon', 'mantequilla', 'parmesano'], etiquetas: ['sin-gluten'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'tiramisu', nombre: 'Tiramisú clásico', categoria: 'postres', precio: 5900, foto: 'tiramisu.jpg',
        descripcion: 'Bizcochos empapados en espresso, crema de mascarpone y cacao puro.',
        ingredientes: ['mascarpone', 'cafe', 'bizcochos', 'cacao', 'huevo', 'azucar'], etiquetas: ['contiene-alcohol'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true },
      { id: 'panna-cotta', nombre: 'Panna cotta de frutos rojos', categoria: 'postres', precio: 5500, foto: '',
        descripcion: 'Crema cocida suave con coulis de frutos rojos de temporada.',
        ingredientes: ['crema', 'frutos-rojos', 'azucar'], etiquetas: ['vegetariano', 'sin-gluten'],
        estado: 'disponible', porciones: null, vuelve: '', visible: true }
    ],

    promociones: [
      { id: 'promo-diavola', titulo: '20% en Pizza Diavola', tipo: 'porcentaje', valor: 20, platoId: 'diavola',
        dias: [1, 2, 3, 4, 5, 6, 0], todoElDia: true, desde: '', hasta: '', finaliza: '',
        condiciones: 'Válido para consumo en el local.', activa: true },
      { id: 'promo-margherita', titulo: '25% en Pizza Margherita D.O.P.', tipo: 'porcentaje', valor: 25, platoId: 'margherita',
        dias: [1, 2, 3, 4, 5], todoElDia: false, desde: '12:30', hasta: '16:00', finaliza: '',
        condiciones: '', activa: true },
      { id: 'promo-aperitivos', titulo: '2x1 en aperitivos de la casa', tipo: '2x1', valor: null, platoId: null,
        dias: [1, 2, 3, 4, 5, 6, 0], todoElDia: false, desde: '17:00', hasta: '20:00', finaliza: '',
        condiciones: 'Válido en la terraza exterior.', activa: true },
      { id: 'promo-segunda-pizza', titulo: '25% en la segunda pizza', tipo: 'porcentaje', valor: 25, platoId: null,
        dias: [1, 2, 3, 4], todoElDia: true, desde: '', hasta: '', finaliza: '',
        condiciones: 'El descuento se aplica a la pizza de menor precio.', activa: true },
      { id: 'promo-menu', titulo: 'Menú de almuerzo con bebida', tipo: 'menu', valor: 9900, platoId: null,
        dias: [1, 2, 3, 4, 5], todoElDia: false, desde: '12:30', hasta: '15:30', finaliza: '',
        condiciones: 'Incluye entrada del día, pasta a elección y bebida.', activa: false }
    ]
  };

  window.SaborMapDemo = { catalogos: catalogos, datos: datos };
})();
