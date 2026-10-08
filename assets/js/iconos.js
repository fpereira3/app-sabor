/* SaborMap · iconos de línea compartidos (24 × 24, trazo de 2 px).
   Uso: SaborMapIconos.svg('search', 20)
   En HTML estático: <span data-icono="search"></span> y luego SaborMapIconos.pintar(). */
(function () {
  'use strict';

  var trazos = {
    inicio: '<path d="M3 11l9-7 9 7"></path><path d="M5 10v10h5v-6h4v6h5V10"></path>',
    carta: '<path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z"></path><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"></path>',
    ingredientes: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"></path><path d="M5 19l7-7"></path>',
    promociones: '<path d="M3 12V4h8l10 10-8 8L3 12z"></path><circle cx="7.5" cy="7.5" r="1.5"></circle>',
    local: '<path d="M4 9l1-5h14l1 5"></path><path d="M4 9h16v11H4z"></path><path d="M10 20v-5h4v5"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    minus: '<path d="M5 12h14"></path>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"></path><path d="M14 6l4 4"></path>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path><path d="M10 11v6M14 11v6"></path>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle>',
    eyeOff: '<path d="M3 3l18 18"></path><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"></path><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="M21 16l-5-5-9 9"></path>',
    camera: '<path d="M4 7h3l2-3h6l2 3h3v12H4z"></path><circle cx="12" cy="13" r="3.5"></circle>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    check: '<circle cx="12" cy="12" r="9"></circle><path d="M8 12l3 3 5-6"></path>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7"></path>',
    alert: '<path d="M12 3l10 18H2L12 3z"></path><path d="M12 10v5M12 18h.01"></path>',
    info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path>',
    x: '<path d="M6 6l12 12M18 6L6 18"></path>',
    undo: '<path d="M9 14L4 9l5-5"></path><path d="M4 9h11a5 5 0 0 1 0 10h-3"></path>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h8"></path>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"></path>',
    chevRight: '<path d="M9 6l6 6-6 6"></path>',
    chevDown: '<path d="M6 9l6 6 6-6"></path>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"></path>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"></path>',
    share: '<circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"></path>',
    guardar: '<path d="M6 3h12v18l-6-4-6 4z"></path>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path><path d="M9 12l2 2 4-4"></path>',
    destino: '<path d="M12 2l10 10-10 10L2 12z"></path><path d="M9 14v-3h5M12 8.5l2.5 2.5-2.5 2.5"></path>',
    copa: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"></path>',
    pizza: '<path d="M12 21L3 6c5.5-3 12.5-3 18 0L12 21z"></path><circle cx="10" cy="9" r="1"></circle><circle cx="14" cy="12" r="1"></circle>',
    capas: '<path d="M12 3l9 5-9 5-9-5 9-5z"></path><path d="M3 13l9 5 9-5"></path>',
    localizar: '<circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>',
    voz: '<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path>',
    filtros: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"></path><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="17" cy="18" r="2"></circle>',
    mapa: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"></path>',
    perfil: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="10" r="3"></circle><path d="M6.5 18.5c1.5-2 3.3-3 5.5-3s4 1 5.5 3"></path>',
    caminata: '<circle cx="13" cy="4" r="2"></circle><path d="M10 21l2-6 3 3v3M9 12l1-4 4 1 2 3 2 1M10 8l-3 2v3"></path>',
    campana: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0"></path>',
    fuego: '<path d="M12 21c-4 0-7-2.7-7-6.5 0-3.5 3-5.5 4-9 2 1.5 3 3.5 3 5 1-1 1.5-2 1.5-3.5 2.5 2 4.5 4.5 4.5 7.5 0 3.8-2.5 6.5-6 6.5z"></path>',
    corazon: '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.5-9 9-9 9z"></path>',
    util: '<path d="M7 10v11H4V10h3zM7 10l4-7c1.5 0 2.5 1 2.5 2.5L13 9h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"></path>',
    live: '<circle cx="12" cy="12" r="2"></circle><path d="M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"></path>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"></path>',
    utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 6s1 4 3 4v8"></path>',
    pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"></path><circle cx="12" cy="9" r="2.5"></circle>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"></path>',
    globe: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"></path>',
    nav: '<path d="M3 11l18-8-8 18-2-8-8-2z"></path>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>'
  };

  function svg(nombre, tamano, extra) {
    var t = tamano || 20;
    var d = trazos[nombre] || trazos.info;
    return '<svg aria-hidden="true" focusable="false" width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
  }

  function logo(tamano) {
    var t = tamano || 28;
    return '<svg aria-hidden="true" focusable="false" width="' + t + '" height="' + Math.round(t * 28 / 24) + '" viewBox="0 0 24 28">' +
      '<path d="M12 1.5C6.2 1.5 2.5 5.8 2.5 11c0 6.5 9.5 15.5 9.5 15.5s9.5-9 9.5-15.5c0-5.2-3.7-9.5-9.5-9.5z" fill="#CC4900"></path>' +
      '<path d="M9.4 6.5v4M12 6.5v4M14.6 6.5v4M9.4 10.5c0 1.6 1.1 2.6 2.6 2.6s2.6-1 2.6-2.6M12 13.1v8" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"></path></svg>';
  }

  function pintar(raiz) {
    var nodos = (raiz || document).querySelectorAll('[data-icono]');
    for (var i = 0; i < nodos.length; i++) {
      var n = nodos[i];
      if (n.dataset.icono === 'logo') n.innerHTML = logo(Number(n.dataset.tamano) || 28);
      else n.innerHTML = svg(n.dataset.icono, Number(n.dataset.tamano) || 20);
    }
  }

  window.SaborMapIconos = { svg: svg, logo: logo, pintar: pintar, nombres: Object.keys(trazos) };
})();
