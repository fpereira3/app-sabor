/* SaborMap · render de la vista comensal desde la base de datos.
   Cada página llama a su función tras cargar db.js (y antes de pintar
   los iconos), y los contenedores con data-render se llenan con el
   mismo markup de clases cm-* del diseño. Los botones con data-guardar
   alternan locales en los guardados del comensal y persisten. */
(function () {
  'use strict';

  var DB = window.SaborMapDB;
  if (!DB) return;

  var CAT = (window.SaborMapDemo && window.SaborMapDemo.catalogos) || { etiquetas: [], diasSemana: [] };

  /* ================= Utilidades ================= */

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function precio(n) { return '$' + Number(n).toLocaleString('es-CL'); }

  function distanciaTexto(d) {
    if (d >= 1000) {
      return (d / 1000).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
    }
    return d + ' m';
  }

  /** id del local en la URL (?id=); si no, el activo. */
  function idDeURL(defecto) {
    var id = null;
    try { id = new URLSearchParams(location.search).get('id'); } catch (e) { /* sin soporte */ }
    return id || defecto;
  }

  function platoDeURL() {
    try { return new URLSearchParams(location.search).get('plato'); } catch (e) { return null; }
  }

  /** "Todos los días, 12:30 a 23:00" / "Lun a Sáb, 11:00 a 19:00". */
  function textoHorario(horario) {
    var abiertos = (horario || []).filter(function (h) { return h.abierto; });
    if (!abiertos.length) return 'Sin horario informado';
    var dias;
    if (abiertos.length >= 7) dias = 'Todos los días';
    else {
      var orden = abiertos.map(function (h) { return h.dia; }).sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
      dias = nombreDia(orden[0]) + ' a ' + nombreDia(orden[orden.length - 1]);
    }
    var desde = abiertos[0].desde, hasta = abiertos[0].hasta;
    abiertos.forEach(function (h) {
      if (h.desde < desde) desde = h.desde;
      if (h.hasta > hasta) hasta = h.hasta;
    });
    return dias + ', ' + desde + ' a ' + hasta;
  }

  function nombreDia(dia) {
    for (var i = 0; i < CAT.diasSemana.length; i++) {
      if (CAT.diasSemana[i].dia === dia) return CAT.diasSemana[i].corto;
    }
    return '';
  }

  function nombreServicio(id) {
    for (var i = 0; i < (CAT.servicios || []).length; i++) {
      if (CAT.servicios[i].id === id) return CAT.servicios[i].nombre;
    }
    return id;
  }

  /** Foto de portada del local (portada → primera foto → foto de tarjeta). */
  function fotoPortada(l) {
    var fotos = l.local.fotos || [];
    var archivo = null, alt = l.local.nombre;
    for (var i = 0; i < fotos.length; i++) {
      if (fotos[i].id === l.local.portada) { archivo = fotos[i].archivo; alt = fotos[i].descripcion || alt; }
    }
    if (!archivo && fotos.length) { archivo = fotos[0].archivo; alt = fotos[0].descripcion || alt; }
    if (!archivo) archivo = l.comensal.foto;
    return { archivo: archivo, alt: alt };
  }

  /** "Actualizada hace un momento / N min / N h". */
  function haceTexto(iso) {
    if (!iso) return 'Actualizada hace un momento';
    var min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (isNaN(min) || min < 2) return 'Actualizada hace un momento';
    if (min < 60) return 'Actualizada hace ' + min + ' min';
    var h = Math.round(min / 60);
    if (h < 24) return 'Actualizada hace ' + h + ' h';
    return 'Actualizada hace ' + Math.round(h / 24) + ' días';
  }

  function poner(selector, texto) {
    var n = document.querySelector(selector);
    if (n) n.textContent = texto;
  }

  function hrefRestaurante(id) {
    return 'restaurante.html?id=' + encodeURIComponent(id);
  }

  function nombreEtiqueta(id) {
    for (var i = 0; i < CAT.etiquetas.length; i++) {
      if (CAT.etiquetas[i].id === id) return CAT.etiquetas[i].nombre;
    }
    return id;
  }

  function nombreDia(dia) {
    for (var i = 0; i < CAT.diasSemana.length; i++) {
      if (CAT.diasSemana[i].dia === dia) return CAT.diasSemana[i].corto;
    }
    return '';
  }

  function diasPromo(dias) {
    if (!dias || dias.length >= 7) return 'Todos los días';
    return dias.slice().sort().map(nombreDia).join(' y ');
  }

  function horarioPromo(pr) {
    if (pr.todoElDia) return diasPromo(pr.dias);
    return diasPromo(pr.dias) + ' de ' + pr.desde + ' a ' + pr.hasta;
  }

  function bandaPromo(pr) {
    if (pr.tipo === 'porcentaje') return '−' + pr.valor + '%';
    if (pr.tipo === '2x1') return '2x1';
    if (pr.tipo === 'menu') return 'Menú';
    return precio(pr.valor);
  }

  function iconoPromo(pr) {
    if (pr.tipo === '2x1') return 'copa';
    if (pr.tipo === 'menu') return 'utensils';
    return 'promociones';
  }

  function textoEstado(e, p) {
    if (e === 'pocas') return p && p.porciones ? 'Quedan ' + p.porciones : 'Pocas porciones';
    if (e === 'agotado') return 'Agotado hoy';
    if (e === 'sin-info') return 'Sin información';
    return 'Disponible';
  }

  function pill(e, p) {
    return '<span class="sm-estado sm-estado--' + e + '">' + esc(textoEstado(e, p)) + '</span>';
  }

  function iniciales(autor) {
    return autor.split(' ').filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }

  function fotoPlato(ruta, alt) {
    if (ruta) return '<img src="../assets/img/' + esc(ruta) + '" alt="' + esc(alt) + '">';
    return '<div class="cm-plato__foto--vacia" aria-hidden="true"><span data-icono="camera" data-tamano="24"></span></div>';
  }

  /* ================= Piezas ================= */

  function tarjetaLocal(l, conQuitar) {
    var r = DB.resumenLocal(l.id);
    var nPromos = DB.promosActivas(l.id).length;
    var llano = Math.round((r.disponibles / (r.total || 1)) * 100);
    var pocas = Math.min(8, Math.round((r.pocas / (r.total || 1)) * 100));
    return (
      '<a class="cm-local-tarjeta cm-guardado-tarjeta" href="' + hrefRestaurante(l.id) + '">' +
        '<div class="cm-local-tarjeta__foto">' +
          '<img src="../assets/img/' + esc(l.comensal.foto) + '" alt="' + esc(l.comensal.fotoAlt || l.local.nombre) + '">' +
          '<span class="cm-distancia cm-distancia--chica">' + distanciaTexto(l.comensal.distancia) + '</span>' +
        '</div>' +
        '<div class="cm-local-tarjeta__cuerpo">' +
          '<span class="cm-local-tarjeta__nombre">' + esc(l.local.nombre) + '</span>' +
          '<span class="cm-local-tarjeta__sub">' + esc(l.comensal.barrio) + ' · ' + esc(l.local.cocina) + ' · $$</span>' +
          '<span class="cm-local-tarjeta__rating">' +
            '<span class="cm-estrella" data-icono="star" data-tamano="13"></span>' +
            '<strong>' + l.comensal.valoracion + '</strong> (' + l.comensal.resenasTotal + ') · ' +
            '<span class="cm-promo-mini">' + nPromos + (nPromos === 1 ? ' promoción' : ' promociones') + '</span>' +
          '</span>' +
          '<div class="cm-local-tarjeta__barra">' +
            '<div class="cm-progreso__fila">' +
              '<span class="cm-progreso__disponible">' + r.pct + '% de la carta disponible</span>' +
              '<span class="cm-progreso__detalle">' + r.disponibles + ' · ' + r.pocas + ' pocas</span>' +
            '</div>' +
            '<div class="cm-progreso">' +
              '<span class="cm-progreso__lleno" style="width: ' + llano + '%;"></span>' +
              '<span class="cm-progreso__pocas" style="width: ' + pocas + '%;"></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        (conQuitar ? '<button type="button" class="cm-quitar" data-quitar="' + esc(l.id) + '" aria-label="Quitar de guardados"><span data-icono="x" data-tamano="16"></span></button>' : '') +
      '</a>'
    );
  }

  function carruselPromo(l, pr) {
    var plato = pr.platoId ? buscarPlato(l, pr.platoId) : null;
    var foto = plato && plato.foto ? plato.foto : l.comensal.foto;
    var alt = plato ? plato.nombre : pr.titulo;
    var estado = plato ? DB.efectivo(plato, l.ingredientes) : 'sin-info';
    var precios = '';
    if (plato) {
      var pf = DB.precioFinal(l.id, plato);
      precios = '<span class="cm-plato__precios"><strong class="cm-carrusel__precio">' + precio(pf.precio) + '</strong>' +
        (pf.anterior ? '<span class="cm-plato__precio-anterior">' + precio(pf.anterior) + '</span>' : '') + '</span>';
    }
    return (
      '<a class="cm-carrusel__tarjeta" href="' + hrefRestaurante(l.id) + '">' +
        '<div class="cm-carrusel__foto">' +
          '<img src="../assets/img/' + esc(foto) + '" alt="' + esc(alt) + '">' +
          '<span class="cm-carrusel__banda">' + esc(bandaPromo(pr)) + '</span>' +
          '<span class="cm-carrusel__distancia">' + distanciaTexto(l.comensal.distancia) + '</span>' +
        '</div>' +
        '<div class="cm-carrusel__cuerpo">' +
          '<span class="cm-carrusel__titulo">' + esc(plato ? plato.nombre : pr.titulo) + '</span>' +
          '<span class="cm-carrusel__sub">' + esc(l.local.nombre) + ' · ' + esc(l.comensal.barrio) + '</span>' +
          '<div class="cm-carrusel__pie">' +
            precios +
            pill(estado, plato) +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function buscarPlato(l, id) {
    for (var i = 0; i < l.platos.length; i++) {
      if (l.platos[i].id === id) return l.platos[i];
    }
    return null;
  }

  function articuloCarta(l, p) {
    var e = DB.efectivo(p, l.ingredientes);
    var pf = DB.precioFinal(l.id, p);
    var promo = pf.promo;
    var etiquetas = (p.etiquetas || []).map(function (id) {
      return '<span class="cm-plato__etiqueta">' + esc(nombreEtiqueta(id)) + '</span>';
    }).join('');
    var meta2 = e === 'agotado' ? (p.vuelve ? 'Vuelve pronto' : 'Sin stock por hoy') : 'Hace un momento';
    return (
      '<article class="cm-plato' + (e === 'agotado' ? ' cm-plato--agotado' : '') + '">' +
        '<div class="cm-plato__foto">' +
          fotoPlato(p.foto, p.nombre) +
          (promo && promo.tipo === 'porcentaje' ? '<span class="cm-plato__insignia cm-plato__insignia--solida">−' + promo.valor + '% hoy</span>' : '') +
        '</div>' +
        '<div class="cm-plato__cuerpo">' +
          '<h3 class="cm-plato__titulo">' + esc(p.nombre) + '</h3>' +
          '<p class="cm-plato__desc">' + esc(p.descripcion) + '</p>' +
          (etiquetas ? '<div class="cm-plato__etiquetas">' + etiquetas + '</div>' : '') +
          '<div class="cm-plato__meta">' + pill(e, p) + '<span>' + meta2 + '</span></div>' +
          '<div class="cm-plato__pie">' +
            '<span class="cm-plato__precios"><strong class="cm-plato__precio">' + precio(pf.precio) + '</strong>' +
              (pf.anterior ? '<span class="cm-plato__precio-anterior">' + precio(pf.anterior) + '</span>' : '') +
            '</span>' +
            '<a class="cm-plato__detalle" href="plato.html?id=' + encodeURIComponent(l.id) + '&plato=' + encodeURIComponent(p.id) + '">Ver detalle <span data-icono="chevRight" data-tamano="16"></span></a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function tarjetaPromo(l, pr) {
    return (
      '<article class="sm-tarjeta cm-promo">' +
        '<span class="cm-promo__icono"><span data-icono="' + iconoPromo(pr) + '" data-tamano="22"></span></span>' +
        '<div class="cm-promo__cuerpo">' +
          '<h3 class="cm-promo__titulo">' + esc(pr.titulo) + '</h3>' +
          '<span class="cm-promo__horario"><span data-icono="clock" data-tamano="13"></span>' + esc(horarioPromo(pr)) + '</span>' +
          (pr.condiciones ? '<p class="cm-promo__texto">' + esc(pr.condiciones) + '</p>' : '') +
        '</div>' +
      '</article>'
    );
  }

  function resultadoPlatos(l, p) {
    var e = DB.efectivo(p, l.ingredientes);
    var pf = DB.precioFinal(l.id, p);
    var promo = pf.promo;
    var foto = p.foto || l.comensal.foto;
    var nota = e === 'disponible'
      ? '<span class="cm-resultado__nota cm-resultado__nota--positiva"><span data-icono="check" data-tamano="15"></span>Stock confirmado por la cocina</span>'
      : e === 'pocas'
        ? '<span class="cm-resultado__nota"><span data-icono="clock" data-tamano="15"></span>Suele agotarse pronto</span>'
        : '<span class="cm-resultado__nota"><span data-icono="refresh" data-tamano="15"></span>' + (p.vuelve ? 'Vuelve pronto' : 'Vuelve cuando se reponga') + '</span>';
    return (
      '<article class="cm-resultado' + (e === 'agotado' ? ' cm-resultado--agotado' : '') + '">' +
        '<div class="cm-resultado__cuerpo">' +
          '<div class="cm-resultado__foto">' +
            '<img src="../assets/img/' + esc(foto) + '" alt="' + esc(p.nombre) + '">' +
            (promo && promo.tipo === 'porcentaje' ? '<span class="cm-plato__insignia cm-plato__insignia--solida">−' + promo.valor + '% hoy</span>' : '') +
            (e === 'agotado' ? '<span class="cm-resultado__sello">AGOTADO</span>' : '') +
            '<span class="cm-resultado__puntuacion"><span class="cm-estrella" data-icono="star" data-tamano="11"></span>' + (p.valoracion || 4.5) + '</span>' +
          '</div>' +
          '<div class="cm-resultado__info">' +
            '<h3 class="cm-resultado__titulo">' + esc(p.nombre) + '</h3>' +
            '<span class="cm-plato__precios"><strong class="cm-plato__precio">' + precio(pf.precio) + '</strong>' +
              (pf.anterior ? '<span class="cm-plato__precio-anterior">' + precio(pf.anterior) + '</span>' : '') + '</span>' +
            '<span class="cm-resultado__local">' + esc(l.local.nombre) + ' · <span data-icono="caminata" data-tamano="13"></span> ' + distanciaTexto(l.comensal.distancia) + '</span>' +
            '<div class="cm-resultado__meta">' +
              pill(e, p) +
              '<button type="button" class="cm-resultado__guardar' + (DB.estaGuardado(l.id) ? ' cm-activo' : '') + '" data-guardar="' + esc(l.id) + '" aria-label="Guardar ' + esc(l.local.nombre) + '"><span data-icono="guardar" data-tamano="18"></span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cm-resultado__pie">' +
          nota +
          '<a class="cm-plato__detalle" href="' + hrefRestaurante(l.id) + '">Ver restaurante <span data-icono="chevRight" data-tamano="16"></span></a>' +
        '</div>' +
      '</article>'
    );
  }

  function filaPromo(l, pr) {
    var plato = pr.platoId ? buscarPlato(l, pr.platoId) : null;
    var foto = plato && plato.foto ? plato.foto : l.comensal.foto;
    var pie;
    if (plato) {
      var pf = DB.precioFinal(l.id, plato);
      var e = DB.efectivo(plato, l.ingredientes);
      pie = '<strong class="cm-promo-fila__precio">' + precio(pf.precio) + '</strong>' + pill(e, plato);
    } else {
      pie = '<span class="sm-estado sm-estado--sin-info">Sin stock informado</span>';
    }
    return (
      '<a class="cm-local-tarjeta cm-local-tarjeta--chica cm-promo-fila" href="' + hrefRestaurante(l.id) + '">' +
        '<div class="cm-local-tarjeta__foto">' +
          '<img src="../assets/img/' + esc(foto) + '" alt="' + esc(plato ? plato.nombre : pr.titulo) + '">' +
          '<span class="cm-promo-fila__banda">' + esc(bandaPromo(pr)) + '</span>' +
        '</div>' +
        '<div class="cm-local-tarjeta__cuerpo">' +
          '<span class="cm-local-tarjeta__nombre">' + esc(plato ? plato.nombre : pr.titulo) + '</span>' +
          '<span class="cm-local-tarjeta__sub">' + esc(l.local.nombre) + ' · ' + distanciaTexto(l.comensal.distancia) + '</span>' +
          '<span class="cm-promo-fila__horario"><span data-icono="clock" data-tamano="13"></span>' + esc(horarioPromo(pr)) + '</span>' +
          '<div class="cm-promo-fila__pie">' + pie + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function destacadaPromo(l, pr) {
    var plato = pr.platoId ? buscarPlato(l, pr.platoId) : null;
    var foto = plato && plato.foto ? plato.foto : l.comensal.foto;
    var e = plato ? DB.efectivo(plato, l.ingredientes) : 'sin-info';
    var pf = plato ? DB.precioFinal(l.id, plato) : { precio: pr.valor, anterior: null };
    return (
      '<article class="cm-promo-destacada">' +
        '<div class="cm-promo-destacada__foto">' +
          '<img src="../assets/img/' + esc(foto) + '" alt="' + esc(plato ? plato.nombre : pr.titulo) + '">' +
          '<span class="cm-promo-destacada__banda"><span data-icono="fuego" data-tamano="14"></span>' + esc(bandaPromo(pr)) + ' hoy</span>' +
          '<span class="cm-promo-destacada__distancia">' + distanciaTexto(l.comensal.distancia) + '</span>' +
        '</div>' +
        '<div class="cm-promo-destacada__cuerpo">' +
          '<span class="cm-promo-destacada__kicker">DESTACADA DEL DÍA</span>' +
          '<h2 class="cm-promo-destacada__titulo">' + esc(plato ? plato.nombre : pr.titulo) + '</h2>' +
          '<span class="cm-promo-destacada__sub">' + esc(l.local.nombre) + ' · ' + esc(l.comensal.barrio) + '</span>' +
          '<div class="cm-promo-destacada__fila">' +
            '<span class="cm-plato__precios"><strong class="cm-promo-destacada__precio">' + precio(pf.precio) + '</strong>' +
              (pf.anterior ? '<span class="cm-plato__precio-anterior">' + precio(pf.anterior) + '</span>' : '') + '</span>' +
            pill(e, plato) +
          '</div>' +
          '<span class="cm-promo-destacada__horario"><span data-icono="clock" data-tamano="15"></span>' + esc(horarioPromo(pr)) + '</span>' +
          '<a class="cm-tarjeta-local__principal cm-promo-destacada__principal" href="' + hrefRestaurante(l.id) + '">Ver en la carta <span data-icono="arrowRight" data-tamano="18"></span></a>' +
        '</div>' +
      '</article>');
  }

  function opinionResena(r, i) {
    var estrellas = '';
    for (var s = 0; s < Math.round(r.rating); s++) {
      estrellas += '<span class="cm-estrella" data-icono="star" data-tamano="13"></span>';
    }
    var platos = (r.platos || []).map(function (pl) {
      return '<span class="sm-estado sm-estado--' + pl.estado + '">' + esc(pl.texto) + '</span>';
    }).join('');
    var fotos = (r.fotos || []).map(function (f) {
      return '<img src="../assets/img/' + esc(f.archivo) + '" alt="' + esc(f.alt || '') + '">';
    }).join('');
    var avatar = ['', 'cm-resena__avatar--ambar', 'cm-resena__avatar--verde'][i % 3] || '';
    return (
      '<article class="cm-resena">' +
        '<div class="cm-resena__fila">' +
          '<span class="cm-resena__avatar ' + avatar + '">' + esc(iniciales(r.autor)) + '</span>' +
          '<span class="cm-resena__textos">' +
            '<span class="cm-resena__nombre">' + esc(r.autor) +
              (r.verificada ? '<span class="cm-resena__verificada"><span data-icono="check" data-tamano="11"></span>Verificada</span>' : '') +
            '</span>' +
            '<span class="cm-resena__fecha">' + esc(r.fecha) + (r.verificada ? ' · visita verificada' : '') + '</span>' +
          '</span>' +
          '<span class="cm-resena__nota"><span class="cm-estrella" data-icono="star" data-tamano="12"></span>' + r.rating.toFixed(1) + '</span>' +
        '</div>' +
        (platos ? '<div class="cm-resena__platos">' + platos + '</div>' : '') +
        '<p class="cm-resena__texto">' + esc(r.texto) + '</p>' +
        (fotos ? '<div class="cm-resena__fotos">' + fotos + '</div>' : '') +
        '<div class="cm-resena__pie">' +
          '<button type="button" class="cm-resena__util"><span data-icono="util" data-tamano="14"></span>Útil</button>' +
          '<button type="button" class="cm-resena__compartir"><span data-icono="share" data-tamano="15"></span>Compartir</button>' +
        '</div>' +
      '</article>'
    );
  }

  /* ================= Páginas ================= */

  function explorar() {
    var locales = DB.locales().slice().sort(function (a, b) {
      return a.comensal.distancia - b.comensal.distancia;
    });

    var lista = document.querySelector('[data-render="locales"]');
    if (lista) lista.innerHTML = locales.map(function (l) { return tarjetaLocal(l, false); }).join('');

    var cuenta = document.querySelector('[data-render="locales-cuenta"]');
    if (cuenta) cuenta.textContent = locales.length + ' en 1 km';

    var activo = DB.activo();
    var resumen = DB.resumenLocal(activo.id);
    var nPromos = DB.promosActivas(activo.id).length;

    var estado = document.querySelector('.cm-tarjeta-local .sm-estado');
    if (estado) {
      estado.textContent = 'Abierto · ' + resumen.disponibles + ' de ' + resumen.total + ' platos disponibles';
    }
    var promoLinea = document.querySelector('.cm-tarjeta-local__promo');
    if (promoLinea) {
      promoLinea.innerHTML = '<span data-icono="promociones" data-tamano="15"></span>' +
        nPromos + (nPromos === 1 ? ' promoción activa hoy' : ' promociones activas hoy');
    }

    /* Intercaladas por local: primero una de cada restaurante, así el
       carrusel no arranca con todas las de un mismo lugar. */
    var promosCarrusel = [];
    var rondas = locales.map(function (l) {
      return { l: l, prs: DB.promosActivas(l.id).filter(function (p) { return p.platoId; }), i: 0 };
    });
    var hay = true;
    while (hay) {
      hay = false;
      for (var ronda = 0; ronda < rondas.length; ronda++) {
        if (rondas[ronda].i < rondas[ronda].prs.length) {
          promosCarrusel.push({ l: rondas[ronda].l, pr: rondas[ronda].prs[rondas[ronda].i] });
          rondas[ronda].i++;
          hay = true;
        }
      }
    }
    var carrusel = document.querySelector('[data-render="carrusel"]');
    if (carrusel) carrusel.innerHTML = promosCarrusel.slice(0, 4).map(function (x) { return carruselPromo(x.l, x.pr); }).join('');

    var principal = document.querySelector('.cm-tarjeta-local__principal');
    if (principal) principal.setAttribute('href', hrefRestaurante(DB.datos().activo));

    var hoy = document.querySelector('[data-render="promos-hoy"]');
    var todas = 0;
    locales.forEach(function (l) { todas += DB.promosActivas(l.id).length; });
    if (hoy) hoy.textContent = todas + ' hoy';
  }

  function restaurante(idParam) {
    var l = DB.local(idDeURL(idParam)) || DB.activo();
    var resumen = DB.resumenLocal(l.id);
    var rese = DB.resenas(l.id);

    /* Barra con título y subtítulo reales. */
    poner('[data-render="barra-titulo"]', l.local.nombre);
    poner('[data-render="barra-subtitulo"]', l.comensal.barrio + ' · ' + l.local.cocina);

    /* Foto de portada. */
    var hero = document.querySelector('[data-render="hero-foto"]');
    if (hero) {
      var f = fotoPortada(l);
      hero.setAttribute('src', '../assets/img/' + f.archivo);
      hero.setAttribute('alt', f.alt);
    }
    poner('[data-render="hero-etiqueta"]', (l.local.cocina || '').toUpperCase());
    var nFotos = (l.local.fotos || []).length;
    var cuenta = document.querySelector('[data-render="fotos-cuenta"]');
    if (cuenta) {
      if (nFotos) cuenta.textContent = nFotos + (nFotos === 1 ? ' foto' : ' fotos');
      else cuenta.hidden = true;
    }

    /* Encabezado, puntuación y chips. */
    poner('[data-render="nombre"]', l.local.nombre);
    poner('[data-render="subtitulo"]', l.local.descripcion);
    poner('[data-render="puntuacion-valor"]', String(l.comensal.valoracion));
    poner('[data-render="puntuacion-total"]', l.comensal.resenasTotal + ' reseñas');
    var punt = document.querySelector('[data-render="puntuacion"]');
    if (punt) punt.setAttribute('href', 'resenas.html?id=' + encodeURIComponent(l.id));
    var estado = document.querySelector('[data-render="estado"]');
    if (estado) {
      if (l.local.cierreTemporal && l.local.cierreTemporal.activo) {
        estado.className = 'sm-estado sm-estado--agotado';
        estado.textContent = 'Cerrado temporalmente';
      } else {
        estado.className = 'sm-estado sm-estado--disponible';
        estado.textContent = 'Abierto · hasta ' + textoHorario(l.local.horario).split(', ')[1];
      }
    }
    poner('[data-render="distancia"]', distanciaTexto(l.comensal.distancia));
    poner('[data-render="rango"]', '$'.repeat(l.local.rangoPrecio || 2) + ' · ' +
      precio(l.local.precioDesde) + '–' + precio(l.local.precioHasta) + ' por persona');

    /* Guardar apunta a ESTE local (el id se lee al hacer clic). */
    document.querySelectorAll('[data-render="guardar"]').forEach(function (b) {
      b.setAttribute('data-guardar', l.id);
      b.classList.toggle('cm-activo', DB.estaGuardado(l.id));
    });

    /* Pestañas y semáforo. */
    var tabResenas = document.querySelector('[data-render="tab-resenas"]');
    if (tabResenas) tabResenas.setAttribute('href', 'resenas.html?id=' + encodeURIComponent(l.id));
    poner('[data-render="actualizada"]', haceTexto(l._actualizado));
    poner('[data-render="disponibles"]', resumen.disponibles + ' de ' + resumen.total + ' platos disponibles');

    /* Carta y promociones de este local. */
    var carta = document.querySelector('#carta');
    if (carta) {
      carta.innerHTML = l.platos.filter(function (p) { return p.visible !== false; })
        .map(function (p) { return articuloCarta(l, p); }).join('');
    }
    var seccionPromos = document.querySelector('#promos');
    if (seccionPromos) {
      var activas = DB.promosActivas(l.id);
      seccionPromos.querySelectorAll('.cm-promo').forEach(function (n) { n.remove(); });
      var cabecera = seccionPromos.querySelector('.cm-seccion__cabecera');
      if (cabecera) cabecera.insertAdjacentHTML('afterend', activas.map(function (pr) { return tarjetaPromo(l, pr); }).join(''));
      var nota = seccionPromos.querySelector('.cm-seccion__nota');
      if (nota) nota.textContent = activas.length + (activas.length === 1 ? ' activa' : ' activas');
    }

    /* Cita con la primera reseña. */
    poner('[data-render="cita-valor"]', String(l.comensal.valoracion));
    var cita = document.querySelector('[data-render="cita"]');
    if (cita) {
      if (rese.length) {
        cita.hidden = false;
        cita.innerHTML = '<p>“' + esc(rese[0].texto) + '”</p><footer>' + esc(rese[0].autor) + ' · ' +
          (rese[0].verificada ? 'visita verificada · ' : '') + esc(rese[0].fecha) + '</footer>';
      } else cita.hidden = true;
    }
    var citaLink = document.querySelector('[data-render="cita-link"]');
    if (citaLink) {
      citaLink.setAttribute('href', 'resenas.html?id=' + encodeURIComponent(l.id));
      poner('[data-render="cita-link-texto"]', 'Ver reseñas y fotos (' + l.comensal.resenasTotal + ')');
    }

    /* Ficha de información. */
    poner('[data-render="ficha-horario"]', textoHorario(l.local.horario));
    poner('[data-render="ficha-direccion"]', l.local.direccion);
    var servicios = (l.local.servicios || []).map(nombreServicio);
    poner('[data-render="ficha-ambiente"]', servicios.length ? servicios.join(', ') : 'Sin información de ambiente');
  }

  function platos() {
    var locales = DB.locales();
    var items = [];
    locales.forEach(function (l) {
      l.platos.filter(function (p) { return p.visible !== false; }).forEach(function (p) {
        items.push({ l: l, p: p });
      });
    });
    items.sort(function (a, b) { return (b.p.valoracion || 4.5) - (a.p.valoracion || 4.5); });

    var cont = document.querySelector('[data-render="resultados"]');
    if (cont) {
      cont.querySelectorAll('.cm-resultado').forEach(function (n) { n.remove(); });
      cont.insertAdjacentHTML('beforeend', items.slice(0, 8).map(function (x) { return resultadoPlatos(x.l, x.p); }).join(''));
    }

    /* Resumen global del semáforo. */
    var disponibles = 0, pocas = 0, total = 0;
    locales.forEach(function (l) {
      var r = DB.resumenLocal(l.id);
      disponibles += r.disponibles; pocas += r.pocas; total += r.total;
    });
    var pct = total ? Math.round((disponibles / total) * 100) : 0;
    var acento = document.querySelector('[data-render="resumen-pct"]');
    if (acento) acento.textContent = pct + '% de los platos';
    var donaTexto = document.querySelector('[data-render="dona-valor"]');
    if (donaTexto) donaTexto.textContent = pct + '%';
    var dona = document.querySelector('[data-render="dona"]');
    if (dona) dona.setAttribute('stroke-dashoffset', (163.4 * (1 - pct / 100)).toFixed(1));
    var cocinas = document.querySelector('[data-render="cocinas"]');
    if (cocinas) cocinas.textContent = 'Según ' + locales.length + ' cocinas activas a tu alrededor en ' + DB.comensal().ciudad + '.';
  }

  function promociones() {
    var todas = [];
    DB.locales().forEach(function (l) {
      DB.promosActivas(l.id).forEach(function (pr) { todas.push({ l: l, pr: pr }); });
    });

    var cuenta = document.querySelector('[data-render="promos-cuenta"]');
    if (cuenta) cuenta.textContent = todas.length + ' promociones activas hoy en ' + DB.comensal().ciudad;

    /* Destacada: la del plato con mejor descuento. */
    var destacada = null;
    todas.forEach(function (x) {
      if (x.pr.tipo !== 'porcentaje') return;
      if (!destacada || x.pr.valor > destacada.pr.valor) destacada = x;
    });
    if (!destacada) destacada = todas[0] || null;

    var cont = document.querySelector('[data-render="listado-promos"]');
    if (cont) {
      cont.querySelectorAll('.cm-promo-destacada, .cm-promo-fila').forEach(function (n) { n.remove(); });
      var html = (destacada ? destacadaPromo(destacada.l, destacada.pr) : '');
      var resto = todas.filter(function (x) { return !destacada || x !== destacada; });
      html += resto.map(function (x) { return filaPromo(x.l, x.pr); }).join('');
      cont.insertAdjacentHTML('beforeend', html);
    }
  }

  function resenas(idParam) {
    var l = DB.local(idDeURL(idParam)) || DB.activo();
    poner('[data-render="barra-subtitulo"]', l.local.nombre + ' · ' + l.comensal.valoracion +
      ' (' + l.comensal.resenasTotal + ' reseñas)');
    var volverResenas = document.querySelector('[data-render="volver"]');
    if (volverResenas) volverResenas.setAttribute('href', hrefRestaurante(l.id));
    poner('[data-render="kicker"]', l.local.nombre.toUpperCase());
    poner('[data-render="sub"]', l.comensal.barrio + ' · ' + l.local.cocina);
    poner('[data-render="media-nota"]', String(l.comensal.valoracion));
    poner('[data-render="media-total"]', l.comensal.resenasTotal + ' reseñas');
    var cont = document.querySelector('[data-render="resenas"]');
    if (!cont) return;
    var lista = DB.resenas(l.id);
    cont.innerHTML = lista.length
      ? lista.map(function (r, i) { return opinionResena(r, i); }).join('')
      : '<div class="sm-vacio"><strong>Sin reseñas todavía</strong>Aún no hay reseñas de este local.</div>';
  }

  function perfil() {
    var c = DB.comensal();

    var g = document.querySelector('[data-render="stat-guardados"]');
    if (g) g.textContent = c.guardados.length + (c.guardados.length === 1 ? ' local' : ' locales');
    var re = document.querySelector('[data-render="stat-resenas"]');
    if (re) re.textContent = c.resenasEscritas + ' escritas';
    var pp = document.querySelector('[data-render="stat-platos"]');
    if (pp) pp.textContent = c.platosProbados + ' probados';

    var cont = document.querySelector('[data-render="guardados"]');
    if (cont) {
      var guardados = c.guardados.map(function (id) { return DB.local(id); }).filter(Boolean);
      cont.querySelectorAll('.cm-local-tarjeta, .sm-vacio').forEach(function (n) { n.remove(); });
      cont.insertAdjacentHTML('beforeend', guardados.length
        ? guardados.map(function (l) { return tarjetaLocal(l, true); }).join('')
        : '<div class="sm-vacio"><strong>Nada guardado todavía</strong>Guarda locales o platos con el ícono de marcador.</div>');
      cont.querySelectorAll('[data-quitar]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          DB.alternarGuardado(btn.getAttribute('data-quitar'));
          perfil();
          SaborMapIconos.pintar(cont);
        });
      });
    }

    document.querySelectorAll('[data-preferencia]').forEach(function (input) {
      var clave = input.getAttribute('data-preferencia');
      input.checked = !!DB.preferencias()[clave];
      input.addEventListener('change', function () {
        DB.guardarPreferencia(clave, input.checked);
      });
    });
  }

  function plato(idParam, platoParam) {
    var l = DB.local(idDeURL(idParam)) || DB.activo();
    var pid = platoParam || platoDeURL();
    var p = null;
    l.platos.forEach(function (x) { if (x.id === pid) p = x; });
    if (!p) p = l.platos[0];
    if (!p) return;
    var e = DB.efectivo(p, l.ingredientes);
    var pf = DB.precioFinal(l.id, p);

    poner('[data-render="barra-titulo"]', p.nombre);
    poner('[data-render="barra-subtitulo"]', l.local.nombre + ' · ' + l.comensal.barrio);
    var volver = document.querySelector('[data-render="volver"]');
    if (volver) volver.setAttribute('href', hrefRestaurante(l.id));

    var hero = document.querySelector('[data-render="hero"]');
    if (hero) {
      hero.setAttribute('src', '../assets/img/' + (p.foto || l.comensal.foto));
      hero.setAttribute('alt', p.nombre);
    }
    var bandas = document.querySelector('[data-render="bandas"]');
    if (bandas) {
      bandas.innerHTML = (pf.promo && pf.promo.tipo === 'porcentaje')
        ? '<span class="cm-banda cm-banda--marca"><span data-icono="fuego" data-tamano="14"></span>−' + pf.promo.valor + '% hoy</span>'
        : '';
    }

    poner('[data-render="nombre"]', p.nombre);
    var precios = document.querySelector('[data-render="precios"]');
    if (precios) {
      precios.innerHTML = '<strong class="cm-precios-plato__actual">' + precio(pf.precio) + '</strong>' +
        (pf.anterior ? '<span class="cm-precios-plato__anterior">' + precio(pf.anterior) + '</span>' : '');
    }

    var enlace = document.querySelector('[data-render="enlace-local"]');
    if (enlace) {
      enlace.setAttribute('href', hrefRestaurante(l.id));
      poner('[data-render="enlace-nombre"]', l.local.nombre);
      poner('[data-render="enlace-sub"]', l.comensal.barrio + ' · a ' + distanciaTexto(l.comensal.distancia) + ' de ti');
    }

    /* Caja de disponibilidad con el color del estado. */
    var caja = document.querySelector('[data-render="disponibilidad"]');
    if (caja) {
      var titulo, icono, nota;
      if (e === 'disponible') {
        caja.className = 'cm-aviso-disponibilidad cm-aviso-disponibilidad--disponible';
        titulo = 'Disponible ahora'; icono = 'check'; nota = 'Stock confirmado por la cocina';
      } else if (e === 'pocas') {
        caja.className = 'cm-aviso-disponibilidad';
        titulo = p.porciones ? 'Quedan ' + p.porciones + ' porciones hoy' : 'Quedan pocas porciones'; icono = 'clock'; nota = 'Suele agotarse pronto';
      } else {
        caja.className = 'cm-aviso-disponibilidad cm-aviso-disponibilidad--agotado';
        titulo = 'Agotado por hoy'; icono = 'refresh'; nota = p.vuelve ? 'Vuelve pronto' : 'Se agotó hoy temprano';
      }
      caja.innerHTML =
        '<h2 class="cm-aviso-disponibilidad__titulo"><span class="cm-aviso-disponibilidad__punto"></span>' + titulo + '</h2>' +
        '<span class="cm-aviso-disponibilidad__nota"><span data-icono="' + icono + '" data-tamano="15"></span>' + nota + '</span>' +
        '<span class="cm-aviso-disponibilidad__nota"><span data-icono="clock" data-tamano="15"></span>Actualizado hace un momento</span>' +
        '<p class="cm-aviso-disponibilidad__detalle">La disponibilidad puede cambiar rápidamente. Activa un aviso si quieres saber cuándo vuelve.</p>';
    }

    var wrapCaract = document.querySelector('[data-render="caracteristicas-wrap"]');
    if (wrapCaract) {
      var etiquetas = p.etiquetas || [];
      if (etiquetas.length) {
        wrapCaract.hidden = false;
        document.querySelector('[data-render="caracteristicas"]').innerHTML =
          etiquetas.map(function (id) { return '<span class="cm-atributo">' + esc(nombreEtiqueta(id)) + '</span>'; }).join('');
      } else wrapCaract.hidden = true;
    }
    poner('[data-render="preparacion"]', p.descripcion || '');

    document.querySelectorAll('[data-guardar]').forEach(function (b) {
      b.setAttribute('data-guardar', l.id);
      b.classList.toggle('cm-activo', DB.estaGuardado(l.id));
    });

    var cartaLink = document.querySelector('[data-render="carta-link"]');
    if (cartaLink) {
      cartaLink.setAttribute('href', hrefRestaurante(l.id));
      poner('[data-render="carta-link-texto"]', 'Ver la carta completa de ' + l.local.nombre);
    }
  }

  /* ================= Guardados ================= */

  function wireGuardados() {
    document.querySelectorAll('[data-guardar]').forEach(function (btn) {
      if (btn.dataset.guardadoWired) return;
      btn.dataset.guardadoWired = '1';
      btn.classList.toggle('cm-activo', DB.estaGuardado(btn.getAttribute('data-guardar')));
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var idAhora = btn.getAttribute('data-guardar');
        if (!idAhora) return;
        var ahora = DB.alternarGuardado(idAhora);
        btn.classList.toggle('cm-activo', ahora);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireGuardados);
  else wireGuardados();

  window.SaborMapRender = {
    explorar: explorar,
    restaurante: restaurante,
    platos: platos,
    promociones: promociones,
    resenas: resenas,
    plato: plato,
    perfil: perfil,
    wireGuardados: wireGuardados
  };
})();
