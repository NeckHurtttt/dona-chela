(function () {
  const C = window.CHELA_CONFIG || {};
  const $ = id => document.getElementById(id);
  const JURADO = new URLSearchParams(location.search).has('jurado');

  // Cara de la abuela (SVG propio).
  const CARA = `<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="22" r="16" fill="#cfc8c2"/>
  <ellipse cx="50" cy="58" rx="30" ry="33" fill="#cfc8c2"/><ellipse cx="50" cy="60" rx="24" ry="27" fill="#e9b48f"/>
  <circle cx="40" cy="57" r="8" fill="none" stroke="#5b3b2a" stroke-width="2.5"/><circle cx="60" cy="57" r="8" fill="none" stroke="#5b3b2a" stroke-width="2.5"/>
  <path d="M48 57h4" stroke="#5b3b2a" stroke-width="2.5"/><circle cx="40" cy="57" r="2.2" fill="#2b2220"/><circle cx="60" cy="57" r="2.2" fill="#2b2220"/>
  <path d="M41 73q9 7 18 0" fill="none" stroke="#9c3d2b" stroke-width="3" stroke-linecap="round"/>
  <circle cx="33" cy="68" r="4" fill="#f08f7a" opacity=".5"/><circle cx="67" cy="68" r="4" fill="#f08f7a" opacity=".5"/></svg>`;
  ['cara', 'caraMini', 'caraFin'].forEach(id => $(id).innerHTML = CARA);

  const EJEMPLOS = [
    { creado: '2026-11-18T21:10:00Z', guion: 'Falso nieto', cuenta: '4010223345', banco: 'BNB', titular: 'Marco Antonio Vaca', minutos: 23, ejemplo: true },
    { creado: '2026-11-19T15:42:00Z', guion: 'Premio Tigo', celular: '76543210', banco: 'Tigo Money', titular: 'Luis Rojas Peña', minutos: 31, ejemplo: true },
    { creado: '2026-11-19T19:05:00Z', guion: 'Cuenta bloqueada', cuenta: '1501987766', banco: 'Mercantil', titular: 'Jhonny Suárez', minutos: 17, ejemplo: true, tx: '0xejemplo' },
    { creado: '2026-11-20T09:30:00Z', guion: 'Empleo falso', cuenta: '3300456789012', banco: 'Unión', titular: 'Rosa Mendoza Ch', minutos: 42, ejemplo: true },
  ];
  const CHIPS = [
    'Abuela, soy yo, tu nieto. Tuve un accidente y necesito plata urgente',
    '¡Felicidades! Ganó Bs 5.000 en el sorteo de Tigo',
    'Depositá a la cuenta 4010 5566 7788 del BNB',
    'La cuenta está a nombre de Carlos Gutiérrez Pinto',
    'Te mando el QR ahorita, pagá ya',
    'Pasame el código que te llegó por SMS',
  ];

  let estado, historial, inicio, timer, ultimoCaso;
  const LS = 'chela-casos';
  const leerLocal = () => { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } };
  const guardarLocal = l => { try { localStorage.setItem(LS, JSON.stringify(l)); } catch {} };

  // ---------- chat ----------
  function reiniciar() {
    estado = Chela.nuevoEstado(); historial = []; inicio = null; clearInterval(timer);
    $('reloj').textContent = '00:00';
    $('msgs').innerHTML = '<div class="msg sis">Tú haces de estafador. Escríbele como si quisieras robarle.</div>';
    ['cuenta', 'banco', 'titular', 'celular', 'qr'].forEach(k => { const b = $('d-' + k); b.textContent = '…'; b.className = 'vacio'; });
    $('denunciar').disabled = true;
  }
  function burbuja(quien, texto) {
    const d = document.createElement('div');
    d.className = 'msg ' + quien;
    if (quien === 'chela') { const q = document.createElement('span'); q.className = 'quien'; q.textContent = 'Doña Chela'; d.append(q); }
    d.append(document.createTextNode(texto));
    $('msgs').append(d); $('msgs').scrollTop = 1e9;
  }
  function anotar(datos) {
    for (const d of datos || []) {
      if (!['cuenta', 'banco', 'titular', 'celular', 'qr'].includes(d.tipo)) continue;
      if (estado.datos[d.tipo] && $('d-' + d.tipo).className !== 'vacio') continue;
      estado.datos[d.tipo] = d.valor;
      const b = $('d-' + d.tipo);
      b.textContent = d.tipo === 'qr' ? '✓ pedido' : d.valor;
      b.className = 'nuevo';
    }
    $('denunciar').disabled = !(estado.datos.cuenta || estado.datos.celular);
  }
  function tick() {
    const s = Math.floor((Date.now() - inicio) / 1000);
    $('reloj').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  async function cerebro(texto) {
    if (C.N8N_URL) {
      try {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 15000);
        const r = await fetch(C.N8N_URL + '/chela', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
          body: JSON.stringify({ historial: historial.slice(0, -1), mensaje: texto, datos: estado.datos }) });
        clearTimeout(to);
        if (r.ok) {
          const j = await r.json();
          if (j.respuesta) { $('modo').textContent = 'en línea · IA'; return { respuesta: j.respuesta, datos: [...(j.datos || []), ...Chela.extraer(texto)] }; }
        }
      } catch (e) { console.warn('n8n no respondió, uso el respaldo', e); }
    }
    $('modo').textContent = C.N8N_URL ? 'en línea · respaldo' : 'en línea';
    return Chela.responder(estado, texto);
  }
  async function enviar(texto) {
    texto = texto.trim(); if (!texto) return;
    if (!inicio) { inicio = Date.now(); timer = setInterval(tick, 1000); }
    burbuja('estafa', texto); historial.push({ rol: 'estafador', texto });
    $('txt').value = '';
    const t = document.createElement('div'); t.className = 'typing'; t.textContent = 'Doña Chela está escribiendo…';
    $('msgs').append(t); $('msgs').scrollTop = 1e9;
    const [res] = await Promise.all([cerebro(texto), new Promise(r => setTimeout(r, 900 + Math.random() * 900))]);
    t.remove();
    burbuja('chela', res.respuesta); historial.push({ rol: 'chela', texto: res.respuesta });
    anotar(res.datos);
  }
  $('form').addEventListener('submit', e => { e.preventDefault(); enviar($('txt').value); });
  CHIPS.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c; b.onclick = () => enviar(c); $('chips').append(b); });
  $('reiniciar').onclick = reiniciar;

  // ---------- caso, hash y lista ----------
  function guion() {
    const t = historial.filter(h => h.rol === 'estafador').map(h => h.texto).join(' ').toLowerCase();
    if (/nieto|abuel|accidente/.test(t)) return 'Falso nieto';
    if (/premio|sorteo|gan[oó]/.test(t)) return 'Premio falso';
    if (/bloque|banco|tarjeta|c[oó]digo/.test(t)) return 'Cuenta bloqueada';
    if (/trabajo|empleo/.test(t)) return 'Empleo falso';
    return 'Otro';
  }
  async function sha256(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  $('denunciar').onclick = async () => {
    clearInterval(timer);
    const D = estado.datos;
    const caso = { creado: new Date().toISOString(), canal: 'web', guion: guion(), cuenta: D.cuenta || null, celular: D.celular || null,
      banco: D.banco || null, titular: D.titular || null, qr: !!D.qr, minutos: Math.max(1, Math.round((Date.now() - inicio) / 60000)) };
    caso.hash = await sha256(JSON.stringify([caso.cuenta, caso.celular, caso.banco, caso.titular, caso.guion, caso.creado]));
    if (C.N8N_URL) {
      try {
        const r = await fetch(C.N8N_URL + '/chela-caso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(caso) });
        const j = await r.json(); if (j.id) caso.id = j.id;
      } catch (e) { console.warn('No se guardó en Supabase', e); }
    }
    if (!caso.id) { caso.local = true; guardarLocal([caso, ...leerLocal()]); }
    ultimoCaso = caso;
    $('finTit').textContent = '¡Atrapado en ' + caso.minutos + ' min!';
    $('finTxt').textContent = `Chela le sacó ${[caso.cuenta && 'la cuenta', caso.celular && 'el celular', caso.banco && 'el banco', caso.titular && 'el titular'].filter(Boolean).join(', ')}. Ya está en la lista negra.`;
    $('finHash').textContent = 'Huella del caso (SHA-256): ' + caso.hash;
    $('selloRes').textContent = ''; $('sellar').disabled = false;
    $('fin').showModal();
    cargarLista();
  };
  $('cerrar').onclick = () => { $('fin').close(); reiniciar(); };

  // Sello en Avalanche Fuji: transacción a uno mismo con la huella en "data".
  const FUJI = { chainId: '0xa869', chainName: 'Avalanche Fuji C-Chain', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'], blockExplorerUrls: ['https://testnet.snowtrace.io/'] };
  $('sellar').onclick = async () => {
    const out = $('selloRes');
    if (!window.ethereum) { out.textContent = 'Necesitas Core o MetaMask para sellar. La huella ya quedó guardada.'; return; }
    try {
      $('sellar').disabled = true; out.textContent = 'Abriendo la billetera…';
      const [from] = await ethereum.request({ method: 'eth_requestAccounts' });
      try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: FUJI.chainId }] }); }
      catch (e) { if (e.code === 4902) await ethereum.request({ method: 'wallet_addEthereumChain', params: [FUJI] }); else throw e; }
      const tx = await ethereum.request({ method: 'eth_sendTransaction', params: [{ from, to: from, value: '0x0', data: '0x' + ultimoCaso.hash }] });
      ultimoCaso.tx = tx;
      if (ultimoCaso.id && C.SUPABASE_URL) await sb('rpc/sellar_caso', { method: 'POST', body: JSON.stringify({ p_id: ultimoCaso.id, p_tx: tx }) });
      else guardarLocal(leerLocal().map(c => c.hash === ultimoCaso.hash ? { ...c, tx } : c));
      out.innerHTML = 'Sellado ✓ <a target="_blank" rel="noopener" href="https://testnet.snowtrace.io/tx/' + tx + '">ver en Snowtrace</a>';
      cargarLista();
    } catch (e) { out.textContent = 'No se pudo sellar: ' + (e.message || e); $('sellar').disabled = false; }
  };

  function sb(ruta, opt = {}) {
    return fetch(C.SUPABASE_URL + '/rest/v1/' + ruta, { ...opt, headers: { apikey: C.SUPABASE_ANON, Authorization: 'Bearer ' + C.SUPABASE_ANON, 'Content-Type': 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.status === 204 ? null : r.json(); });
  }
  let casos = [];
  async function cargarLista() {
    let remotos = [];
    if (C.SUPABASE_URL && C.SUPABASE_ANON) {
      try { remotos = await sb('casos?select=*&order=creado.desc&limit=100'); $('fuente').textContent = 'En vivo desde Supabase.'; }
      catch { $('fuente').textContent = 'Sin conexión a Supabase: muestro lo guardado en este equipo.'; }
    }
    casos = [...leerLocal(), ...remotos];
    if (!remotos.length) casos.push(...EJEMPLOS);
    const tb = $('lista'); tb.innerHTML = '';
    for (const c of casos) {
      const tr = document.createElement('tr');
      const celdas = [new Date(c.creado).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }), c.guion, c.cuenta || c.celular, c.banco || '—', c.titular || '—', c.minutos];
      for (const v of celdas) { const td = document.createElement('td'); td.textContent = v ?? '—'; tr.append(td); }
      const td = document.createElement('td');
      if (c.tx && /^0x[0-9a-f]{64}$/.test(c.tx)) td.innerHTML = '<a class="tag ok" target="_blank" rel="noopener" href="https://testnet.snowtrace.io/tx/' + c.tx + '">Avalanche ✓</a>';
      else td.innerHTML = '<span class="tag">' + (c.ejemplo ? 'ejemplo' : c.tx ? 'sellado' : 'sin sellar') + '</span>';
      tr.append(td); tb.append(tr);
    }
    animarTotal(casos.reduce((a, c) => a + (+c.minutos || 0), 0));
  }
  let totalActual = 0;
  function animarTotal(n) {
    const desde = totalActual, t0 = performance.now(); totalActual = n;
    const paso = t => { const k = Math.min(1, (t - t0) / 800); $('totalMin').textContent = Math.round(desde + (n - desde) * k); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }

  // ---------- verificador ----------
  $('verif').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('q').value.replace(/\D/g, ''); const out = $('verifRes');
    if (q.length < 7) { out.innerHTML = '<div class="res malo">Escribe al menos 7 dígitos.</div>'; return; }
    const hit = casos.find(c => (c.cuenta || '').includes(q) || (c.celular || '').includes(q) || q.includes(c.cuenta || 'x') || q.includes(c.celular || 'x'));
    out.innerHTML = '';
    const d = document.createElement('div');
    if (hit) { d.className = 'res malo'; d.textContent = `🚫 No transfieras. Reportado como "${hit.guion}"${hit.titular ? ' a nombre de ' + hit.titular : ''}${hit.ejemplo ? ' (caso de ejemplo)' : ''}.`; }
    else { d.className = 'res bueno'; d.textContent = 'No está en la lista. Igual, desconfía si te apuran o te piden códigos.'; }
    out.append(d);
  });

  if (C.TELEGRAM_BOT) { $('tgLink').href = 'https://t.me/' + C.TELEGRAM_BOT; $('tgLink').textContent = '@' + C.TELEGRAM_BOT; }
  reiniciar(); cargarLista();
  if (JURADO) { $('txt').focus(); document.querySelector('.chat').scrollIntoView({ behavior: 'smooth' }); }
})();
