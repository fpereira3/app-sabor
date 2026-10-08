/* SaborMap · mapa real (Leaflet + OpenStreetMap) para toda página con mapa.
   Prototipo sin backend propio:
   - La posición del comensal sale de la Geolocation API del navegador,
     de forma local: la coordenada no sale del dispositivo.
   - Los pines vienen de la base de datos (SaborMapDB); cada local se
     coloca con su offset en grados respecto de la posición del
     comensal, así "a 350 m" funciona en cualquier ciudad.
   - Sin permiso, sin soporte o sin Leaflet: se usa el centro de
     demostración (Santiago Centro) y nada se rompe.
   Uso: SaborMapMapa.crear('cm-mapa-hoja', { ubicacion, popups, zoom,
   sinUbicacion }), dentro de SaborMapDB.listo().then(...).
   El atributo data-permiso-ubicacion convierte un enlace en "pedir el
   permiso y luego navegar". */
(function () {
  'use strict';

  var DEMO = [-33.4423, -70.6290]; // centro de demostración: "Santiago Centro"

  var GLIFOS = {
    copa: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"></path>',
    bol: '<path d="M4 10a8 5 0 0 1 16 0H4zM3 14h18M5 17h14l-1 3H6z"></path>',
    pizza: '<path d="M12 21L3 6c5.5-3 12.5-3 18 0L12 21z"></path><circle cx="10" cy="9" r="1"></circle><circle cx="14" cy="12" r="1"></circle>',
    etiqueta: '<path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"></path>',
    pescado: '<path d="M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6z"></path><circle cx="16" cy="11" r="1"></circle>'
  };

  /* El mismo lágrima del diseño, con la pastilla de valor flotando encima
     (posición absoluta, fuera de la caja del ícono). */
  function pin(glifo, seleccionado) {
    var w = seleccionado ? 50 : 38;
    var h = seleccionado ? 62 : 48;
    var cuerpo = seleccionado
      ? '<path d="M20 2C10 2 3 9.5 3 19c0 12 17 29 17 29s17-17 17-29C37 9.5 30 2 20 2z" fill="#A33900" stroke="#FFFFFF" stroke-width="2"></path>' +
        '<circle cx="20" cy="19" r="11" fill="#CC4900"></circle>'
      : '<path d="M20 2C10 2 3 9.5 3 19c0 12 17 29 17 29s17-17 17-29C37 9.5 30 2 20 2z" fill="#FFFFFF" stroke="#A33900" stroke-width="2.5"></path>' +
        '<circle cx="20" cy="19" r="11" fill="#FFDBCE"></circle>';
    var trazo = seleccionado ? '#FFFFFF' : '#A33900';
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 40 50" aria-hidden="true">' + cuerpo +
      '<g transform="translate(12.5 11.5) scale(0.625)" fill="none" stroke="' + trazo + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + glifo + '</g></svg>';
  }

  function iconoPin(opciones) {
    var w = opciones.seleccionado ? 50 : 38;
    var h = opciones.seleccionado ? 62 : 48;
    return L.divIcon({
      className: 'cm-divicon',
      html: '<div class="cm-pin-hoja">' + (opciones.pill || '') + pin(opciones.glifo, opciones.seleccionado) + '</div>',
      iconSize: [w, h],
      iconAnchor: [w / 2, h]
    });
  }

  function iconoUsuario() {
    return L.divIcon({
      className: 'cm-divicon',
      html: '<div class="cm-ubicacion-hoja"><span></span></div>',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }

  function distanciaTexto(d) {
    if (d >= 1000) {
      return (d / 1000).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
    }
    return d + ' m';
  }

  function bandaPromo(pr) {
    if (pr.tipo === 'porcentaje') return '−' + pr.valor + '% hoy';
    if (pr.tipo === '2x1') return '2x1 hoy';
    if (pr.tipo === 'menu') return 'Menú del día';
    return 'Promo hoy';
  }

  /* Pines de la base de datos, con sus offsets respecto del comensal. */
  function pinesDeLaBase(DB) {
    var pines = [];
    DB.locales().forEach(function (l) {
      var esActivo = l.id === DB.datos().activo;
      var pill = esActivo
        ? '<span class="cm-mapa__valor cm-mapa__valor--oscura"><span></span>' +
          l.comensal.valoracion + ' · ' + DB.resumenLocal(l.id).pct + '% disponible</span>'
        : '<span class="cm-mapa__valor"><span></span>' + l.comensal.valoracion + '</span>';
      pines.push({
        nombre: l.local.nombre,
        sub: l.local.cocina + ' · ' + distanciaTexto(l.comensal.distancia),
        glifo: GLIFOS[l.comensal.glifo] || GLIFOS.pizza,
        seleccionado: esActivo,
        pill: pill,
        dLat: l.comensal.dLat,
        dLon: l.comensal.dLon
      });
    });

    /* Pin extra para una promoción sin plato del local activo. */
    var activo = DB.activo();
    var promo = DB.promosActivas(activo.id).filter(function (p) { return !p.platoId; })[0];
    if (promo) {
      pines.push({
        nombre: promo.titulo,
        sub: activo.local.nombre + ' · ' + distanciaTexto(activo.comensal.distancia),
        glifo: GLIFOS.etiqueta,
        pill: '<span class="cm-mapa__valor cm-mapa__valor--naranja"><span></span>' + bandaPromo(promo) + '</span>',
        dLat: activo.comensal.dLat - 0.0004,
        dLon: activo.comensal.dLon + 0.001
      });
    }
    return pines;
  }

  function crear(idContenedor, opciones) {
    opciones = opciones || {};
    var DB = window.SaborMapDB;
    var nodo = document.getElementById(idContenedor);
    if (!window.L || !nodo || !DB) return null;

    var zoom = opciones.zoom || 15;
    var mapa = L.map(idContenedor, { zoomControl: false, scrollWheelZoom: false });
    mapa.setView(DEMO, zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);

    L.control.zoom({ position: 'bottomleft' }).addTo(mapa);

    /* Aviso visible cuando no hay ubicación (permiso denegado, file://
       o sin soporte), en lugar de fallar en silencio. */
    var avisoNodo = null;
    function sinUbicacion() {
      if (avisoNodo || !opciones.sinUbicacion) return;
      avisoNodo = document.createElement('span');
      avisoNodo.className = 'cm-mapa__nota cm-mapa__nota--aviso';
      avisoNodo.textContent = opciones.sinUbicacion;
      nodo.parentElement.appendChild(avisoNodo);
    }

    var pines = pinesDeLaBase(DB);
    var capa = { usuario: null, locales: [] };

    /* Coloca al comensal y los locales según un punto de origen. */
    function colocar(origen) {
      if (capa.usuario) capa.usuario.setLatLng(origen);
      else capa.usuario = L.marker(origen, { icon: iconoUsuario(), interactive: false, keyboard: false }).addTo(mapa);

      for (var i = 0; i < capa.locales.length; i++) mapa.removeLayer(capa.locales[i]);
      capa.locales = [];
      for (var j = 0; j < pines.length; j++) {
        var m = pines[j];
        var marcador = L.marker([origen[0] + m.dLat, origen[1] + m.dLon], { icon: iconoPin(m), title: m.nombre }).addTo(mapa);
        if (opciones.popups !== false) {
          marcador.bindPopup(
            '<div class="cm-mapa-pop"><strong>' + m.nombre + '</strong>' +
            '<span>' + m.sub + '</span>' +
            '<a href="restaurante.html">Ver carta</a></div>'
          );
        }
        capa.locales.push(marcador);
      }
      mapa.setView(origen, zoom);
    }

    colocar(DEMO);

    /* Ubicación real del comensal (solo local, sin servidores propios). */
    if (opciones.ubicacion !== false && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (posicion) {
        colocar([posicion.coords.latitude, posicion.coords.longitude]);
      }, function () {
        /* Sin permiso o sin señal: queda el centro de demostración. */
        sinUbicacion();
      }, { timeout: 8000, maximumAge: 60000 });
    } else if (opciones.ubicacion === false) {
      sinUbicacion();
    }

    /* Leaflet necesita recalcular cuando el contenedor cambia de tamaño. */
    window.addEventListener('resize', function () { mapa.invalidateSize(); });
    window.addEventListener('load', function () { mapa.invalidateSize(); });

    return mapa;
  }

  /* Enlaces con data-permiso-ubicacion: piden el permiso al navegador y
     después continúan a su destino, con o sin él. */
  function conectarPermisos() {
    var botones = document.querySelectorAll('[data-permiso-ubicacion]');
    for (var i = 0; i < botones.length; i++) {
      botones[i].addEventListener('click', function (evento) {
        var destino = this.getAttribute('href') || 'explorar.html';
        evento.preventDefault();
        var ir = function () { window.location.href = destino; };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function () { ir(); }, function () { ir(); }, { timeout: 8000 });
        } else {
          ir();
        }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conectarPermisos);
  else conectarPermisos();

  window.SaborMapMapa = { crear: crear };
})();
