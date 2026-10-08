/* SaborMap · Panel del local (prototipo funcional).
   Sin dependencias. Guarda los cambios en localStorage de este navegador.

   Regla central de disponibilidad:
   - Cada plato tiene un estado manual: disponible | pocas | agotado.
   - Si falta cualquiera de sus ingredientes, el comensal lo ve "agotado"
     sin importar el estado manual (ver efectivo()).
   - Al reponer el ingrediente, el plato vuelve a su estado manual. */
(() => {
  'use strict';

  const DEMO = window.SaborMapDemo;
  const CAT = DEMO.catalogos;
  const Ic = window.SaborMapIconos;
  const CLAVE = 'sabormap.local.v1';
  const RUTA_IMG = '../assets/img/';

  /* ================= Utilidades ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, t = 20) => Ic.svg(n, t);
  const clonar = (o) => JSON.parse(JSON.stringify(o));
  const pesos = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const coincide = (texto, q) => normalizar(texto).includes(normalizar(String(q).trim()));
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const unir = (a) => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]);
  const slug = (s) => normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  const nuevoId = (base) => slug(base) + '-' + Date.now().toString(36);
  const minutos = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const soloNumero = (v) => Number(String(v == null ? '' : v).replace(/[^\d]/g, '')) || 0;
  const rutaFoto = (f) => (!f ? '' : /^(data:|blob:|https?:)/.test(f) ? f : RUTA_IMG + f);

  const fmtFecha = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtDiaMes = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });
  const fmtHora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false });

  function haceCuanto(fecha) {
    const s = (Date.now() - fecha.getTime()) / 1000;
    if (s < 60) return 'hace un momento';
    const m = Math.round(s / 60);
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    return 'el ' + fmtDiaMes.format(fecha);
  }

  function textoVuelve(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const hoy = new Date();
    const manana = new Date(); manana.setDate(hoy.getDate() + 1);
    const hora = fmtHora.format(d);
    if (d.toDateString() === hoy.toDateString()) return `hoy a las ${hora}`;
    if (d.toDateString() === manana.toDateString()) return `mañana a las ${hora}`;
    return `el ${fmtFecha.format(d)} a las ${hora}`;
  }

  /* ================= Estado ================= */
  let estado = cargar();

  function cargar() {
    try {
      const g = localStorage.getItem(CLAVE);
      if (g) {
        const d = JSON.parse(g);
        if (d && d.version === DEMO.datos.version) return d;
      }
    } catch (e) { /* almacenamiento no disponible: se usan los datos de ejemplo */ }
    const d = clonar(DEMO.datos);
    d._actualizado = new Date().toISOString();
    return d;
  }

  function guardar() {
    estado._actualizado = new Date().toISOString();
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (e) {
      aviso('No se pudieron guardar los cambios en este navegador. Se mantendrán hasta que recargues la página.');
    }
  }

  const ui = {
    carta: { q: '', filtro: 'todos' },
    ing: { q: '', filtro: 'todos' },
    promos: { filtro: 'todas' },
    rapido: '',
    localSucio: false,
    fotosBorrador: null,
    portadaBorrador: null,
    fotoEditor: ''
  };

  const ingrediente = (id) => estado.ingredientes.find((i) => i.id === id);
  const plato = (id) => estado.platos.find((p) => p.id === id);
  const promo = (id) => estado.promociones.find((p) => p.id === id);
  const categoria = (id) => estado.categorias.find((c) => c.id === id);
  const platosCon = (ingId) => estado.platos.filter((p) => p.ingredientes.includes(ingId));
  const faltantes = (p) => p.ingredientes.map(ingrediente).filter((i) => i && !i.disponible);

  /** Estado que ve el comensal. */
  function efectivo(p) {
    const f = faltantes(p);
    if (f.length) return { estado: 'agotado', porIngrediente: true, faltantes: f };
    return { estado: p.estado, porIngrediente: false, faltantes: [] };
  }

  const NOMBRE_ESTADO = { disponible: 'Disponible', pocas: 'Pocas porciones', agotado: 'Agotado' };

  /* ================= Piezas de interfaz ================= */
  const pastilla = (clave, texto) => `<span class="sm-estado sm-estado--${clave}">${esc(texto)}</span>`;

  function pastillaPlato(p) {
    const e = efectivo(p);
    if (e.estado === 'pocas') return pastilla('pocas', p.porciones ? `Quedan ${p.porciones}` : 'Pocas porciones');
    return pastilla(e.estado, NOMBRE_ESTADO[e.estado]);
  }

  function miniatura(foto, alt, conTexto) {
    if (foto) return `<img class="sm-miniatura" src="${esc(rutaFoto(foto))}" alt="${esc(alt || '')}" loading="lazy">`;
    return `<span class="sm-miniatura sm-miniatura--vacia">${ic('camera', 18)}${conTexto ? '<span>Sin foto</span>' : ''}</span>`;
  }

  const listaNombres = (ps, max = 3) => {
    const n = ps.map((p) => p.nombre);
    return n.length <= max ? unir(n) : n.slice(0, max).join(', ') + ` y ${n.length - max} más`;
  };

  function campo({ id, etiqueta, control, ayuda, oculto, clase }) {
    return `<div class="sm-campo ${clase || ''}" ${oculto ? 'hidden' : ''} ${id ? `id="campo-${id}"` : ''}>
      <label class="sm-campo__etiqueta" for="${id}">${etiqueta}</label>${control}
      ${ayuda ? `<span class="sm-campo__ayuda" id="${id}-ayuda">${ayuda}</span>` : ''}</div>`;
  }

  function interruptor({ id, nombre, marcado, texto, marca, cambio, datos, oculto }) {
    return `<label class="sm-switch ${marca ? 'sm-switch--marca' : ''}" ${oculto ? 'hidden' : ''}>
      <input type="checkbox" role="switch" ${id ? `id="${id}"` : ''} ${nombre ? `name="${nombre}"` : ''} ${marcado ? 'checked' : ''}
        ${cambio ? `data-cambio="${cambio}"` : ''} ${datos || ''}>
      <span class="sm-switch__pista"></span>${texto}</label>`;
  }

  const dlg = $('#dialogo');

  /* ================= Avisos con deshacer ================= */
  const contAvisos = $('#avisos');

  /* Un diálogo modal tapa todo lo demás, así que mientras está abierto
     los avisos se muestran dentro de él. */
  function ubicarAvisos() {
    const destino = dlg.open ? dlg : document.body;
    if (contAvisos.parentElement !== destino) destino.appendChild(contAvisos);
  }

  function aviso(texto, opciones = {}) {
    const cont = contAvisos;
    ubicarAvisos();
    const el = document.createElement('div');
    el.className = 'sm-aviso';
    el.innerHTML = `<span class="sm-aviso__texto">${esc(texto)}</span>`;
    let t;
    const quitar = () => { clearTimeout(t); el.remove(); };
    if (opciones.accion) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opciones.accion;
      b.addEventListener('click', () => { quitar(); opciones.alHacer(); });
      el.appendChild(b);
    }
    const x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', 'Cerrar aviso');
    x.innerHTML = ic('x', 16);
    x.addEventListener('click', quitar);
    el.appendChild(x);
    cont.appendChild(el);
    while (cont.children.length > 3) cont.firstElementChild.remove();
    t = setTimeout(quitar, opciones.accion ? 7000 : 4500);
  }

  /** Aplica un cambio, lo guarda, vuelve a pintar y ofrece deshacerlo. */
  function cambiar(texto, fn) {
    const antes = JSON.stringify(estado);
    fn();
    guardar();
    render();
    aviso(texto, {
      accion: 'Deshacer',
      alHacer() {
        estado = JSON.parse(antes);
        ui.localSucio = false;
        ui.fotosBorrador = null;
        guardar();
        render();
        aviso('Cambio deshecho.');
      }
    });
  }

  /* ================= Diálogo ================= */

  function abrirDialogo({ titulo, cuerpo, pie, alEnviar }) {
    document.body.appendChild(contAvisos);
    dlg.innerHTML = `<form class="sm-dialogo__form" novalidate>
      <header class="sm-dialogo__cabecera">
        <h2 class="sm-dialogo__titulo" id="dialogo-titulo">${esc(titulo)}</h2>
        <button type="button" class="sm-btn sm-btn--icono sm-btn--texto" data-accion="cerrar-dialogo" aria-label="Cerrar">${ic('x', 22)}</button>
      </header>
      <div class="sm-dialogo__cuerpo">${cuerpo}</div>
      <footer class="sm-dialogo__pie">${pie}</footer>
    </form>`;
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (e) => { e.preventDefault(); if (alEnviar) alEnviar(form); });
    form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('input[type="search"], [data-enter]')) return;
      e.preventDefault();
      const accion = e.target.dataset.enter;
      if (accion && ACCIONES[accion]) ACCIONES[accion](e.target);
    });
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('.sm-dialogo__cuerpo').scrollTop = 0;
    return form;
  }

  function cerrarDialogo() {
    document.body.appendChild(contAvisos);
    if (dlg.open) dlg.close();
    dlg.innerHTML = '';
  }

  dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrarDialogo(); });
  dlg.addEventListener('close', () => { document.body.appendChild(contAvisos); });

  function limpiarErrores(form) {
    $$('.sm-campo__error', form).forEach((n) => n.remove());
    $$('[aria-invalid="true"]', form).forEach((n) => { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-errormessage'); });
  }

  function marcarError(form, id, mensaje) {
    const control = form.querySelector('#' + id);
    if (!control) return;
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-errormessage', id + '-error');
    const msg = document.createElement('span');
    msg.className = 'sm-campo__error';
    msg.id = id + '-error';
    msg.textContent = mensaje;
    (control.closest('.sm-campo') || control.parentElement).appendChild(msg);
  }

  function enfocarPrimerError(form) {
    const n = form.querySelector('[aria-invalid="true"]');
    if (n) n.focus();
    return !!n;
  }

  /* ================= Horario y promociones ================= */
  function estadoApertura(ahora = new Date()) {
    const L = estado.local;
    if (L.cierreTemporal.activo) return { abierto: false, texto: 'Cerrado temporalmente' };
    const m = ahora.getHours() * 60 + ahora.getMinutes();
    const hoy = L.horario.find((h) => h.dia === ahora.getDay());
    const ayer = L.horario.find((h) => h.dia === (ahora.getDay() + 6) % 7);
    if (ayer && ayer.abierto && minutos(ayer.hasta) <= minutos(ayer.desde) && m < minutos(ayer.hasta)) {
      return { abierto: true, texto: `Abierto · cierra a las ${ayer.hasta}` };
    }
    if (hoy && hoy.abierto) {
      const desde = minutos(hoy.desde);
      let hasta = minutos(hoy.hasta);
      if (hasta <= desde) hasta += 1440;
      if (m >= desde && m < hasta) return { abierto: true, texto: `Abierto · cierra a las ${hoy.hasta}` };
      if (m < desde) return { abierto: false, texto: `Cerrado · abre hoy a las ${hoy.desde}` };
    }
    return { abierto: false, texto: 'Cerrado por hoy' };
  }

  const ORDEN_DIAS = CAT.diasSemana.map((d) => d.dia);

  function textoDias(dias) {
    const idx = ORDEN_DIAS.map((d, i) => (dias.includes(d) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return 'Sin días';
    if (idx.length === 7) return 'Todos los días';
    if (idx.length === 2 && idx[0] === 5 && idx[1] === 6) return 'Fines de semana';
    const seguidos = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
    if (seguidos && idx.length >= 3) return `${capital(CAT.diasSemana[idx[0]].nombre)} a ${CAT.diasSemana[idx[idx.length - 1]].nombre}`;
    return idx.map((i) => CAT.diasSemana[i].corto).join(', ');
  }

  const textoHorarioPromo = (pr) => (pr.todoElDia ? 'todo el día' : `de ${pr.desde} a ${pr.hasta}`);

  function insigniaPromo(pr) {
    switch (pr.tipo) {
      case 'porcentaje': return `−${pr.valor || 0}%`;
      case '2x1': return '2x1';
      case 'precio': return pesos(pr.valor);
      case 'menu': return `Menú ${pesos(pr.valor)}`;
      default: return 'Promo';
    }
  }

  function precioConPromo(pr, p) {
    if (!p) return null;
    if (pr.tipo === 'porcentaje' && pr.valor) return Math.round((p.precio * (1 - pr.valor / 100)) / 10) * 10;
    if (pr.tipo === 'precio' && pr.valor) return pr.valor;
    return null;
  }

  function estadoPromo(pr, ahora = new Date()) {
    if (!pr.activa) return { clave: 'pausada', texto: 'Pausada', tono: 'sin-info' };
    if (pr.finaliza && new Date(pr.finaliza + 'T23:59:59') < ahora) return { clave: 'finalizada', texto: 'Finalizada', tono: 'sin-info' };
    if (estado.local.cierreTemporal.activo) return { clave: 'oculta', texto: 'Oculta: local cerrado', tono: 'pocas' };
    if (pr.platoId) {
      const p = plato(pr.platoId);
      if (!p) return { clave: 'oculta', texto: 'Oculta: el plato ya no existe', tono: 'pocas' };
      if (!p.visible) return { clave: 'oculta', texto: 'Oculta: plato oculto', tono: 'pocas' };
      if (efectivo(p).estado === 'agotado') return { clave: 'oculta', texto: 'Oculta: plato agotado', tono: 'pocas' };
    }
    const m = ahora.getHours() * 60 + ahora.getMinutes();
    const esHoy = pr.dias.includes(ahora.getDay());
    if (esHoy && (pr.todoElDia || (m >= minutos(pr.desde) && m < minutos(pr.hasta)))) {
      return { clave: 'visible', texto: 'Visible ahora', tono: 'disponible' };
    }
    if (esHoy && !pr.todoElDia && m < minutos(pr.desde)) return { clave: 'programada', texto: `Hoy desde las ${pr.desde}`, tono: 'sin-info' };
    return { clave: 'programada', texto: 'Fuera de horario', tono: 'sin-info' };
  }

  const promosVisiblesDePlato = (id) => estado.promociones.filter((pr) => pr.platoId === id && estadoPromo(pr).clave === 'visible');

  /* ================= Secciones ================= */
  const SECCIONES = {
    inicio: { titulo: 'Inicio', render: renderInicio },
    carta: { titulo: 'Carta', render: renderCarta },
    ingredientes: { titulo: 'Ingredientes', render: renderIngredientes },
    promociones: { titulo: 'Promociones', render: renderPromociones },
    local: { titulo: 'Información del local', render: renderLocal }
  };

  /* ---------- Inicio ---------- */
  function renderInicio() {
    const L = estado.local;
    const ahora = new Date();
    const ap = estadoApertura(ahora);
    const visibles = estado.platos.filter((p) => p.visible);
    const n = { disponible: 0, pocas: 0, agotado: 0 };
    visibles.forEach((p) => { n[efectivo(p).estado] += 1; });
    const ingAgotados = estado.ingredientes.filter((i) => !i.disponible);
    const pocas = visibles.filter((p) => efectivo(p).estado === 'pocas');
    const promosHoy = estado.promociones.filter((pr) => pr.activa && pr.dias.includes(ahora.getDay()));
    const sinFoto = visibles.filter((p) => !p.foto);

    return `
      <header class="seccion-cabecera">
        <div class="seccion-cabecera__textos">
          <p class="seccion-fecha">${esc(capital(fmtFecha.format(ahora)))}</p>
          <h1 tabindex="-1">Hoy en ${esc(L.nombre)}</h1>
          <div class="seccion-estado">${pastilla(ap.abierto ? 'disponible' : 'sin-info', ap.texto)}</div>
          <p>Los comensales ven tu carta y la disponibilidad de cada plato en vivo.</p>
        </div>
      </header>
      <div class="inicio-rejilla">
        <div class="inicio-col">
          ${tarjetaRapida()}
          ${tarjetaIngredientesAgotados(ingAgotados)}
          ${tarjetaPocas(pocas)}
        </div>
        <div class="inicio-col">
          ${tarjetaSemaforo(n, visibles.length)}
          ${tarjetaPromosHoy(promosHoy)}
          ${sinFoto.length ? tarjetaSinFoto(sinFoto) : ''}
        </div>
      </div>`;
  }

  function tarjetaRapida() {
    return `<section class="sm-tarjeta tarjeta-rapida" aria-labelledby="t-rapido">
      <h2 class="titulo-tarjeta" id="t-rapido">Marcar agotado rápido</h2>
      <p class="subtitulo-tarjeta">Busca un ingrediente o un plato y cambia su disponibilidad en un toque.</p>
      <label class="sm-buscador" for="rapido">${ic('search')}<span class="sm-visually-hidden">Buscar ingrediente o plato</span>
        <input id="rapido" type="search" placeholder="Ej.: pescado, tiramisú" autocomplete="off" value="${esc(ui.rapido)}" data-filtro="rapido">
      </label>
      <div id="rapido-resultados">${resultadosRapidos()}</div>
    </section>`;
  }

  function resultadosRapidos() {
    const q = ui.rapido.trim();
    let ings;
    let pls = [];
    let nota = '';
    if (!q) {
      ings = [...estado.ingredientes].sort((a, b) => platosCon(b.id).length - platosCon(a.id).length).slice(0, 4);
      nota = 'Ingredientes que usan más platos';
    } else {
      ings = estado.ingredientes.filter((i) => coincide(i.nombre, q)).slice(0, 5);
      pls = estado.platos.filter((p) => coincide(p.nombre, q)).slice(0, 5);
    }
    if (q && !ings.length && !pls.length) {
      return `<div class="sm-vacio"><strong>Sin resultados para «${esc(q)}»</strong><span>Prueba con otro nombre o revisa la carta completa.</span></div>`;
    }
    return `${nota ? `<p class="resultados__nota">${nota}</p>` : ''}<div class="resultados">${ings.map(filaRapidaIngrediente).join('')}${pls.map(filaRapidaPlato).join('')}</div>`;
  }

  function botonAgotarIngrediente(i) {
    return i.disponible
      ? `<button type="button" class="sm-btn sm-btn--chico sm-btn--agotar-suave" id="ra-${i.id}" data-accion="agotar-ingrediente" data-id="${i.id}" aria-label="Marcar ${esc(i.nombre)} como agotado">Marcar agotado</button>`
      : `<button type="button" class="sm-btn sm-btn--chico sm-btn--reponer" id="ra-${i.id}" data-accion="reponer-ingrediente" data-id="${i.id}" aria-label="Reponer ${esc(i.nombre)}">Reponer</button>`;
  }

  function filaRapidaIngrediente(i) {
    const usos = platosCon(i.id);
    return `<div class="resultado">
      <span class="resultado__icono ${i.disponible ? '' : 'resultado__icono--agotado'}">${ic(i.disponible ? 'ingredientes' : 'alert')}</span>
      <div class="resultado__info">
        <span class="resultado__nombre">${esc(i.nombre)}</span>
        <span class="resultado__detalle">Ingrediente · ${usos.length ? plural(usos.length, 'plato', 'platos') : 'sin platos'}</span>
        ${i.disponible ? '' : pastilla('agotado', 'Agotado')}
      </div>
      ${botonAgotarIngrediente(i)}
    </div>`;
  }

  function filaRapidaPlato(p) {
    const e = efectivo(p);
    let boton;
    if (e.porIngrediente) {
      boton = `<button type="button" class="sm-btn sm-btn--chico sm-btn--reponer" id="rp-${p.id}" data-accion="reponer-faltantes" data-id="${p.id}" aria-label="Reponer ${esc(unir(e.faltantes.map((i) => i.nombre)))}">Reponer ingrediente</button>`;
    } else if (e.estado === 'agotado') {
      boton = `<button type="button" class="sm-btn sm-btn--chico sm-btn--reponer" id="rp-${p.id}" data-accion="estado-rapido" data-id="${p.id}" data-estado="disponible" aria-label="Marcar ${esc(p.nombre)} como disponible">Disponible</button>`;
    } else {
      boton = `<button type="button" class="sm-btn sm-btn--chico sm-btn--agotar-suave" id="rp-${p.id}" data-accion="estado-rapido" data-id="${p.id}" data-estado="agotado" aria-label="Marcar ${esc(p.nombre)} como agotado">Marcar agotado</button>`;
    }
    const cat = categoria(p.categoria);
    return `<div class="resultado">
      ${miniatura(p.foto, '')}
      <div class="resultado__info">
        <span class="resultado__nombre">${esc(p.nombre)}</span>
        <span class="resultado__detalle">Plato · ${esc(cat ? cat.nombre : 'Sin categoría')}${e.porIngrediente ? ` · falta ${esc(unir(e.faltantes.map((i) => i.nombre)))}` : ''}</span>
        ${pastillaPlato(p)}
      </div>
      ${boton}
    </div>`;
  }

  function tarjetaSemaforo(n, total) {
    const seg = (k, color) => (n[k] ? `<span style="flex: ${n[k]}; background: ${color}"></span>` : '');
    return `<section class="sm-tarjeta" aria-labelledby="t-semaforo">
      <div class="tarjeta-cabeza">
        <h2 class="titulo-tarjeta" id="t-semaforo">Semáforo de tu carta</h2>
        <a class="enlace-tarjeta" href="#carta">Ver carta${ic('chevRight', 16)}</a>
      </div>
      <p class="subtitulo-tarjeta">${plural(total, 'plato visible', 'platos visibles')} para los comensales.</p>
      <div class="semaforo-barra" aria-hidden="true">${seg('disponible', 'var(--sm-available-dot)')}${seg('pocas', 'var(--sm-low-dot)')}${seg('agotado', 'var(--sm-sold-out-dot)')}</div>
      <div class="semaforo-leyenda">
        <a class="leyenda--disponible" href="#carta?filtro=disponible"><strong>${n.disponible}</strong><span>Disponibles</span></a>
        <a class="leyenda--pocas" href="#carta?filtro=pocas"><strong>${n.pocas}</strong><span>Pocas porciones</span></a>
        <a class="leyenda--agotado" href="#carta?filtro=agotado"><strong>${n.agotado}</strong><span>Agotados</span></a>
      </div>
      <p class="nota-vivo">${ic('live', 16)}<span>Último cambio publicado <span id="hace-actualizado">${haceCuanto(new Date(estado._actualizado))}</span>.</span></p>
    </section>`;
  }

  function tarjetaIngredientesAgotados(lista) {
    const filas = lista.map((i) => {
      const usos = platosCon(i.id);
      return `<li>
        <span class="resultado__icono resultado__icono--agotado">${ic('alert')}</span>
        <div class="resultado__info">
          <span class="resultado__nombre">${esc(i.nombre)}</span>
          <span class="resultado__detalle">${usos.length ? 'Afecta a ' + esc(listaNombres(usos)) : 'No afecta a ningún plato'}</span>
        </div>
        ${botonAgotarIngrediente(i)}
      </li>`;
    }).join('');
    return `<section class="sm-tarjeta" aria-labelledby="t-ing-ag">
      <div class="tarjeta-cabeza">
        <h2 class="titulo-tarjeta" id="t-ing-ag">Ingredientes agotados <span class="cuenta-titulo">${lista.length}</span></h2>
        <a class="enlace-tarjeta" href="#ingredientes">Ver todos${ic('chevRight', 16)}</a>
      </div>
      ${lista.length
        ? `<ul class="lista-simple">${filas}</ul>`
        : `<div class="sm-vacio"><strong>Todos los ingredientes están disponibles</strong><span>Si se acaba alguno, márcalo y sus platos se agotarán solos.</span></div>`}
    </section>`;
  }

  function contador(p) {
    return `<div class="sm-contador" role="group" aria-label="Porciones restantes de ${esc(p.nombre)}">
      <button type="button" id="menos-${p.id}" data-accion="porciones" data-id="${p.id}" data-delta="-1" aria-label="Una porción menos">${ic('minus', 18)}</button>
      <output>${p.porciones ? 'Quedan ' + p.porciones : 'Pocas'}</output>
      <button type="button" id="mas-${p.id}" data-accion="porciones" data-id="${p.id}" data-delta="1" aria-label="Una porción más">${ic('plus', 18)}</button>
    </div>`;
  }

  function tarjetaPocas(lista) {
    return `<section class="sm-tarjeta" aria-labelledby="t-pocas">
      <h2 class="titulo-tarjeta" id="t-pocas">Quedan pocas porciones <span class="cuenta-titulo">${lista.length}</span></h2>
      <p class="subtitulo-tarjeta">Ajusta el número a medida que salen. Al llegar a cero, el plato se marca como agotado.</p>
      ${lista.length
        ? `<ul class="lista-simple">${lista.map((p) => `<li>${miniatura(p.foto, '')}<div class="resultado__info"><span class="resultado__nombre">${esc(p.nombre)}</span></div>${contador(p)}</li>`).join('')}</ul>`
        : `<div class="sm-vacio"><span>Ningún plato tiene pocas porciones.</span></div>`}
    </section>`;
  }

  function tarjetaPromosHoy(lista) {
    return `<section class="sm-tarjeta" aria-labelledby="t-promos">
      <div class="tarjeta-cabeza">
        <h2 class="titulo-tarjeta" id="t-promos">Promociones de hoy <span class="cuenta-titulo">${lista.length}</span></h2>
        <a class="enlace-tarjeta" href="#promociones">Ver todas${ic('chevRight', 16)}</a>
      </div>
      ${lista.length
        ? `<ul class="lista-simple">${lista.map((pr) => {
            const e = estadoPromo(pr);
            return `<li><span class="promo__insignia promo__insignia--chica">${esc(insigniaPromo(pr))}</span>
              <div class="resultado__info"><span class="resultado__nombre">${esc(pr.titulo)}</span>
              <span class="resultado__detalle">${esc(capital(textoHorarioPromo(pr)))}</span></div>${pastilla(e.tono, e.texto)}</li>`;
          }).join('')}</ul>`
        : `<div class="sm-vacio"><span>No tienes promociones para hoy.</span><button type="button" class="sm-btn sm-btn--secundario sm-btn--chico" data-accion="nueva-promo">${ic('plus', 16)}Crear promoción</button></div>`}
    </section>`;
  }

  function tarjetaSinFoto(lista) {
    return `<section class="sm-tarjeta" aria-labelledby="t-sinfoto">
      <h2 class="titulo-tarjeta" id="t-sinfoto">Platos sin foto <span class="cuenta-titulo">${lista.length}</span></h2>
      <p class="subtitulo-tarjeta">Los platos con foto llaman más la atención en la app. Faltan: ${esc(listaNombres(lista))}.</p>
      <div class="pie-tarjeta"><a class="sm-btn sm-btn--secundario sm-btn--chico" href="#carta?filtro=sinfoto">${ic('camera', 16)}Agregar fotos</a></div>
    </section>`;
  }

  /* ---------- Carta ---------- */
  const FILTROS_CARTA = [
    ['todos', 'Todos'], ['disponible', 'Disponibles'], ['pocas', 'Pocas porciones'],
    ['agotado', 'Agotados'], ['ocultos', 'Ocultos'], ['sinfoto', 'Sin foto']
  ];

  function pasaFiltroCarta(p, k) {
    const e = efectivo(p).estado;
    switch (k) {
      case 'disponible': return p.visible && e === 'disponible';
      case 'pocas': return p.visible && e === 'pocas';
      case 'agotado': return p.visible && e === 'agotado';
      case 'ocultos': return !p.visible;
      case 'sinfoto': return !p.foto;
      default: return true;
    }
  }

  function renderCarta() {
    const f = ui.carta;
    return `
      <header class="seccion-cabecera">
        <div class="seccion-cabecera__textos">
          <h1 tabindex="-1">Carta</h1>
          <p>Edita platos, precios, fotos y disponibilidad. Cada cambio se publica al instante para los comensales.</p>
        </div>
        <button type="button" class="sm-btn sm-btn--primario" data-accion="nuevo-plato">${ic('plus')}Agregar plato</button>
      </header>
      <div class="barra-herramientas">
        <label class="sm-buscador" for="buscar-carta">${ic('search')}<span class="sm-visually-hidden">Buscar plato</span>
          <input id="buscar-carta" type="search" placeholder="Buscar plato" autocomplete="off" value="${esc(f.q)}" data-filtro="carta">
        </label>
        <div class="sm-chips" role="group" aria-label="Filtrar platos">
          ${FILTROS_CARTA.map(([k, t]) => `<button type="button" class="sm-chip" id="fc-${k}" aria-pressed="${f.filtro === k}" data-accion="filtro-carta" data-valor="${k}">${t}<span class="sm-chip__cuenta">${estado.platos.filter((p) => pasaFiltroCarta(p, k)).length}</span></button>`).join('')}
        </div>
      </div>
      <div id="carta-lista">${listaCarta()}</div>`;
  }

  function listaCarta() {
    const f = ui.carta;
    const ps = estado.platos.filter((p) => pasaFiltroCarta(p, f.filtro) && (!f.q || coincide(p.nombre + ' ' + p.descripcion, f.q)));
    if (!ps.length) {
      return `<div class="sm-tarjeta sm-vacio"><strong>No hay platos que coincidan</strong><span>Prueba con otro nombre o cambia el filtro.</span>
        <button type="button" class="sm-btn sm-btn--secundario sm-btn--chico" data-accion="limpiar-carta">Ver todos los platos</button></div>`;
    }
    const grupos = estado.categorias.map((c) => ({ id: c.id, nombre: c.nombre, platos: ps.filter((p) => p.categoria === c.id) }));
    const huerfanos = ps.filter((p) => !categoria(p.categoria));
    if (huerfanos.length) grupos.push({ id: 'sin-categoria', nombre: 'Sin categoría', platos: huerfanos });
    return grupos.filter((g) => g.platos.length).map((g) => `
      <section class="carta-categoria" aria-labelledby="cat-${g.id}">
        <h2 id="cat-${g.id}">${esc(g.nombre)} <span class="cuenta-titulo">${g.platos.length}</span></h2>
        <div class="sm-tarjeta lista-tarjeta">${g.platos.map(filaPlato).join('')}</div>
      </section>`).join('');
  }

  function segmentado(nombre, valor, { deshabilitado, cambio, id, etiqueta }) {
    const ops = [['disponible', 'Disponible'], ['pocas', 'Pocas'], ['agotado', 'Agotado']];
    return `<div class="sm-segmentado" role="radiogroup" aria-label="${esc(etiqueta)}">
      ${ops.map(([k, t]) => `<label class="sm-segmentado__op sm-segmentado__op--${k}">
        <input type="radio" name="${nombre}" id="${nombre}-${k}" value="${k}" ${valor === k ? 'checked' : ''} ${deshabilitado ? 'disabled' : ''}
          ${cambio ? `data-cambio="${cambio}"` : ''} ${id ? `data-id="${id}"` : ''}><span>${t}</span></label>`).join('')}
    </div>`;
  }

  function filaPlato(p) {
    const e = efectivo(p);
    const promoActiva = promosVisiblesDePlato(p.id)[0];
    let nota = '';
    if (e.porIngrediente) {
      nota = `<p class="aviso-linea">${ic('alert', 16)}<span>Agotado porque falta ${e.faltantes.map((i) => `<strong>${esc(i.nombre)}</strong>`).join(', ')}</span>
        <button type="button" class="sm-btn sm-btn--chico sm-btn--reponer" id="rf-${p.id}" data-accion="reponer-faltantes" data-id="${p.id}">${e.faltantes.length === 1 ? 'Reponer' : 'Reponer ingredientes'}</button></p>`;
    } else if (p.estado === 'agotado' && p.vuelve) {
      nota = `<p class="aviso-linea aviso-linea--suave">${ic('clock', 16)}<span>Vuelve ${esc(textoVuelve(p.vuelve))}</span></p>`;
    }
    return `<article class="plato-fila ${p.visible ? '' : 'is-oculto'}">
      <button type="button" class="plato-fila__foto" data-accion="editar-plato" data-id="${p.id}" aria-label="${p.foto ? 'Cambiar foto de' : 'Agregar foto a'} ${esc(p.nombre)}">${miniatura(p.foto, '', true)}</button>
      <div class="plato-fila__info">
        <h3 class="plato-fila__nombre">${esc(p.nombre)}</h3>
        <p class="plato-fila__meta"><strong>${pesos(p.precio)}</strong>
          ${promoActiva ? `<span class="insignia insignia--promo">${esc(insigniaPromo(promoActiva))} hoy</span>` : ''}
          ${p.visible ? '' : `<span class="insignia insignia--oculto">${ic('eyeOff', 13)}Oculto en la carta</span>`}
        </p>
        ${nota}
      </div>
      <button type="button" class="sm-btn sm-btn--borde sm-btn--chico plato-fila__editar" id="ed-${p.id}" data-accion="editar-plato" data-id="${p.id}" aria-label="Editar ${esc(p.nombre)}">${ic('pencil', 16)}<span class="texto-boton">Editar</span></button>
      <div class="plato-fila__controles">
        ${segmentado('est-' + p.id, e.porIngrediente ? 'agotado' : p.estado, { deshabilitado: e.porIngrediente, cambio: 'estado-plato', id: p.id, etiqueta: 'Disponibilidad de ' + p.nombre })}
        ${!e.porIngrediente && p.estado === 'pocas' ? contador(p) : ''}
      </div>
    </article>`;
  }

  /* ---------- Editor de plato ---------- */
  function vistaFotoEditor(foto) {
    return foto
      ? `<img class="foto-editor__vista" src="${esc(rutaFoto(foto))}" alt="Foto actual del plato">`
      : `<span class="sm-miniatura sm-miniatura--vacia">${ic('camera', 22)}<span>Sin foto</span></span>`;
  }

  function chipIngrediente(i, marcado) {
    return `<label class="sm-opcion ${i.disponible ? '' : 'sm-opcion--agotada'}" data-nombre="${esc(normalizar(i.nombre))}">
      <input type="checkbox" name="ing" value="${i.id}" ${marcado ? 'checked' : ''}><span>${esc(i.nombre)}${i.disponible ? '' : ' · agotado'}</span></label>`;
  }

  function chipsIngredientes(seleccion) {
    return estado.gruposIngredientes.map((g) => {
      const ings = estado.ingredientes.filter((i) => i.grupo === g.id);
      if (!ings.length) return '';
      return `<div class="opciones-grupo"><p class="opciones-grupo__titulo">${esc(g.nombre)}</p>
        <div class="opciones">${ings.map((i) => chipIngrediente(i, seleccion.includes(i.id))).join('')}</div></div>`;
    }).join('');
  }

  function abrirEditorPlato(id) {
    const nuevo = !id;
    const base = nuevo
      ? { id: '', nombre: '', descripcion: '', categoria: (estado.categorias[0] || {}).id || '', precio: '', foto: '', ingredientes: [], etiquetas: [], estado: 'disponible', porciones: null, vuelve: '', visible: true }
      : plato(id);
    if (!base) return;
    ui.fotoEditor = base.foto || '';
    const e = nuevo ? null : efectivo(base);

    const cuerpo = `
      <div class="foto-editor">
        <div id="ed-foto-vista">${vistaFotoEditor(ui.fotoEditor)}</div>
        <div class="foto-editor__acciones">
          <input class="input-archivo" type="file" id="ed-foto" accept="image/*" data-cambio="foto-plato">
          <label for="ed-foto" class="sm-btn sm-btn--secundario sm-btn--chico">${ic('camera', 16)}<span id="ed-foto-texto">${ui.fotoEditor ? 'Cambiar foto' : 'Subir foto'}</span></label>
          <button type="button" class="sm-btn sm-btn--texto sm-btn--chico" id="ed-foto-quitar" data-accion="quitar-foto-plato" ${ui.fotoEditor ? '' : 'hidden'}>${ic('trash', 16)}Quitar foto</button>
          <span class="sm-campo__ayuda">JPG o PNG. Se ajusta automáticamente.</span>
        </div>
      </div>

      <div class="form-rejilla" style="margin-top: 18px">
        ${campo({ id: 'ed-nombre', etiqueta: 'Nombre del plato', control: `<input class="sm-input" id="ed-nombre" name="nombre" value="${esc(base.nombre)}" maxlength="80" required autocomplete="off">` })}
        ${campo({ id: 'ed-descripcion', etiqueta: 'Descripción', ayuda: 'Ingredientes principales, preparación o tamaño. Máximo 200 caracteres.', control: `<textarea class="sm-textarea" id="ed-descripcion" name="descripcion" maxlength="200" aria-describedby="ed-descripcion-ayuda">${esc(base.descripcion)}</textarea>` })}
        <div class="form-rejilla form-rejilla--2">
          ${campo({ id: 'ed-precio', etiqueta: 'Precio', control: `<div class="sm-prefijo"><span>$</span><input class="sm-input" id="ed-precio" name="precio" inputmode="numeric" value="${base.precio ? esc(Number(base.precio).toLocaleString('es-CL')) : ''}" placeholder="12.500" autocomplete="off"></div>` })}
          ${campo({ id: 'ed-categoria', etiqueta: 'Categoría', control: `<select class="sm-select" id="ed-categoria" name="categoria" data-cambio="categoria-editor">
              ${estado.categorias.map((c) => `<option value="${c.id}" ${c.id === base.categoria ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
              <option value="__nueva">+ Nueva categoría…</option></select>` })}
        </div>
        ${campo({ id: 'ed-nueva-cat', etiqueta: 'Nombre de la nueva categoría', oculto: true, control: `<input class="sm-input" id="ed-nueva-cat" name="nuevaCategoria" maxlength="40" autocomplete="off">` })}
      </div>

      <section class="form-bloque" aria-labelledby="ed-disp-titulo">
        <h3 class="form-bloque__titulo" id="ed-disp-titulo">Disponibilidad</h3>
        ${e && e.porIngrediente ? `<div class="caja-nota">${ic('alert', 18)}<span>Ahora se muestra <strong>agotado</strong> porque falta ${esc(unir(e.faltantes.map((i) => i.nombre)))}. El estado que elijas se aplicará cuando ${e.faltantes.length === 1 ? 'repongas ese ingrediente' : 'repongas esos ingredientes'}.</span></div>` : ''}
        ${segmentado('estado', base.estado, { cambio: 'estado-editor', etiqueta: 'Disponibilidad del plato' })}
        <div class="form-rejilla form-rejilla--2">
          ${campo({ id: 'ed-porciones', etiqueta: 'Porciones restantes', oculto: base.estado !== 'pocas', control: `<input class="sm-input" type="number" min="1" max="999" id="ed-porciones" name="porciones" inputmode="numeric" value="${base.porciones || ''}">` })}
          ${campo({ id: 'ed-vuelve', etiqueta: 'Vuelve a estar disponible (opcional)', oculto: base.estado !== 'agotado', ayuda: 'Los comensales verán cuándo vuelve.', control: `<input class="sm-input" type="datetime-local" id="ed-vuelve" name="vuelve" value="${esc(base.vuelve || '')}" aria-describedby="ed-vuelve-ayuda">` })}
        </div>
        ${interruptor({ nombre: 'visible', marcado: base.visible, marca: true, texto: 'Mostrar este plato en la carta' })}
      </section>

      <section class="form-bloque" aria-labelledby="ed-ing-titulo">
        <h3 class="form-bloque__titulo" id="ed-ing-titulo">Ingredientes</h3>
        <p class="sm-campo__ayuda" style="margin: 0">Si uno de estos ingredientes se agota, el plato se mostrará agotado automáticamente.</p>
        <label class="sm-buscador" for="ed-ing-buscar">${ic('search', 18)}<span class="sm-visually-hidden">Filtrar ingredientes</span>
          <input type="search" id="ed-ing-buscar" placeholder="Filtrar ingredientes" autocomplete="off" data-filtro="ing-editor"></label>
        <div class="ing-editor" id="ed-ing-lista">${chipsIngredientes(base.ingredientes)}</div>
        <div class="fila-nuevo">
          ${campo({ id: 'ed-ing-nuevo', etiqueta: '¿Falta un ingrediente?', control: `<input class="sm-input" id="ed-ing-nuevo" placeholder="Nombre del ingrediente" maxlength="60" autocomplete="off" data-enter="nuevo-ing-editor">` })}
          ${campo({ id: 'ed-ing-grupo', etiqueta: 'Grupo', control: `<select class="sm-select" id="ed-ing-grupo">${estado.gruposIngredientes.map((g) => `<option value="${g.id}" ${g.id === 'otros' ? 'selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select>` })}
          <button type="button" class="sm-btn sm-btn--secundario" data-accion="nuevo-ing-editor">${ic('plus', 18)}Agregar</button>
        </div>
      </section>

      <section class="form-bloque" aria-labelledby="ed-etq-titulo">
        <h3 class="form-bloque__titulo" id="ed-etq-titulo">Etiquetas</h3>
        <div class="opciones">${CAT.etiquetas.map((t) => `<label class="sm-opcion"><input type="checkbox" name="etq" value="${t.id}" ${base.etiquetas.includes(t.id) ? 'checked' : ''}><span>${esc(t.nombre)}</span></label>`).join('')}</div>
      </section>`;

    const pie = `
      ${nuevo ? '' : `<button type="button" class="sm-btn sm-btn--peligro" data-accion="eliminar-plato" data-id="${base.id}" aria-label="Eliminar plato">${ic('trash', 18)}<span class="texto-boton">Eliminar</span></button>`}
      <button type="button" class="sm-btn sm-btn--secundario" data-accion="cerrar-dialogo">Cancelar</button>
      <button type="submit" class="sm-btn sm-btn--primario">${nuevo ? 'Agregar a la carta' : 'Guardar cambios'}</button>`;

    abrirDialogo({ titulo: nuevo ? 'Agregar plato' : 'Editar plato', cuerpo, pie, alEnviar: (form) => guardarPlato(form, base, nuevo) });
    if (nuevo) $('#ed-nombre', dlg).focus();
  }

  function guardarPlato(form, base, nuevo) {
    limpiarErrores(form);
    const fd = new FormData(form);
    const nombre = String(fd.get('nombre') || '').trim();
    const precio = soloNumero(fd.get('precio'));
    let catId = fd.get('categoria');
    const nombreCat = String(fd.get('nuevaCategoria') || '').trim();
    if (!nombre) marcarError(form, 'ed-nombre', 'Escribe el nombre del plato.');
    if (!precio) marcarError(form, 'ed-precio', 'Indica un precio mayor que cero.');
    if (catId === '__nueva' && !nombreCat) marcarError(form, 'ed-nueva-cat', 'Escribe el nombre de la categoría.');
    if (enfocarPrimerError(form)) return;

    const est = fd.get('estado') || 'disponible';
    const datos = {
      nombre,
      descripcion: String(fd.get('descripcion') || '').trim(),
      precio,
      foto: ui.fotoEditor,
      ingredientes: fd.getAll('ing'),
      etiquetas: fd.getAll('etq'),
      estado: est,
      porciones: est === 'pocas' ? Math.max(1, soloNumero(fd.get('porciones')) || 5) : null,
      vuelve: est === 'agotado' ? String(fd.get('vuelve') || '') : '',
      visible: fd.get('visible') === 'on'
    };
    cerrarDialogo();
    cambiar(nuevo ? `${nombre} se agregó a la carta.` : `Cambios guardados en ${nombre}.`, () => {
      if (catId === '__nueva') {
        const existente = estado.categorias.find((c) => normalizar(c.nombre) === normalizar(nombreCat));
        if (existente) catId = existente.id;
        else { catId = nuevoId(nombreCat); estado.categorias.push({ id: catId, nombre: nombreCat }); }
      }
      datos.categoria = catId;
      if (nuevo) estado.platos.push(Object.assign({ id: nuevoId(nombre) }, datos));
      else Object.assign(plato(base.id), datos);
    });
  }

  /** Reduce la imagen a un máximo de 900 px y la devuelve como data URL. */
  function procesarImagen(archivo) {
    return new Promise((resolver, rechazar) => {
      if (!archivo || !archivo.type.startsWith('image/')) { rechazar(new Error('tipo')); return; }
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolver(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('lectura')); };
      img.src = url;
    });
  }

  /* ---------- Ingredientes ---------- */
  function renderIngredientes() {
    const f = ui.ing;
    const agotados = estado.ingredientes.filter((i) => !i.disponible);
    const afectados = estado.platos.filter((p) => efectivo(p).porIngrediente);
    const sinUso = estado.ingredientes.filter((i) => !platosCon(i.id).length);
    const filtros = [['todos', 'Todos', estado.ingredientes.length], ['agotados', 'Agotados', agotados.length], ['sinuso', 'Sin usar', sinUso.length]];
    const resumen = agotados.length
      ? `<div class="aviso-resumen" role="note">${ic('alert')}<span><strong>${plural(agotados.length, 'ingrediente agotado', 'ingredientes agotados')}:</strong> ${esc(unir(agotados.map((i) => i.nombre)))}. ${afectados.length ? `Por eso ${afectados.length === 1 ? 'se muestra agotado 1 plato' : `se muestran agotados ${afectados.length} platos`}.` : 'No afecta a ningún plato.'}</span></div>`
      : `<div class="aviso-resumen aviso-resumen--info" role="note">${ic('check')}<span>Todos los ingredientes están disponibles.</span></div>`;
    return `
      <header class="seccion-cabecera">
        <div class="seccion-cabecera__textos">
          <h1 tabindex="-1">Ingredientes</h1>
          <p>Si se acaba un ingrediente, márcalo como agotado y todos los platos que lo usan se mostrarán agotados automáticamente. Al reponerlo, cada plato vuelve a su estado anterior.</p>
        </div>
        <button type="button" class="sm-btn sm-btn--primario" data-accion="nuevo-ingrediente">${ic('plus')}Agregar ingrediente</button>
      </header>
      ${resumen}
      <div class="barra-herramientas">
        <label class="sm-buscador" for="buscar-ing">${ic('search')}<span class="sm-visually-hidden">Buscar ingrediente</span>
          <input id="buscar-ing" type="search" placeholder="Buscar ingrediente" autocomplete="off" value="${esc(f.q)}" data-filtro="ingredientes">
        </label>
        <div class="sm-chips" role="group" aria-label="Filtrar ingredientes">
          ${filtros.map(([k, t, n]) => `<button type="button" class="sm-chip" id="fi-${k}" aria-pressed="${f.filtro === k}" data-accion="filtro-ing" data-valor="${k}">${t}<span class="sm-chip__cuenta">${n}</span></button>`).join('')}
        </div>
      </div>
      <div id="ing-lista">${listaIngredientes()}</div>`;
  }

  function listaIngredientes() {
    const f = ui.ing;
    const pasa = (i) => (f.filtro === 'agotados' ? !i.disponible : f.filtro === 'sinuso' ? !platosCon(i.id).length : true) && (!f.q || coincide(i.nombre, f.q));
    const grupos = estado.gruposIngredientes.map((g) => {
      const ings = estado.ingredientes.filter((i) => i.grupo === g.id && pasa(i));
      if (!ings.length) return '';
      return `<section class="sm-tarjeta ing-grupo" aria-labelledby="g-${g.id}">
        <h2 id="g-${g.id}">${esc(g.nombre)} <span class="cuenta-titulo">${ings.length}</span></h2>
        <ul class="ing-lista">${ings.map(filaIngrediente).join('')}</ul></section>`;
    }).join('');
    if (!grupos) {
      return `<div class="sm-tarjeta sm-vacio"><strong>No hay ingredientes que coincidan</strong>
        <button type="button" class="sm-btn sm-btn--secundario sm-btn--chico" data-accion="limpiar-ing">Ver todos los ingredientes</button></div>`;
    }
    return `<div class="ing-grupos">${grupos}</div>`;
  }

  function filaIngrediente(i) {
    const usos = platosCon(i.id);
    return `<li class="ing-fila ${i.disponible ? '' : 'is-agotado'}">
      <div class="ing-fila__info">
        <span class="ing-fila__nombre">${esc(i.nombre)}${i.disponible ? '' : pastilla('agotado', 'Agotado')}</span>
        <span class="ing-fila__usos">${usos.length ? `${plural(usos.length, 'plato', 'platos')}: ${esc(listaNombres(usos))}` : 'No se usa en ningún plato'}</span>
      </div>
      ${interruptor({ id: 'sw-' + i.id, marcado: i.disponible, cambio: 'ingrediente', datos: `data-id="${i.id}"`, texto: `<span class="sm-visually-hidden">${esc(i.nombre)}: </span><span class="ing-fila__texto-switch">Disponible</span>` })}
      <button type="button" class="sm-btn sm-btn--icono sm-btn--texto" id="edi-${i.id}" data-accion="editar-ingrediente" data-id="${i.id}" aria-label="Editar ${esc(i.nombre)}">${ic('pencil', 18)}</button>
    </li>`;
  }

  function pedirAgotarIngrediente(id) {
    const i = ingrediente(id);
    if (!i || !i.disponible) return;
    const usos = platosCon(id);
    if (!usos.length) {
      cambiar(`${i.nombre} marcado como agotado.`, () => { i.disponible = false; });
      return;
    }
    const nuevos = usos.filter((p) => efectivo(p).estado !== 'agotado');
    const filas = usos.map((p) => {
      const ya = efectivo(p).estado === 'agotado';
      return `<li>${miniatura(p.foto, '')}
        <span class="lista-afectados__nombre">${esc(p.nombre)}${p.visible ? '' : ' <span class="insignia insignia--oculto">Oculto</span>'}</span>
        <span class="cambio-estado">${ya ? '<span class="sm-campo__ayuda">Ya estaba agotado</span>' : `${pastillaPlato(p)}${ic('arrowRight', 14)}${pastilla('agotado', 'Agotado')}`}</span></li>`;
    }).join('');
    abrirDialogo({
      titulo: `¿Marcar «${i.nombre}» como agotado?`,
      cuerpo: `<p class="texto-dialogo">Los platos que lo usan se mostrarán agotados a los comensales hasta que repongas el ingrediente.</p>
        <ul class="lista-afectados">${filas}</ul>`,
      pie: `<button type="button" class="sm-btn sm-btn--secundario" data-accion="cerrar-dialogo">Cancelar</button>
        <button type="submit" class="sm-btn sm-btn--agotar">${nuevos.length ? `Agotar ${plural(nuevos.length, 'plato', 'platos')}` : 'Marcar agotado'}</button>`,
      alEnviar: () => {
        cerrarDialogo();
        cambiar(`${i.nombre} agotado.${nuevos.length ? ` ${nuevos.length === 1 ? '1 plato pasó' : nuevos.length + ' platos pasaron'} a agotado.` : ''}`, () => { i.disponible = false; });
      }
    });
  }

  function reponerIngredientes(ids) {
    const ings = ids.map(ingrediente).filter((i) => i && !i.disponible);
    if (!ings.length) return;
    const vuelven = estado.platos.filter((p) => {
      const f = faltantes(p);
      return f.length && f.every((x) => ids.includes(x.id)) && p.estado !== 'agotado';
    });
    const nombres = unir(ings.map((i) => i.nombre));
    const texto = `${nombres} ${ings.length === 1 ? 'disponible' : 'disponibles'}.` +
      (vuelven.length ? ` ${vuelven.length === 1 ? '1 plato vuelve a estar disponible' : vuelven.length + ' platos vuelven a estar disponibles'}.` : '');
    cambiar(texto, () => { ings.forEach((i) => { i.disponible = true; }); });
  }

  function abrirEditorIngrediente(id) {
    const nuevo = !id;
    const i = nuevo ? { nombre: '', grupo: 'otros' } : ingrediente(id);
    if (!i) return;
    const usos = nuevo ? [] : platosCon(id);
    const cuerpo = `<div class="form-rejilla">
      ${campo({ id: 'ei-nombre', etiqueta: 'Nombre', control: `<input class="sm-input" id="ei-nombre" name="nombre" value="${esc(i.nombre)}" maxlength="60" required autocomplete="off">` })}
      ${campo({ id: 'ei-grupo', etiqueta: 'Grupo', control: `<select class="sm-select" id="ei-grupo" name="grupo">${estado.gruposIngredientes.map((g) => `<option value="${g.id}" ${g.id === i.grupo ? 'selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select>` })}
      ${usos.length ? `<div class="caja-nota caja-nota--info">${ic('info', 18)}<span>Se usa en ${plural(usos.length, 'plato', 'platos')}: ${esc(unir(usos.map((p) => p.nombre)))}. Para cambiarlo, edita cada plato desde la carta.</span></div>` : ''}
    </div>`;
    const pie = `${nuevo ? '' : `<button type="button" class="sm-btn sm-btn--peligro" data-accion="eliminar-ingrediente" data-id="${id}" aria-label="Eliminar ingrediente">${ic('trash', 18)}<span class="texto-boton">Eliminar</span></button>`}
      <button type="button" class="sm-btn sm-btn--secundario" data-accion="cerrar-dialogo">Cancelar</button>
      <button type="submit" class="sm-btn sm-btn--primario">${nuevo ? 'Agregar ingrediente' : 'Guardar'}</button>`;
    abrirDialogo({
      titulo: nuevo ? 'Agregar ingrediente' : 'Editar ingrediente',
      cuerpo,
      pie,
      alEnviar: (form) => {
        limpiarErrores(form);
        const nombre = String(new FormData(form).get('nombre') || '').trim();
        const grupoId = new FormData(form).get('grupo');
        if (!nombre) marcarError(form, 'ei-nombre', 'Escribe el nombre del ingrediente.');
        else if (estado.ingredientes.some((x) => x.id !== id && normalizar(x.nombre) === normalizar(nombre))) marcarError(form, 'ei-nombre', 'Ya existe un ingrediente con ese nombre.');
        if (enfocarPrimerError(form)) return;
        cerrarDialogo();
        cambiar(nuevo ? `${nombre} se agregó a los ingredientes.` : `Cambios guardados en ${nombre}.`, () => {
          if (nuevo) estado.ingredientes.push({ id: nuevoId(nombre), nombre, grupo: grupoId, disponible: true });
          else Object.assign(ingrediente(id), { nombre, grupo: grupoId });
        });
      }
    });
    $('#ei-nombre', dlg).focus();
  }

  /* ---------- Promociones ---------- */
  function renderPromociones() {
    const f = ui.promos.filtro;
    const filtros = [['todas', 'Todas'], ['activas', 'Activas'], ['pausadas', 'Pausadas']];
    const pasa = (pr, k) => (k === 'activas' ? pr.activa : k === 'pausadas' ? !pr.activa : true);
    const lista = estado.promociones.filter((pr) => pasa(pr, f));
    return `
      <header class="seccion-cabecera">
        <div class="seccion-cabecera__textos">
          <h1 tabindex="-1">Promociones</h1>
          <p>Publica ofertas para los comensales cercanos. SaborMap solo las muestra: cada promoción se aplica directamente en tu local.</p>
        </div>
        <button type="button" class="sm-btn sm-btn--primario" data-accion="nueva-promo">${ic('plus')}Nueva promoción</button>
      </header>
      <div class="barra-herramientas">
        <div class="sm-chips" role="group" aria-label="Filtrar promociones">
          ${filtros.map(([k, t]) => `<button type="button" class="sm-chip" id="fp-${k}" aria-pressed="${f === k}" data-accion="filtro-promo" data-valor="${k}">${t}<span class="sm-chip__cuenta">${estado.promociones.filter((pr) => pasa(pr, k)).length}</span></button>`).join('')}
        </div>
      </div>
      ${lista.length
        ? `<div class="promo-rejilla">${lista.map(tarjetaPromo).join('')}</div>`
        : `<div class="sm-tarjeta sm-vacio"><strong>No hay promociones en esta vista</strong><button type="button" class="sm-btn sm-btn--secundario sm-btn--chico" data-accion="nueva-promo">${ic('plus', 16)}Crear promoción</button></div>`}`;
  }

  function precioPromoHtml(pr, p) {
    const final = precioConPromo(pr, p);
    return final ? `<span class="precio-promo">${pesos(final)}</span> <span class="precio-antes">${pesos(p.precio)}</span>` : pesos(p.precio);
  }

  function tarjetaPromo(pr) {
    const e = estadoPromo(pr);
    const p = pr.platoId ? plato(pr.platoId) : null;
    const fin = pr.finaliza ? ` · hasta el ${fmtDiaMes.format(new Date(pr.finaliza + 'T12:00'))}` : '';
    return `<article class="sm-tarjeta promo ${pr.activa ? '' : 'is-pausada'}">
      <div class="promo__cabeza"><span class="promo__insignia">${esc(insigniaPromo(pr))}</span>${pastilla(e.tono, e.texto)}</div>
      <h2 class="promo__titulo">${esc(pr.titulo)}</h2>
      ${p
        ? `<p class="promo__plato">${miniatura(p.foto, '')}<span>${esc(p.nombre)}<br>${precioPromoHtml(pr, p)}</span></p>`
        : `<p class="promo__dato">${ic('utensils', 16)}Promoción general del local</p>`}
      <p class="promo__dato">${ic('calendar', 16)}<span>${esc(textoDias(pr.dias))}, ${esc(textoHorarioPromo(pr))}${esc(fin)}</span></p>
      ${pr.condiciones ? `<p class="promo__dato">${ic('info', 16)}<span>${esc(pr.condiciones)}</span></p>` : ''}
      <div class="promo__pie">
        ${interruptor({ id: 'sw-pr-' + pr.id, marcado: pr.activa, marca: true, cambio: 'promo-activa', datos: `data-id="${pr.id}"`, texto: `Activa<span class="sm-visually-hidden">: ${esc(pr.titulo)}</span>` })}
        <button type="button" class="sm-btn sm-btn--borde sm-btn--chico" id="edp-${pr.id}" data-accion="editar-promo" data-id="${pr.id}" aria-label="Editar ${esc(pr.titulo)}">${ic('pencil', 16)}Editar</button>
      </div>
    </article>`;
  }

  function vistaPreviaPromo(pr) {
    const p = pr.platoId ? plato(pr.platoId) : null;
    const L = estado.local;
    const portada = (L.fotos.find((f) => f.id === L.portada) || L.fotos[0] || {}).archivo;
    return `<div class="tarjeta-comensal">
      <div class="tarjeta-comensal__foto">${miniatura(p ? p.foto : portada, '')}<span class="promo__insignia">${esc(insigniaPromo(pr))}</span></div>
      <div class="tarjeta-comensal__info">
        <span class="tarjeta-comensal__titulo">${esc(pr.titulo || 'Título de la promoción')}</span>
        <span class="tarjeta-comensal__local">${esc(L.nombre)}</span>
        ${p ? `<span>${precioPromoHtml(pr, p)}</span>` : ''}
        <span class="tarjeta-comensal__local">${esc(textoDias(pr.dias))}, ${esc(textoHorarioPromo(pr))}</span>
      </div>
    </div>`;
  }

  function leerPromo(form) {
    const fd = new FormData(form);
    return {
      titulo: String(fd.get('titulo') || '').trim(),
      tipo: fd.get('tipo') || 'porcentaje',
      valor: soloNumero(fd.get('valor')) || null,
      platoId: fd.get('platoId') || null,
      dias: fd.getAll('dias').map(Number),
      todoElDia: fd.get('todoElDia') === 'on',
      desde: fd.get('desde') || '',
      hasta: fd.get('hasta') || '',
      finaliza: fd.get('finaliza') || '',
      condiciones: String(fd.get('condiciones') || '').trim(),
      activa: fd.get('activa') === 'on'
    };
  }

  function actualizarEditorPromo(form) {
    const pr = leerPromo(form);
    $('#pr-vista', form).innerHTML = vistaPreviaPromo(pr);
    const campoValor = $('#campo-pr-valor', form);
    campoValor.hidden = pr.tipo === '2x1';
    $('label[for="pr-valor"]', form).textContent = pr.tipo === 'porcentaje' ? 'Descuento (%)' : pr.tipo === 'menu' ? 'Precio del menú' : 'Precio promocional';
    $('#pr-valor-prefijo', form).hidden = pr.tipo === 'porcentaje';
    $('#pr-valor', form).style.paddingLeft = pr.tipo === 'porcentaje' ? '14px' : '';
    $('#pr-horas', form).hidden = pr.todoElDia;
    const p = pr.platoId ? plato(pr.platoId) : null;
    const nota = $('#pr-nota-plato', form);
    nota.hidden = !(p && efectivo(p).estado === 'agotado');
  }

  function abrirEditorPromo(id) {
    const nuevo = !id;
    const pr = nuevo
      ? { titulo: '', tipo: 'porcentaje', valor: 15, platoId: null, dias: [1, 2, 3, 4, 5, 6, 0], todoElDia: true, desde: '12:30', hasta: '16:00', finaliza: '', condiciones: '', activa: true }
      : promo(id);
    if (!pr) return;
    const opcionesPlatos = estado.categorias.map((c) => {
      const ps = estado.platos.filter((p) => p.categoria === c.id);
      if (!ps.length) return '';
      return `<optgroup label="${esc(c.nombre)}">${ps.map((p) => `<option value="${p.id}" ${p.id === pr.platoId ? 'selected' : ''}>${esc(p.nombre)} · ${pesos(p.precio)}</option>`).join('')}</optgroup>`;
    }).join('');

    const cuerpo = `
      <div class="vista-previa">
        <p class="vista-previa__etiqueta">Así la verán los comensales</p>
        <div id="pr-vista">${vistaPreviaPromo(pr)}</div>
      </div>
      <div class="form-rejilla">
        ${campo({ id: 'pr-titulo', etiqueta: 'Título', control: `<input class="sm-input" id="pr-titulo" name="titulo" value="${esc(pr.titulo)}" maxlength="60" placeholder="Ej.: 20% en Pizza Diavola" autocomplete="off">` })}
        <fieldset class="sm-fieldset">
          <legend class="sm-campo__etiqueta">Tipo de promoción</legend>
          <div class="opciones">${CAT.tiposPromocion.map((t) => `<label class="sm-opcion"><input type="radio" name="tipo" value="${t.id}" ${t.id === pr.tipo ? 'checked' : ''} data-cambio="tipo-promo"><span>${esc(t.nombre)}</span></label>`).join('')}</div>
        </fieldset>
        <div class="form-rejilla form-rejilla--2">
          ${campo({ id: 'pr-valor', etiqueta: 'Descuento (%)', control: `<div class="sm-prefijo"><span id="pr-valor-prefijo">$</span><input class="sm-input" id="pr-valor" name="valor" inputmode="numeric" value="${pr.valor ? esc(pr.tipo === 'porcentaje' ? pr.valor : Number(pr.valor).toLocaleString('es-CL')) : ''}" autocomplete="off"></div>` })}
          ${campo({ id: 'pr-plato', etiqueta: 'Plato (opcional)', control: `<select class="sm-select" id="pr-plato" name="platoId"><option value="">Ninguno: promoción general</option>${opcionesPlatos}</select>` })}
        </div>
        <div class="caja-nota caja-nota--pocas" id="pr-nota-plato" hidden>${ic('alert', 18)}<span>Ese plato está agotado. La promoción no se mostrará hasta que vuelva a estar disponible.</span></div>
      </div>
      <section class="form-bloque" aria-labelledby="pr-cuando">
        <h3 class="form-bloque__titulo" id="pr-cuando">Cuándo se muestra</h3>
        <fieldset class="sm-fieldset">
          <legend class="sm-campo__etiqueta">Días</legend>
          <div class="opciones">${CAT.diasSemana.map((d) => `<label class="sm-opcion"><input type="checkbox" name="dias" value="${d.dia}" ${pr.dias.includes(d.dia) ? 'checked' : ''}><span>${d.corto}</span></label>`).join('')}</div>
        </fieldset>
        ${interruptor({ nombre: 'todoElDia', marcado: pr.todoElDia, marca: true, texto: 'Todo el día' })}
        <div class="form-rejilla form-rejilla--2" id="pr-horas" ${pr.todoElDia ? 'hidden' : ''}>
          ${campo({ id: 'pr-desde', etiqueta: 'Desde', control: `<input class="sm-input" type="time" id="pr-desde" name="desde" value="${esc(pr.desde)}">` })}
          ${campo({ id: 'pr-hasta', etiqueta: 'Hasta', control: `<input class="sm-input" type="time" id="pr-hasta" name="hasta" value="${esc(pr.hasta)}">` })}
        </div>
        ${campo({ id: 'pr-finaliza', etiqueta: 'Fecha de término (opcional)', ayuda: 'Si la dejas vacía, la promoción sigue hasta que la pauses.', control: `<input class="sm-input" type="date" id="pr-finaliza" name="finaliza" value="${esc(pr.finaliza)}" aria-describedby="pr-finaliza-ayuda">` })}
      </section>
      <section class="form-bloque" aria-labelledby="pr-cond-titulo">
        <h3 class="form-bloque__titulo" id="pr-cond-titulo">Condiciones</h3>
        ${campo({ id: 'pr-condiciones', etiqueta: 'Condiciones (opcional)', ayuda: 'Ej.: válido solo para consumo en el local, no acumulable.', control: `<textarea class="sm-textarea" id="pr-condiciones" name="condiciones" maxlength="160" aria-describedby="pr-condiciones-ayuda">${esc(pr.condiciones)}</textarea>` })}
        ${interruptor({ nombre: 'activa', marcado: pr.activa, marca: true, texto: 'Promoción activa' })}
      </section>`;

    const pie = `${nuevo ? '' : `<button type="button" class="sm-btn sm-btn--peligro" data-accion="eliminar-promo" data-id="${pr.id}" aria-label="Eliminar promoción">${ic('trash', 18)}<span class="texto-boton">Eliminar</span></button>`}
      <button type="button" class="sm-btn sm-btn--secundario" data-accion="cerrar-dialogo">Cancelar</button>
      <button type="submit" class="sm-btn sm-btn--primario">${nuevo ? 'Publicar promoción' : 'Guardar cambios'}</button>`;

    const form = abrirDialogo({
      titulo: nuevo ? 'Nueva promoción' : 'Editar promoción',
      cuerpo,
      pie,
      alEnviar: (f) => guardarPromo(f, pr, nuevo)
    });
    form.addEventListener('input', () => actualizarEditorPromo(form));
    form.addEventListener('change', () => actualizarEditorPromo(form));
    actualizarEditorPromo(form);
  }

  function guardarPromo(form, base, nuevo) {
    limpiarErrores(form);
    const datos = leerPromo(form);
    if (!datos.titulo) marcarError(form, 'pr-titulo', 'Escribe un título para la promoción.');
    if (datos.tipo === 'porcentaje' && !(datos.valor >= 1 && datos.valor <= 90)) marcarError(form, 'pr-valor', 'Indica un descuento entre 1 y 90 %.');
    if ((datos.tipo === 'precio' || datos.tipo === 'menu') && !datos.valor) marcarError(form, 'pr-valor', 'Indica el precio.');
    if (datos.tipo === '2x1') datos.valor = null;
    if (!datos.todoElDia && (!datos.desde || !datos.hasta || minutos(datos.hasta) <= minutos(datos.desde))) marcarError(form, 'pr-hasta', 'La hora de término debe ser posterior a la de inicio.');
    if (!datos.dias.length) {
      const fs = form.querySelector('input[name="dias"]');
      if (fs) {
        fs.setAttribute('aria-invalid', 'true');
        const msg = document.createElement('span');
        msg.className = 'sm-campo__error';
        msg.textContent = 'Elige al menos un día.';
        fs.closest('fieldset').appendChild(msg);
      }
    }
    if (enfocarPrimerError(form)) return;
    cerrarDialogo();
    cambiar(nuevo ? 'Promoción publicada.' : 'Promoción actualizada.', () => {
      if (nuevo) estado.promociones.unshift(Object.assign({ id: nuevoId(datos.titulo) }, datos));
      else Object.assign(promo(base.id), datos);
    });
  }

  /* ---------- Información del local ---------- */
  function renderLocal() {
    const L = estado.local;
    if (!ui.fotosBorrador) {
      ui.fotosBorrador = clonar(L.fotos);
      ui.portadaBorrador = L.portada;
    }
    const filasHorario = CAT.diasSemana.map((d) => {
      const h = L.horario.find((x) => x.dia === d.dia) || { dia: d.dia, abierto: false, desde: '12:30', hasta: '23:00' };
      return `<div class="horario__fila" data-dia="${d.dia}">
        <span class="horario__dia" aria-hidden="true">${d.nombre}</span>
        <label class="sm-switch">
          <input type="checkbox" role="switch" name="abierto-${d.dia}" ${h.abierto ? 'checked' : ''} data-cambio="dia-abierto" aria-label="Abierto el ${d.nombre}">
          <span class="sm-switch__pista"></span><span class="horario__estado" aria-hidden="true">${h.abierto ? 'Abierto' : 'Cerrado'}</span>
        </label>
        <div class="horario__horas" ${h.abierto ? '' : 'hidden'}>
          <input class="sm-input" type="time" name="desde-${d.dia}" value="${esc(h.desde)}" aria-label="Hora de apertura del ${d.nombre}">
          <span>a</span>
          <input class="sm-input" type="time" name="hasta-${d.dia}" value="${esc(h.hasta)}" aria-label="Hora de cierre del ${d.nombre}">
        </div>
      </div>`;
    }).join('');

    return `
      <header class="seccion-cabecera">
        <div class="seccion-cabecera__textos">
          <h1 tabindex="-1">Información del local</h1>
          <p>Lo que ven los comensales en la ficha de tu restaurante: datos, fotos, horario y servicios.</p>
        </div>
      </header>
      <form id="form-local" class="local-secciones" novalidate>
        <section class="sm-tarjeta local-tarjeta" aria-labelledby="t-datos">
          <h2 class="titulo-tarjeta" id="t-datos">Datos generales</h2>
          <div class="form-rejilla">
            ${campo({ id: 'lo-nombre', etiqueta: 'Nombre del local', control: `<input class="sm-input" id="lo-nombre" name="nombre" value="${esc(L.nombre)}" maxlength="60" required autocomplete="organization">` })}
            ${campo({ id: 'lo-descripcion', etiqueta: 'Descripción corta', ayuda: 'Aparece bajo el nombre. Máximo 160 caracteres.', control: `<textarea class="sm-textarea" id="lo-descripcion" name="descripcion" maxlength="160" aria-describedby="lo-descripcion-ayuda">${esc(L.descripcion)}</textarea>` })}
            <div class="form-rejilla form-rejilla--2">
              ${campo({ id: 'lo-cocina', etiqueta: 'Tipo de cocina', control: `<input class="sm-input" id="lo-cocina" name="cocina" value="${esc(L.cocina)}" maxlength="40">` })}
              ${campo({ id: 'lo-rango', etiqueta: 'Rango de precio', control: `<select class="sm-select" id="lo-rango" name="rangoPrecio">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === L.rangoPrecio ? 'selected' : ''}>${'$'.repeat(n)} · ${['Económico', 'Moderado', 'Alto', 'Muy alto'][n - 1]}</option>`).join('')}</select>` })}
              ${campo({ id: 'lo-desde', etiqueta: 'Precio por persona desde', control: `<div class="sm-prefijo"><span>$</span><input class="sm-input" id="lo-desde" name="precioDesde" inputmode="numeric" value="${esc(Number(L.precioDesde).toLocaleString('es-CL'))}"></div>` })}
              ${campo({ id: 'lo-hasta', etiqueta: 'Precio por persona hasta', control: `<div class="sm-prefijo"><span>$</span><input class="sm-input" id="lo-hasta" name="precioHasta" inputmode="numeric" value="${esc(Number(L.precioHasta).toLocaleString('es-CL'))}"></div>` })}
            </div>
            ${campo({ id: 'lo-direccion', etiqueta: 'Dirección', control: `<input class="sm-input" id="lo-direccion" name="direccion" value="${esc(L.direccion)}" autocomplete="street-address">` })}
            <div class="form-rejilla form-rejilla--2">
              ${campo({ id: 'lo-telefono', etiqueta: 'Teléfono', control: `<input class="sm-input" type="tel" id="lo-telefono" name="telefono" value="${esc(L.telefono)}" autocomplete="tel">` })}
              ${campo({ id: 'lo-web', etiqueta: 'Sitio web o red social', control: `<input class="sm-input" id="lo-web" name="web" value="${esc(L.web)}" autocomplete="url">` })}
            </div>
          </div>
        </section>

        <section class="sm-tarjeta local-tarjeta" aria-labelledby="t-fotos">
          <h2 class="titulo-tarjeta" id="t-fotos">Fotos del local</h2>
          <p class="subtitulo-tarjeta">La foto marcada como portada encabeza la ficha de tu restaurante.</p>
          <div class="fotos-rejilla" id="fotos-local">${fotosLocal()}</div>
        </section>

        <section class="sm-tarjeta local-tarjeta" aria-labelledby="t-horario">
          <h2 class="titulo-tarjeta" id="t-horario">Horario de atención</h2>
          <p class="subtitulo-tarjeta">Los comensales verán si estás abierto en este momento. Si cierras después de medianoche, indica la hora de cierre del día siguiente.</p>
          <div class="horario">${filasHorario}</div>
          <button type="button" class="sm-btn sm-btn--texto sm-btn--chico" data-accion="copiar-horario">${ic('copy', 16)}Copiar el horario del lunes a todos los días</button>
        </section>

        <section class="sm-tarjeta local-tarjeta" aria-labelledby="t-cierre">
          <h2 class="titulo-tarjeta" id="t-cierre">Cierre temporal</h2>
          <p class="subtitulo-tarjeta">Por vacaciones, remodelación o imprevistos. Mientras esté activo, tu local aparecerá cerrado y tus promociones no se mostrarán.</p>
          ${interruptor({ nombre: 'cierreActivo', marcado: L.cierreTemporal.activo, cambio: 'cierre-activo', texto: 'Cerrar temporalmente', marca: true })}
          <div class="form-rejilla form-rejilla--2" id="lo-cierre-campos" ${L.cierreTemporal.activo ? '' : 'hidden'}>
            ${campo({ id: 'lo-motivo', etiqueta: 'Motivo (opcional)', control: `<input class="sm-input" id="lo-motivo" name="cierreMotivo" value="${esc(L.cierreTemporal.motivo)}" maxlength="80" placeholder="Ej.: vacaciones de invierno">` })}
            ${campo({ id: 'lo-cierre-hasta', etiqueta: 'Reabrimos el', control: `<input class="sm-input" type="date" id="lo-cierre-hasta" name="cierreHasta" value="${esc(L.cierreTemporal.hasta)}">` })}
          </div>
        </section>

        <section class="sm-tarjeta local-tarjeta" aria-labelledby="t-servicios">
          <h2 class="titulo-tarjeta" id="t-servicios">Servicios y ambiente</h2>
          <div class="opciones" style="margin-top: 14px">${CAT.servicios.map((s) => `<label class="sm-opcion"><input type="checkbox" name="servicio" value="${s.id}" ${L.servicios.includes(s.id) ? 'checked' : ''}><span>${esc(s.nombre)}</span></label>`).join('')}</div>
        </section>

        <section class="sm-tarjeta local-tarjeta" aria-labelledby="t-reinicio">
          <h2 class="titulo-tarjeta" id="t-reinicio">Reinicio diario de disponibilidad</h2>
          <p class="subtitulo-tarjeta">Cada día, a la hora indicada, los platos e ingredientes agotados vuelven a estar disponibles. Así no tienes que reponerlos uno por uno.</p>
          <div class="form-rejilla form-rejilla--2">
            ${interruptor({ nombre: 'reinicioActivo', marcado: L.reinicioDiario.activo, texto: 'Reiniciar cada día', marca: true })}
            ${campo({ id: 'lo-reinicio-hora', etiqueta: 'Hora del reinicio', control: `<input class="sm-input" type="time" id="lo-reinicio-hora" name="reinicioHora" value="${esc(L.reinicioDiario.hora)}">` })}
          </div>
        </section>

        <div class="barra-guardar" id="barra-guardar" ${ui.localSucio ? '' : 'hidden'}>
          <span>Tienes cambios sin guardar</span>
          <div class="barra-guardar__acciones">
            <button type="button" class="sm-btn sm-btn--texto sm-btn--chico" data-accion="descartar-local">Descartar</button>
            <button type="submit" class="sm-btn sm-btn--primario sm-btn--chico">Guardar cambios</button>
          </div>
        </div>
      </form>
      <div class="zona-prueba">
        <span>¿Probando el prototipo? Puedes volver a los datos de ejemplo cuando quieras.</span>
        <button type="button" class="sm-btn sm-btn--borde sm-btn--chico" data-accion="restablecer">${ic('refresh', 16)}Restablecer datos de prueba</button>
      </div>`;
  }

  function fotosLocal() {
    const fotos = ui.fotosBorrador.map((f) => {
      const esPortada = ui.portadaBorrador === f.id;
      return `<figure class="foto-local">
        <img src="${esc(rutaFoto(f.archivo))}" alt="${esc(f.descripcion || 'Foto del local')}">
        ${esPortada ? '<span class="foto-local__portada">Portada</span>' : ''}
        <figcaption><span>${esc(f.descripcion || 'Foto del local')}</span>
          <span class="acciones-foto">
            <button type="button" id="pf-${f.id}" data-accion="portada-foto" data-id="${f.id}" aria-pressed="${esPortada}" aria-label="Usar ${esc(f.descripcion || 'esta foto')} como portada" title="Usar como portada">${ic('star', 16)}</button>
            <button type="button" data-accion="quitar-foto-local" data-id="${f.id}" aria-label="Quitar ${esc(f.descripcion || 'esta foto')}" title="Quitar foto">${ic('trash', 16)}</button>
          </span>
        </figcaption>
      </figure>`;
    }).join('');
    const agregar = ui.fotosBorrador.length < 10
      ? `<div class="foto-agregar-envoltura"><input class="input-archivo" type="file" id="lo-foto-nueva" accept="image/*" data-cambio="foto-local">
          <label class="foto-agregar" for="lo-foto-nueva">${ic('camera', 24)}Agregar foto</label></div>`
      : '';
    return fotos + agregar;
  }

  function marcarLocalSucio() {
    ui.localSucio = true;
    const b = $('#barra-guardar');
    if (b) b.hidden = false;
    document.body.classList.add('con-barra-guardar');
  }

  function guardarLocal(form) {
    limpiarErrores(form);
    const fd = new FormData(form);
    const nombre = String(fd.get('nombre') || '').trim();
    const desde = soloNumero(fd.get('precioDesde'));
    const hasta = soloNumero(fd.get('precioHasta'));
    if (!nombre) marcarError(form, 'lo-nombre', 'Escribe el nombre del local.');
    if (desde && hasta && desde > hasta) marcarError(form, 'lo-hasta', 'Debe ser mayor o igual que el precio desde.');
    if (enfocarPrimerError(form)) return;
    const fotos = clonar(ui.fotosBorrador);
    const portada = ui.portadaBorrador;
    cambiar('Información del local guardada.', () => {
      const L = estado.local;
      Object.assign(L, {
        nombre,
        descripcion: String(fd.get('descripcion') || '').trim(),
        cocina: String(fd.get('cocina') || '').trim(),
        rangoPrecio: Number(fd.get('rangoPrecio')) || 2,
        precioDesde: desde,
        precioHasta: hasta,
        direccion: String(fd.get('direccion') || '').trim(),
        telefono: String(fd.get('telefono') || '').trim(),
        web: String(fd.get('web') || '').trim(),
        fotos,
        portada,
        horario: CAT.diasSemana.map((d) => {
          const previo = L.horario.find((h) => h.dia === d.dia) || {};
          return {
            dia: d.dia,
            abierto: fd.get('abierto-' + d.dia) === 'on',
            desde: fd.get('desde-' + d.dia) || previo.desde || '12:30',
            hasta: fd.get('hasta-' + d.dia) || previo.hasta || '23:00'
          };
        }),
        cierreTemporal: { activo: fd.get('cierreActivo') === 'on', motivo: String(fd.get('cierreMotivo') || '').trim(), hasta: fd.get('cierreHasta') || '' },
        servicios: fd.getAll('servicio'),
        reinicioDiario: { activo: fd.get('reinicioActivo') === 'on', hora: fd.get('reinicioHora') || '12:00' }
      });
      ui.localSucio = false;
      ui.fotosBorrador = null;
    });
  }

  /* ================= Acciones ================= */
  const ACCIONES = {
    'cerrar-dialogo': () => cerrarDialogo(),

    'filtro-carta': (el) => { ui.carta.filtro = el.dataset.valor; render(); },
    'limpiar-carta': () => { ui.carta = { q: '', filtro: 'todos' }; render(); $('#buscar-carta').focus(); },
    'filtro-ing': (el) => { ui.ing.filtro = el.dataset.valor; render(); },
    'limpiar-ing': () => { ui.ing = { q: '', filtro: 'todos' }; render(); $('#buscar-ing').focus(); },
    'filtro-promo': (el) => { ui.promos.filtro = el.dataset.valor; render(); },

    'nuevo-plato': () => abrirEditorPlato(null),
    'editar-plato': (el) => abrirEditorPlato(el.dataset.id),
    'eliminar-plato': (el) => {
      const p = plato(el.dataset.id);
      cerrarDialogo();
      cambiar(`${p.nombre} se eliminó de la carta.`, () => { estado.platos = estado.platos.filter((x) => x.id !== p.id); });
    },
    'quitar-foto-plato': () => {
      ui.fotoEditor = '';
      $('#ed-foto-vista').innerHTML = vistaFotoEditor('');
      $('#ed-foto-quitar').hidden = true;
      $('#ed-foto-texto').textContent = 'Subir foto';
      $('#ed-foto').focus();
    },
    'nuevo-ing-editor': () => {
      const input = $('#ed-ing-nuevo');
      const nombre = input.value.trim();
      if (!nombre) { input.focus(); return; }
      const existente = estado.ingredientes.find((i) => normalizar(i.nombre) === normalizar(nombre));
      const marcados = $$('#ed-ing-lista input[name="ing"]:checked').map((n) => n.value);
      let idIng;
      if (existente) {
        idIng = existente.id;
        aviso(`${existente.nombre} ya existía y quedó marcado.`);
      } else {
        idIng = nuevoId(nombre);
        estado.ingredientes.push({ id: idIng, nombre, grupo: $('#ed-ing-grupo').value, disponible: true });
        guardar();
        render();
        aviso(`${nombre} se agregó a tus ingredientes.`);
      }
      if (!marcados.includes(idIng)) marcados.push(idIng);
      $('#ed-ing-lista').innerHTML = chipsIngredientes(marcados);
      $('#ed-ing-buscar').value = '';
      input.value = '';
      input.focus();
    },

    'agotar-ingrediente': (el) => pedirAgotarIngrediente(el.dataset.id),
    'reponer-ingrediente': (el) => reponerIngredientes([el.dataset.id]),
    'reponer-faltantes': (el) => reponerIngredientes(faltantes(plato(el.dataset.id)).map((i) => i.id)),
    'nuevo-ingrediente': () => abrirEditorIngrediente(null),
    'editar-ingrediente': (el) => abrirEditorIngrediente(el.dataset.id),
    'eliminar-ingrediente': (el) => {
      const i = ingrediente(el.dataset.id);
      const usos = platosCon(i.id);
      cerrarDialogo();
      cambiar(`${i.nombre} se eliminó${usos.length ? ` y se quitó de ${plural(usos.length, 'plato', 'platos')}` : ''}.`, () => {
        estado.ingredientes = estado.ingredientes.filter((x) => x.id !== i.id);
        estado.platos.forEach((p) => { p.ingredientes = p.ingredientes.filter((x) => x !== i.id); });
      });
    },

    'estado-rapido': (el) => {
      const p = plato(el.dataset.id);
      const valor = el.dataset.estado;
      cambiar(valor === 'agotado' ? `${p.nombre} marcado como agotado.` : `${p.nombre} disponible.`, () => {
        p.estado = valor;
        p.porciones = null;
        p.vuelve = '';
      });
    },
    porciones: (el) => {
      const p = plato(el.dataset.id);
      const n = (p.porciones || 1) + Number(el.dataset.delta);
      if (n <= 0) {
        cambiar(`${p.nombre} se agotó.`, () => { p.estado = 'agotado'; p.porciones = null; });
        return;
      }
      p.porciones = n;
      guardar();
      render();
    },

    'nueva-promo': () => abrirEditorPromo(null),
    'editar-promo': (el) => abrirEditorPromo(el.dataset.id),
    'eliminar-promo': (el) => {
      const pr = promo(el.dataset.id);
      cerrarDialogo();
      cambiar('Promoción eliminada.', () => { estado.promociones = estado.promociones.filter((x) => x.id !== pr.id); });
    },

    'copiar-horario': () => {
      const form = $('#form-local');
      const abierto = form.elements['abierto-1'].checked;
      const desde = form.elements['desde-1'].value;
      const hasta = form.elements['hasta-1'].value;
      CAT.diasSemana.forEach((d) => {
        form.elements['abierto-' + d.dia].checked = abierto;
        form.elements['desde-' + d.dia].value = desde;
        form.elements['hasta-' + d.dia].value = hasta;
        actualizarFilaHorario(form.elements['abierto-' + d.dia]);
      });
      marcarLocalSucio();
      aviso('Horario del lunes copiado a todos los días. Recuerda guardar.');
    },
    'portada-foto': (el) => {
      ui.portadaBorrador = el.dataset.id;
      $('#fotos-local').innerHTML = fotosLocal();
      const b = $('#pf-' + el.dataset.id);
      if (b) b.focus();
      marcarLocalSucio();
    },
    'quitar-foto-local': (el) => {
      ui.fotosBorrador = ui.fotosBorrador.filter((f) => f.id !== el.dataset.id);
      if (ui.portadaBorrador === el.dataset.id) ui.portadaBorrador = (ui.fotosBorrador[0] || {}).id || null;
      $('#fotos-local').innerHTML = fotosLocal();
      marcarLocalSucio();
    },
    'descartar-local': () => {
      ui.localSucio = false;
      ui.fotosBorrador = null;
      render();
      aviso('Cambios descartados.');
    },

    restablecer: () => {
      cambiar('Se restablecieron los datos de prueba.', () => {
        estado = clonar(DEMO.datos);
        ui.localSucio = false;
        ui.fotosBorrador = null;
      });
    }
  };

  function actualizarFilaHorario(input) {
    const fila = input.closest('.horario__fila');
    fila.querySelector('.horario__horas').hidden = !input.checked;
    fila.querySelector('.horario__estado').textContent = input.checked ? 'Abierto' : 'Cerrado';
  }

  const CAMBIOS = {
    'estado-plato': (el) => {
      const p = plato(el.dataset.id);
      const v = el.value;
      if (v === 'agotado') cambiar(`${p.nombre} marcado como agotado.`, () => { p.estado = 'agotado'; p.porciones = null; });
      else if (v === 'pocas') cambiar(`${p.nombre}: indica cuántas porciones quedan.`, () => { p.estado = 'pocas'; p.porciones = p.porciones || 5; p.vuelve = ''; });
      else cambiar(`${p.nombre} disponible.`, () => { p.estado = 'disponible'; p.porciones = null; p.vuelve = ''; });
    },
    ingrediente: (el) => {
      if (!el.checked) {
        el.checked = true;
        pedirAgotarIngrediente(el.dataset.id);
      } else {
        reponerIngredientes([el.dataset.id]);
      }
    },
    'promo-activa': (el) => {
      const pr = promo(el.dataset.id);
      const activa = el.checked;
      cambiar(activa ? `«${pr.titulo}» activada.` : `«${pr.titulo}» pausada.`, () => { pr.activa = activa; });
    },
    'estado-editor': (el) => {
      const form = el.form;
      $('#campo-ed-porciones', form).hidden = el.value !== 'pocas';
      $('#campo-ed-vuelve', form).hidden = el.value !== 'agotado';
      if (el.value === 'pocas' && !$('#ed-porciones', form).value) $('#ed-porciones', form).value = 5;
    },
    'categoria-editor': (el) => {
      const nueva = el.value === '__nueva';
      $('#campo-ed-nueva-cat').hidden = !nueva;
      if (nueva) $('#ed-nueva-cat').focus();
    },
    'tipo-promo': (el) => {
      const valor = $('#pr-valor');
      const n = soloNumero(valor.value);
      if (el.value === 'porcentaje' && !(n >= 1 && n <= 90)) valor.value = 15;
      if ((el.value === 'precio' || el.value === 'menu') && n < 500) {
        const p = plato($('#pr-plato').value);
        valor.value = (p ? Math.round(p.precio * 0.8 / 10) * 10 : 9900).toLocaleString('es-CL');
      }
      actualizarEditorPromo(el.form);
    },
    'foto-plato': async (el) => {
      const archivo = el.files[0];
      if (!archivo) return;
      try {
        ui.fotoEditor = await procesarImagen(archivo);
        $('#ed-foto-vista').innerHTML = vistaFotoEditor(ui.fotoEditor);
        $('#ed-foto-quitar').hidden = false;
        $('#ed-foto-texto').textContent = 'Cambiar foto';
      } catch (e) {
        aviso('No se pudo leer esa imagen. Prueba con un archivo JPG o PNG.');
      }
      el.value = '';
    },
    'foto-local': async (el) => {
      const archivo = el.files[0];
      if (!archivo) return;
      try {
        const datos = await procesarImagen(archivo);
        const id = 'f' + Date.now().toString(36);
        ui.fotosBorrador.push({ id, archivo: datos, descripcion: archivo.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') });
        if (!ui.portadaBorrador) ui.portadaBorrador = id;
        $('#fotos-local').innerHTML = fotosLocal();
        marcarLocalSucio();
      } catch (e) {
        aviso('No se pudo leer esa imagen. Prueba con un archivo JPG o PNG.');
      }
    },
    'dia-abierto': (el) => actualizarFilaHorario(el),
    'cierre-activo': (el) => { $('#lo-cierre-campos').hidden = !el.checked; }
  };

  const FILTROS = {
    rapido: (el) => { ui.rapido = el.value; $('#rapido-resultados').innerHTML = resultadosRapidos(); },
    carta: (el) => { ui.carta.q = el.value; $('#carta-lista').innerHTML = listaCarta(); },
    ingredientes: (el) => { ui.ing.q = el.value; $('#ing-lista').innerHTML = listaIngredientes(); },
    'ing-editor': (el) => {
      const q = normalizar(el.value.trim());
      $$('#ed-ing-lista .sm-opcion').forEach((l) => { l.hidden = !!q && !l.dataset.nombre.includes(q); });
      $$('#ed-ing-lista .opciones-grupo').forEach((g) => { g.hidden = !g.querySelector('.sm-opcion:not([hidden])'); });
    }
  };

  /* ================= Eventos globales ================= */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-accion]');
    if (!el || !ACCIONES[el.dataset.accion]) return;
    e.preventDefault();
    ACCIONES[el.dataset.accion](el, e);
  });

  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-cambio]');
    if (el && CAMBIOS[el.dataset.cambio]) CAMBIOS[el.dataset.cambio](el, e);
    if (e.target.closest('#form-local') && e.target.type !== 'file') marcarLocalSucio();
  });

  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-filtro]');
    if (el && FILTROS[el.dataset.filtro]) FILTROS[el.dataset.filtro](el, e);
    if (e.target.closest('#form-local')) marcarLocalSucio();
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'form-local') {
      e.preventDefault();
      guardarLocal(e.target);
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (ui.localSucio) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= Navegación ================= */
  const main = $('#contenido');
  let rutaPrevia = null;

  function rutaActual() {
    const [nombre, q] = location.hash.slice(1).split('?');
    return { nombre: SECCIONES[nombre] ? nombre : 'inicio', params: new URLSearchParams(q || '') };
  }

  function aplicarParametros(nombre, params) {
    const filtro = params.get('filtro');
    if (!filtro) return;
    if (nombre === 'carta') ui.carta = { q: '', filtro };
    if (nombre === 'ingredientes') ui.ing = { q: '', filtro };
  }

  function pintarNavegacion(nombre) {
    $$('[data-ruta]').forEach((a) => {
      if (a.dataset.ruta === nombre) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const n = estado.ingredientes.filter((i) => !i.disponible).length;
    $$('[data-cuenta="ingredientes"]').forEach((s) => {
      s.hidden = !n;
      s.innerHTML = `${n}<span class="sm-visually-hidden"> ${n === 1 ? 'agotado' : 'agotados'}</span>`;
    });
    const L = estado.local;
    const portada = L.fotos.find((f) => f.id === L.portada) || L.fotos[0];
    const ap = estadoApertura();
    $('#lateral-local').innerHTML = `${portada ? `<img src="${esc(rutaFoto(portada.archivo))}" alt="">` : ''}
      <div><div class="panel-local__nombre">${esc(L.nombre)}</div>
      <div class="panel-local__estado">${pastilla(ap.abierto ? 'disponible' : 'sin-info', ap.abierto ? 'Abierto ahora' : 'Cerrado')}</div></div>`;
    $('#cabecera-local').textContent = L.nombre;
  }

  function render() {
    const { nombre } = rutaActual();
    const activo = document.activeElement;
    const idFoco = activo && activo.id && main.contains(activo) ? activo.id : null;
    let seleccion = null;
    try { if (idFoco && typeof activo.selectionStart === 'number') seleccion = [activo.selectionStart, activo.selectionEnd]; } catch (e) { /* tipos sin selección */ }
    main.innerHTML = SECCIONES[nombre].render();
    if (idFoco) {
      const n = document.getElementById(idFoco);
      if (n) {
        n.focus({ preventScroll: true });
        if (seleccion) { try { n.setSelectionRange(seleccion[0], seleccion[1]); } catch (e) { /* tipos sin selección */ } }
      }
    }
    pintarNavegacion(nombre);
    document.body.classList.toggle('con-barra-guardar', nombre === 'local' && ui.localSucio);
    document.title = `${SECCIONES[nombre].titulo} · Panel del local · SaborMap`;
  }

  window.addEventListener('hashchange', () => {
    const { nombre, params } = rutaActual();
    if (ui.localSucio && rutaPrevia === 'local' && nombre !== 'local') {
      if (!window.confirm('Tienes cambios sin guardar en la información del local. ¿Salir sin guardarlos?')) {
        history.replaceState(null, '', '#local');
        return;
      }
      ui.localSucio = false;
      ui.fotosBorrador = null;
    }
    if (dlg.open) cerrarDialogo();
    aplicarParametros(nombre, params);
    rutaPrevia = nombre;
    render();
    window.scrollTo(0, 0);
    const h1 = main.querySelector('h1');
    if (h1) h1.focus({ preventScroll: true });
  });

  setInterval(() => {
    const n = $('#hace-actualizado');
    if (n) n.textContent = haceCuanto(new Date(estado._actualizado));
  }, 30000);

  /* ================= Inicio ================= */
  Ic.pintar();
  const inicial = rutaActual();
  aplicarParametros(inicial.nombre, inicial.params);
  rutaPrevia = inicial.nombre;
  render();
})();
