/* SaborMap · base de datos del prototipo.
   Una sola fuente de datos para las dos vistas (comensal y panel del
   local). Cuando el prototipo se sirve con server.py, la fuente de
   verdad es SQLite (data/sabormap.sqlite) a través de la API JSON
   (GET/PUT /api/db); este módulo la carga al abrir y la persiste en
   cada cambio. Sin servidor (file:// o un servidor estático simple),
   degrada a localStorage de este navegador, con la misma semilla.

   Estructura (versión 2):
   {
     version, activo,
     locales: [ { id, version, local, categorias, gruposIngredientes,
                  ingredientes, platos, promociones, resenas,
                  comensal: { distancia, barrio, valoracion, resenasTotal,
                              foto, glifo, dLat, dLon } } ],
     comensal: { nombre, desde, ciudad, guardados: [ids],
                 preferencias: { avisosPlato, avisosPromos, avisosCartas,
                                 ocultarAgotados, soloAbiertos },
                 resenasEscritas, platosProbados }
   }

   El slice de cada local (local, categorias, gruposIngredientes,
   ingredientes, platos, promociones) usa la misma forma que
   assets/js/datos-demo.js, para que el panel del local trabaje sobre
   ella sin cambios. Requiere datos-demo.js cargado antes (semilla de
   La Trattoria del Sol) y adopta los datos que el panel haya guardado
   con versiones anteriores. */
(function () {
  'use strict';

  var CLAVE = 'sabormap.db.v2';
  var CLAVE_PANEL_VIEJA = 'sabormap.local.v1';
  var VERSION = 2;

  function clonar(o) { return JSON.parse(JSON.stringify(o)); }

  /* ================= Semilla sintética ================= */

  function horario(desde, hasta, cierre) {
    return [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      return { dia: d, abierto: d !== 0 || !cierre, desde: desde, hasta: hasta };
    });
  }

  function ramenYa() {
    return {
      id: 'ramen-ya', version: 1,
      local: {
        id: 'ramen-ya', nombre: 'Ramen Ya',
        descripcion: 'Ramen de caldos largos y cocina nikkei en Bellas Artes.',
        cocina: 'Ramen y nikkei', rangoPrecio: 2, precioDesde: 8000, precioHasta: 14000,
        direccion: 'José Miguel de la Barra 407, Bellas Artes, Santiago',
        telefono: '+56 2 2478 9012', web: 'instagram.com/ramenya.cl',
        fotos: [{ id: 'f1', archivo: 'ramen.jpg', descripcion: 'Ramen tonkotsu' }, { id: 'f2', archivo: 'kintaro.jpg', descripcion: 'Mesa con ramen' }],
        portada: 'f1',
        horario: horario('12:00', '22:30'),
        cierreTemporal: { activo: false, motivo: '', hasta: '' },
        servicios: ['wifi', 'accesible'],
        reinicioDiario: { activo: true, hora: '11:30' }
      },
      categorias: [
        { id: 'ramenes', nombre: 'Ramenes' },
        { id: 'entradas', nombre: 'Entradas' },
        { id: 'postres', nombre: 'Postres' }
      ],
      gruposIngredientes: [
        { id: 'masas', nombre: 'Masas, pastas y granos' },
        { id: 'carnes', nombre: 'Carnes' },
        { id: 'verduras', nombre: 'Verduras y hierbas' },
        { id: 'despensa', nombre: 'Despensa' }
      ],
      ingredientes: [
        { id: 'caldo-tonkotsu', nombre: 'Caldo tonkotsu', grupo: 'despensa', disponible: true },
        { id: 'noodles', nombre: 'Noodles frescos', grupo: 'masas', disponible: true },
        { id: 'chashu', nombre: 'Cerdo chashu', grupo: 'carnes', disponible: true },
        { id: 'huevo-mar', nombre: 'Huevo marinado', grupo: 'despensa', disponible: true },
        { id: 'nori', nombre: 'Nori', grupo: 'despensa', disponible: true },
        { id: 'cebollin', nombre: 'Cebollín', grupo: 'verduras', disponible: true },
        { id: 'miso', nombre: 'Miso', grupo: 'despensa', disponible: true },
        { id: 'hongos', nombre: 'Hongos', grupo: 'verduras', disponible: false }
      ],
      platos: [
        { id: 'ramen-tonkotsu', nombre: 'Ramen tonkotsu especial', categoria: 'ramenes', precio: 10900, foto: 'ramen.jpg', valoracion: 4.9,
          descripcion: 'Caldo de 18 horas, chashu, huevo marinado, nori y cebollín.',
          ingredientes: ['caldo-tonkotsu', 'noodles', 'chashu', 'huevo-mar', 'nori', 'cebollin'], etiquetas: [],
          estado: 'disponible', porciones: null, vuelve: '', visible: true },
        { id: 'ramen-miso', nombre: 'Ramen miso picante', categoria: 'ramenes', precio: 11500, foto: 'kintaro.jpg', valoracion: 4.8,
          descripcion: 'Miso con aceite de chile, maíz dulce y cerdo crispy.',
          ingredientes: ['caldo-tonkotsu', 'noodles', 'chashu', 'miso', 'cebollin'], etiquetas: ['picante'],
          estado: 'pocas', porciones: 3, vuelve: '', visible: true },
        { id: 'gyoza-cerdo', nombre: 'Gyoza de cerdo (6 un.)', categoria: 'entradas', precio: 6900, foto: '', valoracion: 4.7,
          descripcion: 'Dumplings sellados a la planza con salsa ponzu.',
          ingredientes: ['chashu', 'cebollin'], etiquetas: [],
          estado: 'disponible', porciones: null, vuelve: '', visible: true },
        { id: 'karaage-don', nombre: 'Karaage don', categoria: 'ramenes', precio: 9800, foto: '', valoracion: 4.6,
          descripcion: 'Pollo fijo marinado sobre arroz con mayonesa de jengibre.',
          ingredientes: ['noodles', 'cebollin', 'huevo-mar'], etiquetas: [],
          estado: 'disponible', porciones: null, vuelve: '', visible: true },
        { id: 'ramen-vegano', nombre: 'Ramen vegano de hongos', categoria: 'ramenes', precio: 10400, foto: '', valoracion: 4.5,
          descripcion: 'Caldo de hongos shiitake, miso y verduras asadas.',
          ingredientes: ['hongos', 'noodles', 'miso', 'cebollin'], etiquetas: ['vegano'],
          estado: 'agotado', porciones: null, vuelve: '', visible: true }
      ],
      promociones: [
        { id: 'promo-gyoza', titulo: '2x1 en gyozas al almuerzo', tipo: '2x1', valor: null, platoId: 'gyoza-cerdo',
          dias: [1, 2, 3, 4, 5], todoElDia: false, desde: '12:00', hasta: '15:00', finaliza: '',
          condiciones: 'Solo en sala.', activa: true },
        { id: 'promo-menu-ramen', titulo: 'Menú ramen + gyoza', tipo: 'menu', valor: 12900, platoId: null,
          dias: [1, 2, 3, 4, 5], todoElDia: false, desde: '12:00', hasta: '15:30', finaliza: '',
          condiciones: 'Incluye ramen a elección, gyozas y bebida.', activa: true }
      ],
      resenas: [
        { id: 'ry-1', autor: 'Daniel F.', rating: 5, fecha: 'Hace 3 días', verificada: true,
          platos: [{ texto: 'Ramen tonkotsu · disponible', estado: 'disponible' }],
          texto: 'El caldo es serio business. Llegamos temprano y no hubo espera.', fotos: [] }
      ],
      comensal: { distancia: 800, barrio: 'Bellas Artes', valoracion: 4.7, resenasTotal: 410,
        foto: 'kintaro.jpg', fotoAlt: 'Ramen tonkotsu sobre mesa de madera', glifo: 'bol', dLat: 0.0033, dLon: -0.01 }
    };
  }

  function cafeAlameda() {
    return {
      id: 'cafe-alameda', version: 1,
      local: {
        id: 'cafe-alameda', nombre: 'Café Alameda',
        descripcion: 'Desayunos, brunch y café de especialidad en Lastarria.',
        cocina: 'Desayunos y café', rangoPrecio: 2, precioDesde: 5000, precioHasta: 9000,
        direccion: 'Merced 380, Lastarria, Santiago',
        telefono: '+56 2 2639 4455', web: 'cafealameda.cl',
        fotos: [{ id: 'f1', archivo: 'brunch.jpg', descripcion: 'Brunch con café' }],
        portada: 'f1',
        horario: horario('08:00', '20:00'),
        cierreTemporal: { activo: false, motivo: '', hasta: '' },
        servicios: ['wifi', 'vegetariano', 'infantil'],
        reinicioDiario: { activo: true, hora: '08:00' }
      },
      categorias: [
        { id: 'desayunos', nombre: 'Desayunos' },
        { id: 'sandwiches', nombre: 'Sándwiches' },
        { id: 'bebidas', nombre: 'Bebidas' }
      ],
      gruposIngredientes: [
        { id: 'despensa', nombre: 'Despensa' },
        { id: 'lacteos', nombre: 'Lácteos y huevos' },
        { id: 'verduras', nombre: 'Verduras y frutas' },
        { id: 'masas', nombre: 'Masas y panes' }
      ],
      ingredientes: [
        { id: 'cafe', nombre: 'Café de grano', grupo: 'despensa', disponible: true },
        { id: 'leche', nombre: 'Leche', grupo: 'lacteos', disponible: true },
        { id: 'leche-avena', nombre: 'Leche de avena', grupo: 'lacteos', disponible: true },
        { id: 'huevo', nombre: 'Huevo', grupo: 'lacteos', disponible: true },
        { id: 'palta', nombre: 'Palta', grupo: 'verduras', disponible: true },
        { id: 'pan-masa', nombre: 'Pan de masa madre', grupo: 'masas', disponible: true },
        { id: 'queso-crema', nombre: 'Queso crema', grupo: 'lacteos', disponible: true },
        { id: 'tomate-cafe', nombre: 'Tomate', grupo: 'verduras', disponible: true }
      ],
      platos: [
        { id: 'brunch-grano', nombre: 'Brunch + café de grano', categoria: 'desayunos', precio: 8500, foto: 'brunch.jpg', valoracion: 4.9,
          descripcion: 'Huevos, pan de masa madre, palta y café de grano incluido.',
          ingredientes: ['huevo', 'pan-masa', 'palta', 'cafe'], etiquetas: ['vegetariano'],
          estado: 'disponible', porciones: null, vuelve: '', visible: true },
        { id: 'avocado-toast', nombre: 'Avocado toast', categoria: 'desayunos', precio: 7200, foto: '', valoracion: 4.8,
          descripcion: 'Pan de masa madre, palta molida, huevo poché y tomate.',
          ingredientes: ['pan-masa', 'palta', 'huevo', 'tomate-cafe'], etiquetas: ['vegetariano'],
          estado: 'disponible', porciones: null, vuelve: '', visible: true },
        { id: 'croissant', nombre: 'Croissant de mantequilla', categoria: 'sandwiches', precio: 3200, foto: '', valoracion: 4.7,
          descripcion: 'Hojaldre francés de fermentación lenta.',
          ingredientes: ['pan-masa'], etiquetas: [],
          estado: 'pocas', porciones: 5, vuelve: '', visible: true },
        { id: 'flat-white', nombre: 'Flat white', categoria: 'bebidas', precio: 3800, foto: '', valoracion: 4.9,
          descripcion: 'Doble espresso con leche microespumada (o avena).',
          ingredientes: ['cafe', 'leche'], etiquetas: [],
          estado: 'disponible', porciones: null, vuelve: '', visible: true }
      ],
      promociones: [
        { id: 'promo-desayuno', titulo: '20% en brunch antes de las 11:00', tipo: 'porcentaje', valor: 20, platoId: 'brunch-grano',
          dias: [1, 2, 3, 4, 5, 6, 0], todoElDia: false, desde: '08:00', hasta: '11:00', finaliza: '',
          condiciones: '', activa: true },
        { id: 'promo-menu-almuerzo', titulo: 'Menú de almuerzo con bebida', tipo: 'menu', valor: 7900, platoId: null,
          dias: [1, 2, 3, 4, 5], todoElDia: false, desde: '12:30', hasta: '15:30', finaliza: '',
          condiciones: 'Incluye sándwich del día, ensalada y bebida.', activa: true }
      ],
      resenas: [
        { id: 'ca-1', autor: 'Josefa T.', rating: 5, fecha: 'Hace 5 días', verificada: true,
          platos: [{ texto: 'Brunch + café · estaba disponible', estado: 'disponible' }],
          texto: 'El flat white es de los mejores de Santiago. Terraza tranquila para trabajar.', fotos: [] }
      ],
      comensal: { distancia: 650, barrio: 'Lastarria', valoracion: 4.9, resenasTotal: 512,
        foto: 'brunch.jpg', fotoAlt: 'Brunch con café de grano', glifo: 'copa', dLat: 0.0049, dLon: -0.0066 }
    };
  }

  function puertoSabor() {
    return {
      id: 'puerto-sabor', version: 1,
      local: {
        id: 'puerto-sabor', nombre: 'Puerto Sabor',
        descripcion: 'Ceviches y pescados frescos junto al Mercado Central.',
        cocina: 'Cevichería', rangoPrecio: 2, precioDesde: 9000, precioHasta: 16000,
        direccion: 'San Pablo 1600, Mercado Central, Santiago',
        telefono: '+56 2 2671 0033', web: '',
        fotos: [{ id: 'f1', archivo: 'ceviche.jpg', descripcion: 'Ceviche mixto' }],
        portada: 'f1',
        horario: horario('11:00', '19:00', true),
        cierreTemporal: { activo: false, motivo: '', hasta: '' },
        servicios: ['accesible'],
        reinicioDiario: { activo: true, hora: '10:30' }
      },
      categorias: [
        { id: 'ceviches', nombre: 'Ceviches' },
        { id: 'fondos', nombre: 'Fondos' },
        { id: 'bebidas', nombre: 'Bebidas' }
      ],
      gruposIngredientes: [
        { id: 'pescados', nombre: 'Pescados y mariscos' },
        { id: 'verduras', nombre: 'Verduras y hierbas' }
      ],
      ingredientes: [
        { id: 'pescado-del-dia', nombre: 'Pescado del día', grupo: 'pescados', disponible: true },
        { id: 'camarones-puerto', nombre: 'Camarones', grupo: 'pescados', disponible: true },
        { id: 'almejas-puerto', nombre: 'Almejas', grupo: 'pescados', disponible: true },
        { id: 'leche-tigre', nombre: 'Leche de tigre', grupo: 'verduras', disponible: true },
        { id: 'camote', nombre: 'Camote', grupo: 'verduras', disponible: true },
        { id: 'choclo', nombre: 'Choclo', grupo: 'verduras', disponible: true },
        { id: 'cilantro', nombre: 'Cilantro', grupo: 'verduras', disponible: true },
        { id: 'limon-puerto', nombre: 'Limón', grupo: 'verduras', disponible: true }
      ],
      platos: [
        { id: 'ceviche-mixto', nombre: 'Ceviche mixto clásico', categoria: 'ceviches', precio: 12400, foto: 'ceviche.jpg', valoracion: 4.8,
          descripcion: 'Pescado del día, camarones y almejas en leche de tigre.',
          ingredientes: ['pescado-del-dia', 'camarones-puerto', 'almejas-puerto', 'leche-tigre', 'camote', 'choclo', 'cilantro'], etiquetas: [],
          estado: 'disponible', porciones: null, vuelve: '', visible: true },
        { id: 'ceviche-camarones', nombre: 'Ceviche de camarones', categoria: 'ceviches', precio: 13900, foto: '', valoracion: 4.7,
          descripcion: 'Camarones cocidos, palta y choclo tostado.',
          ingredientes: ['camarones-puerto', 'leche-tigre', 'choclo', 'cilantro'], etiquetas: [],
          estado: 'disponible', porciones: null, vuelve: '', visible: true },
        { id: 'pescado-plancha', nombre: 'Pescado del día a la plancha', categoria: 'fondos', precio: 14900, foto: '', valoracion: 4.6,
          descripcion: 'Con puré rústico y ensalada de la casa.',
          ingredientes: ['pescado-del-dia', 'camote', 'limon-puerto'], etiquetas: [],
          estado: 'pocas', porciones: 2, vuelve: '', visible: true },
        { id: 'leche-tigre-copa', nombre: 'Leche de tigre', categoria: 'ceviches', precio: 5500, foto: '', valoracion: 4.5,
          descripcion: 'Copa de leche de tigre con camarones y cilantro.',
          ingredientes: ['leche-tigre', 'camarones-puerto', 'cilantro', 'limon-puerto'], etiquetas: ['picante'],
          estado: 'disponible', porciones: null, vuelve: '', visible: true }
      ],
      promociones: [
        { id: 'promo-tarde', titulo: '10% en ceviches después de las 17:00', tipo: 'porcentaje', valor: 10, platoId: null,
          dias: [2, 3, 4, 5, 6], todoElDia: false, desde: '17:00', hasta: '19:00', finaliza: '',
          condiciones: 'Sujeto a disponibilidad de pesca.', activa: true }
      ],
      resenas: [],
      comensal: { distancia: 1100, barrio: 'Mercado Central', valoracion: 4.6, resenasTotal: 189,
        foto: 'ceviche.jpg', fotoAlt: 'Ceviche mixto clásico', glifo: 'pescado', dLat: 0.0075, dLon: -0.0165 }
    };
  }

  function sembrar() {
    var d = {
      version: VERSION,
      activo: 'trattoria-del-sol',
      locales: [],
      comensal: {
        nombre: 'Valentina Rojas',
        desde: 'marzo de 2024',
        ciudad: 'Santiago Centro',
        guardados: ['trattoria-del-sol', 'cafe-alameda'],
        preferencias: { avisosPlato: true, avisosPromos: true, avisosCartas: false, ocultarAgotados: true, soloAbiertos: false },
        resenasEscritas: 8,
        platosProbados: 46
      }
    };

    /* La Trattoria del Sol: los mismos datos de prueba del panel. */
    var demo = window.SaborMapDemo;
    var base = demo ? clonar(demo.datos) : null;
    var trattoria = {
      id: 'trattoria-del-sol',
      version: base ? base.version : 1,
      local: base ? base.local : null,
      categorias: base ? base.categorias : [],
      gruposIngredientes: base ? base.gruposIngredientes : [],
      ingredientes: base ? base.ingredientes : [],
      platos: base ? base.platos : [],
      promociones: base ? base.promociones : [],
      resenas: [
        { id: 'tt-1', autor: 'Camila R.', rating: 5, fecha: 'Hace 2 días', verificada: true,
          platos: [{ texto: 'Fettuccine con burrata · estaba disponible', estado: 'disponible' }],
          texto: 'Me encanta que la app avise si un plato está agotado antes de ir. Fuimos por el fettuccine con burrata y estaba disponible, tal como marcaba el semáforo.',
          fotos: [{ archivo: 'rev1.jpg', alt: 'Fettuccine con burrata' }, { archivo: 'rev2.jpg', alt: 'Mesa con lasaña y copas de vino' }] },
        { id: 'tt-2', autor: 'Mateo Valenzuela', rating: 4, fecha: 'Hace 1 semana', verificada: true,
          platos: [{ texto: 'Pizza trufada · agotada', estado: 'agotado' }, { texto: 'Lasaña · disponible', estado: 'disponible' }],
          texto: 'Queríamos la pizza trufada, pero aparecía en rojo y efectivamente no quedaba. Probamos la lasaña, que estaba en verde, y fue excelente.',
          fotos: [] },
        { id: 'tt-3', autor: 'Sofía Mendoza', rating: 5, fecha: 'Hace 2 semanas', verificada: true,
          platos: [{ texto: 'Terraza', estado: 'sin-info' }],
          texto: 'La terraza es ideal para cenar. Atención impecable y buen ritmo entre platos. Volveremos el fin de semana.',
          fotos: [] }
      ],
      comensal: { distancia: 350, barrio: 'Barrio Italia', valoracion: 4.8, resenasTotal: 342,
        foto: 'brunapoli.jpg', fotoAlt: 'Plato de La Trattoria del Sol', glifo: 'pizza', dLat: 0.0021, dLon: 0.0065 }
    };
    d.locales.push(trattoria, ramenYa(), cafeAlameda(), puertoSabor());
    return d;
  }

  /* ================= Apertura y persistencia ================= */

  /* Estados: null (sin abrir), 'servidor' (SQLite vía API) o
     'local' (reserva en localStorage). */
  var db = null;
  var modo = null;
  var promesaListo = null;

  /** Resuelve cuando la base está abierta (servidor o reserva local). */
  function listo() {
    if (!promesaListo) promesaListo = abrirAsync();
    return promesaListo;
  }

  function abrirAsync() {
    return fetch('/api/db', { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('sin api');
        return r.json();
      })
      .then(function (doc) {
        if (doc && doc.version === VERSION && doc.locales && doc.locales.length) {
          db = doc;
          modo = 'servidor';
          adoptarPanelViejo();
          return;
        }
        /* Base vacía: se siembra y se sube al servidor. */
        db = sembrar();
        modo = 'servidor';
        return persistirRemoto().then(function (subido) {
          if (!subido) aLocal();
        });
      })
      .catch(aLocal);
  }

  /** Reserva local: cache de localStorage o semilla en memoria. */
  function aLocal() {
    modo = 'local';
    try {
      var crudo = localStorage.getItem(CLAVE);
      if (crudo) {
        var leido = JSON.parse(crudo);
        if (leido && leido.version === VERSION && leido.locales && leido.locales.length) {
          db = leido;
          return;
        }
      }
    } catch (e) { /* sin almacenamiento disponible */ }
    db = sembrar();
    cacheLocal();
  }

  /** Adopta los cambios del panel guardados con la storage antigua. */
  function adoptarPanelViejo() {
    try {
      var viejo = localStorage.getItem(CLAVE_PANEL_VIEJA);
      if (!viejo) return;
      var v = JSON.parse(viejo);
      if (!v || !v.local || !v._actualizado) return;
      var t = localPorId(db, 'trattoria-del-sol');
      if (t && t._actualizado && t._actualizado >= v._actualizado) return;
      if (t) {
        t.version = v.version || t.version;
        t.local = v.local;
        t.categorias = v.categorias || t.categorias;
        t.gruposIngredientes = v.gruposIngredientes || t.gruposIngredientes;
        t.ingredientes = v.ingredientes || t.ingredientes;
        t.platos = v.platos || t.platos;
        t.promociones = v.promociones || t.promociones;
        t._actualizado = v._actualizado;
      }
      localStorage.removeItem(CLAVE_PANEL_VIEJA);
      persistir();
    } catch (e) { /* si no se puede migrar, se usa lo que haya */ }
  }

  function cacheLocal() {
    try { localStorage.setItem(CLAVE, JSON.stringify(db)); return true; }
    catch (e) { return false; }
  }

  /** Persiste la base: cache local siempre y, si hay servidor, PUT. */
  function persistir() {
    var ok = cacheLocal();
    if (modo === 'servidor') persistirRemoto();
    return ok;
  }

  function persistirRemoto() {
    return fetch('/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db)
    }).then(function (r) { return r.ok; })
      .catch(function () { return false; });
  }

  function reabrir(doc) {
    if (!doc || doc.version !== VERSION) return false;
    db = doc;
    return persistir();
  }

  /* ================= Consultas ================= */


  function localPorId(raiz, id) {
    for (var i = 0; i < raiz.locales.length; i++) {
      if (raiz.locales[i].id === id) return raiz.locales[i];
    }
    return null;
  }

  /* Las consultas son síncronas sobre la base abierta. Quien no haya
     esperado listo() obtiene la semilla en memoria (sin persistencia
     posterior hasta abrir de verdad). */
  function abierta() {
    if (!db) { db = sembrar(); modo = 'local'; }
    return db;
  }
  function datos() { return abierta(); }
  function locales() { return abierta().locales; }
  function local(id) { return localPorId(abierta(), id || db.activo); }
  function localActivo() { return localPorId(abierta(), db.activo); }
  function comensal() { return abierta().comensal; }
  function resenas(id) { return local(id).resenas || []; }

  /** Estado que ve el comensal: agotado si falta un ingrediente o si
      las porciones llegaron a cero; si no, el estado manual del plato. */
  function efectivo(plato, ingredientes) {
    var mapa = {};
    for (var i = 0; i < ingredientes.length; i++) mapa[ingredientes[i].id] = ingredientes[i];
    var faltan = (plato.ingredientes || []).filter(function (idIng) {
      return mapa[idIng] && !mapa[idIng].disponible;
    });
    if (faltan.length) return 'agotado';
    if (plato.estado === 'agotado') return 'agotado';
    if (plato.estado === 'pocas' && !plato.porciones) return 'agotado';
    return plato.estado || 'disponible';
  }

  /** Resumen del semáforo de un local para el comensal. */
  function resumenLocal(id) {
    var l = local(id);
    var visibles = l.platos.filter(function (p) { return p.visible !== false; });
    var estados = visibles.map(function (p) { return efectivo(p, l.ingredientes); });
    var disponibles = estados.filter(function (e) { return e === 'disponible'; }).length;
    var pocas = estados.filter(function (e) { return e === 'pocas'; }).length;
    var total = estados.length || 1;
    return {
      total: estados.length, disponibles: disponibles, pocas: pocas,
      agotados: estados.length - disponibles - pocas,
      pct: Math.round((disponibles / total) * 100)
    };
  }

  /** Promoción activa de un plato (para tachar precios en el comensal). */
  function promoDePlato(idLocal, platoId) {
    var l = local(idLocal);
    for (var i = 0; i < l.promociones.length; i++) {
      var pr = l.promociones[i];
      if (pr.activa && pr.platoId === platoId) return pr;
    }
    return null;
  }

  /** Precio final del plato según su promoción (si aplica). */
  function precioFinal(idLocal, plato) {
    var pr = promoDePlato(idLocal, plato.id);
    if (!pr) return { precio: plato.precio, anterior: null, promo: null };
    if (pr.tipo === 'porcentaje') {
      return { precio: Math.round(plato.precio * (1 - pr.valor / 100)), anterior: plato.precio, promo: pr };
    }
    if (pr.tipo === 'precio' || pr.tipo === 'menu') {
      return { precio: pr.valor, anterior: plato.precio, promo: pr };
    }
    return { precio: plato.precio, anterior: null, promo: pr };
  }

  /** Promociones activas de un local. */
  function promosActivas(idLocal) {
    var l = local(idLocal);
    return l.promociones.filter(function (p) { return p.activa; });
  }

  /* ================= Puente con el panel del local ================= */

  /** Abre la base y devuelve el slice del panel (local/local.js). */
  function abrirPanel() {
    return listo().then(function () { return slicePanel(); });
  }

  /** Slice del local activo con la forma que espera local/local.js. */
  function slicePanel(id) {
    var l = local(id);
    var s = {
      version: l.version || 1,
      local: clonar(l.local),
      categorias: clonar(l.categorias),
      gruposIngredientes: clonar(l.gruposIngredientes),
      ingredientes: clonar(l.ingredientes),
      platos: clonar(l.platos),
      promociones: clonar(l.promociones),
      _actualizado: l._actualizado || new Date().toISOString()
    };
    return s;
  }

  /** Devuelve el slice editado por el panel a la base y persiste. */
  function guardarSlicePanel(slice) {
    var l = localActivo();
    l.version = slice.version || l.version;
    l.local = slice.local;
    l.categorias = slice.categorias;
    l.gruposIngredientes = slice.gruposIngredientes;
    l.ingredientes = slice.ingredientes;
    l.platos = slice.platos;
    l.promociones = slice.promociones;
    l._actualizado = slice._actualizado || new Date().toISOString();
    return persistir();
  }

  /* ================= Guardados y preferencias del comensal ================= */

  function estaGuardado(id) { return comensal().guardados.indexOf(id) !== -1; }

  /** Alterna un local en los guardados; devuelve true si quedó guardado. */
  function alternarGuardado(id) {
    var c = comensal();
    var i = c.guardados.indexOf(id);
    if (i === -1) c.guardados.push(id);
    else c.guardados.splice(i, 1);
    persistir();
    return i === -1;
  }

  function preferencias() { return comensal().preferencias; }

  function guardarPreferencia(clave, valor) {
    comensal().preferencias[clave] = valor;
    return persistir();
  }

  /** Restablece todo (locales y comensal) a la semilla sintética. */
  function sembrarDeNuevo() {
    db = sembrar();
    persistir();
    return db;
  }

  window.SaborMapDB = {
    listo: listo,
    modo: function () { return modo; },
    abrirPanel: abrirPanel,
    reabrir: reabrir,
    guardar: persistir,
    datos: datos,
    locales: locales,
    local: local,
    activo: localActivo,
    comensal: comensal,
    resenas: resenas,
    efectivo: efectivo,
    resumenLocal: resumenLocal,
    promoDePlato: promoDePlato,
    precioFinal: precioFinal,
    promosActivas: promosActivas,
    slicePanel: slicePanel,
    guardarSlicePanel: guardarSlicePanel,
    estaGuardado: estaGuardado,
    alternarGuardado: alternarGuardado,
    preferencias: preferencias,
    guardarPreferencia: guardarPreferencia,
    sembrarDeNuevo: sembrarDeNuevo
  };
})();
