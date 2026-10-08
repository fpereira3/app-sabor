/* SaborMap · mapa real (Leaflet + OpenStreetMap) para toda página con mapa.
   Prototipo sin backend:
   - La posición del comensal sale de la Geolocation API del navegador,
     de forma local: la coordenada no sale del dispositivo.
   - Los locales de prueba se colocan RELATIVOS a esa posición (_offsets
     en grados), así "a 350 m" funciona en cualquier ciudad.
   - Sin permiso, sin soporte o sin Leaflet: se usa el centro de
     demostración (Santiago Centro) y nada se rompe.
   Uso: SaborMapMapa.crear('cm-mapa-hoja', { ubicacion, popups, zoom }).
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

  /* Desplazamientos en grados respecto de la posición del comensal:
     reproducen las distancias de la demostración en cualquier ciudad. */
  var LOCALES = [
    {
      nombre: 'La Trattoria del Sol',
      sub: 'Italiana · 350 m',
      dLat: 0.0021, dLon: 0.0065,
      glifo: GLIFOS.pizza,
      seleccionado: true,
      pill: '<span class="cm-mapa__valor cm-mapa__valor--oscura"><span></span>4.8 · 88% disponible</span>'
    },
    {
      nombre: 'Ramen Ya',
      sub: 'Ramen y nikkei · 800 m',
      dLat: 0.0033, dLon: -0.01,
      glifo: GLIFOS.bol,
      pill: '<span class="cm-mapa__valor cm-mapa__valor--ambar"><span></span>4.7</span>'
    },
    {
      nombre: 'Café Alameda',
      sub: 'Desayunos y café · 650 m',
      dLat: 0.0049, dLon: -0.0066,
      glifo: GLIFOS.copa,
      pill: '<span class="cm-mapa__valor"><span></span>4.9</span>'
    },
    {
      nombre: 'Puerto Sabor',
      sub: 'Cevichería · 1,1 km',
      dLat: 0.0075, dLon: -0.0165,
      glifo: GLIFOS.pescado,
      pill: '<span class="cm-mapa__valor"><span></span>4.8</span>'
    },
    {
      nombre: 'Aperitivos de la casa',
      sub: 'La Trattoria del Sol · 350 m',
      dLat: 0.0017, dLon: 0.0055,
      glifo: GLIFOS.etiqueta,
      pill: '<span class="cm-mapa__valor cm-mapa__valor--naranja"><span></span>−20% hoy</span>'
    }
  ];

  function crear(idContenedor, opciones) {
    opciones = opciones || {};
    var nodo = document.getElementById(idContenedor);
    if (!window.L || !nodo) return null;

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

    var capa = { usuario: null, locales: [] };

    /* Coloca al comensal y los locales según un punto de origen. */
    function colocar(origen) {
      if (capa.usuario) capa.usuario.setLatLng(origen);
      else capa.usuario = L.marker(origen, { icon: iconoUsuario(), interactive: false, keyboard: false }).addTo(mapa);

      for (var i = 0; i < capa.locales.length; i++) mapa.removeLayer(capa.locales[i]);
      capa.locales = [];
      for (var j = 0; j < LOCALES.length; j++) {
        var l = LOCALES[j];
        var marcador = L.marker([origen[0] + l.dLat, origen[1] + l.dLon], { icon: iconoPin(l), title: l.nombre }).addTo(mapa);
        if (opciones.popups !== false) {
          marcador.bindPopup(
            '<div class="cm-mapa-pop"><strong>' + l.nombre + '</strong>' +
            '<span>' + l.sub + '</span>' +
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
