// Doña Chela: extracción de datos + cerebro de respaldo (sin internet ni IA).
(function () {
  const BANCOS = ['BNB', 'Mercantil', 'Unión', 'Union', 'BCP', 'Ganadero', 'Económico', 'Economico', 'FIE', 'Sol', 'Fassil',
    'BISA', 'Tigo Money', 'Prodem', 'Fortaleza', 'Pyme', 'Nacional', 'Crédito', 'Credito', 'Yape', 'Soli'];

  // Saca cuentas, celulares, bancos, titulares y QR de lo que escribe el estafador.
  function extraer(texto) {
    const datos = [];
    const t = ' ' + texto + ' ';
    const nums = t.match(/(?<![\d])\d[\d .-]{6,20}\d(?![\d])/g) || [];
    for (const n of nums) {
      const limpio = n.replace(/\D/g, '');
      if (limpio.length < 7) continue;
      if (/^[67]\d{7}$/.test(limpio) || /^591[67]\d{7}$/.test(limpio)) datos.push({ tipo: 'celular', valor: limpio.replace(/^591/, '') });
      else if (limpio.length >= 8 && limpio.length <= 18) datos.push({ tipo: 'cuenta', valor: limpio });
    }
    for (const b of BANCOS) {
      if (new RegExp('\\b' + b + '\\b', 'i').test(t)) { datos.push({ tipo: 'banco', valor: normalizaBanco(b) }); break; }
    }
    const tit = t.match(/(?:a nombre de|titular(?: es)?|nombre(?: es)?|me llamo|soy (?:el |la )?(?:licenciad[oa]|ingenier[oa]|doctor[a]?|sargento|teniente)?)\s*:?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/);
    if (tit) datos.push({ tipo: 'titular', valor: tit[1].trim() });
    if (/\bqr\b/i.test(t) && /(mand|env|aqu|ahí|ahi|te paso|le paso)/i.test(t)) datos.push({ tipo: 'qr', valor: 'mencionado' });
    return datos;
  }
  function normalizaBanco(b) {
    const m = { Union: 'Unión', Economico: 'Económico', Credito: 'Crédito', BISA: 'BISA' };
    return m[b] || b;
  }

  // Guiones de la abuela, por táctica.
  const L = {
    saludo: [
      '¡Aló! ¿Quién habla? Esperate que bajo la novela… ¡Ya! Decime, m\'hijito.',
      'Ayyy, ¿sos vos Brayan? Tenés la voz cambiada, ¿estás resfriado? Ponete un matecito de coca, ve.',
    ],
    nieto: [
      '¿Brayan? ¿O sos el Kevin? Es que tengo nueve nietos y todos me piden plata, mirá.',
      '¡Ay Dios mío! ¿Qué te pasó, mi amor? Esperá que me siento… ya. Contame despacito que el corazón no me da.',
    ],
    premio: [
      '¿Un premio? ¡Qué lindo! La última vez gané una licuadora en la rifa del colegio. ¿Es licuadora también?',
      '¡Ay, qué bendición! Justo le estaba pidiendo a la Virgen de Cotoca. ¿Y cómo hago para recibirlo, joven?',
    ],
    urgente: [
      'Tranquilo, m\'hijito, que con apuro nada sale bien. Mi finado Rogelio siempre decía eso. Bueno, él se murió apurado, pero igual.',
      'Esperate que me están hirviendo los porotos… ya, ya volví. ¿Qué me decías del apuro?',
    ],
    codigo: [
      '¿Un código? Me llegó algo al celular pero no veo nada sin mis lentes. ¿Dónde dejé los lentes? Esperame…',
      'Ay, mi nieta me dijo que nunca le pase el códiguito a nadie. Pero vos sos de confianza, ¿no? Primero decime a qué cuenta es.',
    ],
    pedirCuenta: [
      'Ya, ya, te deposito. Pero en el banco me piden el número de cuenta completo. Dictámelo despacito que lo anoto en mi cuadernito.',
      'Mi vecina me va a llevar al banco. ¿A qué número de cuenta y de qué banco, m\'hijito?',
    ],
    repetir: [
      'A ver, leo lo que anoté: {mal}… ¿así es? Es que el lapicero se me corre.',
      '¿{mal}? Repetímelo, mi amor, que el gato me pisó el cuaderno.',
    ],
    pedirBanco: [
      '¿Y de qué banco es? Porque yo solo conozco el BNB, donde cobro la renta dignidad.',
      'Anotado el número. ¿Y el banco cuál es? La cajera siempre me pregunta eso.',
    ],
    pedirTitular: [
      '¿Y a nombre de quién está la cuenta? La cajera me va a preguntar y no quiero quedar mal.',
      'Decime el nombre completo del dueño de la cuenta, con apellidos, que acá todos se llaman Juan.',
    ],
    pedirQR: [
      'Mi nieta dice que con QR es más fácil. ¿Me mandás tu QR, m\'hijito? Así le pido a ella que lo pague.',
      '¿No tenés QR? Ahora todo es con QR, hasta la salteñera de la esquina tiene.',
    ],
    novela: [
      'Esperate que está en la parte donde la Soraya descubre que el Esteban es su hermano. ¡Ay qué escándalo! Ya, decime.',
      'Perdón, estaba viendo la novela. ¿Vos la ves? La de las 3. Bueno, ¿qué me decías?',
    ],
    sordera: [
      '¿Cómo? No te escucho bien, se me descargó el audífono. Escribime más grande.',
      '¿Que te mande QUÉ? Ah, ¿la receta del majadito? Claro, primero se fríe la cebolla…',
    ],
    tengoTodo: [
      'Ya anoté todo en mi cuadernito. Ahora voy al banco, pero hay una fila de aquí a Montero. Esperame unas horitas, ¿ya?',
      'Listo, m\'hijito. Mi nieto el policía me va a acompañar al banco, él sabe de estas cosas. ¿Sigues ahí?',
    ],
    policia: [
      '¿Policía? Mi sobrino trabaja en la FELCC, ¿lo conocés? Le voy a preguntar por vos.',
    ],
    tieneTitular: [
      '¿{n}? ¿Pariente de los {a} de Warnes? Conocí a una {a} que vendía empanadas de arroz. Ya, anotado.',
      '{n}… lindo nombre. Así se llamaba el galán de la novela de antes. Ya lo anoté con letra bonita.',
    ],
    insulto: [
      'Ay, qué boca, m\'hijito. Tu mamá no te enseñó así. Rezaré un rosario por vos.',
      '¿Vieja yo? Tengo 78 y bailo chovena mejor que vos. Decime de nuevo lo de la cuenta.',
    ],
  };

  function al(arr, usados) {
    const libres = arr.filter(x => !usados.has(x));
    const pool = libres.length ? libres : arr;
    const x = pool[Math.floor(Math.random() * pool.length)];
    usados.add(x);
    return x;
  }
  function malLeido(n) { // cambia 2 dígitos para que el estafador repita
    const a = n.split('');
    for (let k = 0; k < 2; k++) { const i = Math.floor(Math.random() * a.length); a[i] = String((+a[i] + 3) % 10); }
    return a.join('').replace(/(\d{3})(?=\d)/g, '$1 ');
  }

  function nuevoEstado() { return { turno: 0, usados: new Set(), datos: {}, repetidas: 0 }; }

  // Respuesta offline: reacciona al estafador y va pescando el dato que falta.
  function responder(estado, texto) {
    estado.turno++;
    const nuevos = extraer(texto);
    for (const d of nuevos) if (!estado.datos[d.tipo]) estado.datos[d.tipo] = d.valor;
    const s = texto.toLowerCase();
    const D = estado.datos;
    const u = estado.usados;
    let r;
    const cuentaNueva = nuevos.find(d => d.tipo === 'cuenta');

    if (estado.turno === 1) r = /abuel|nieto|soy yo|accidente/.test(s) ? al(L.nieto, u) : (/premio|gan[oó]|sorteo|felicidades/.test(s) ? al(L.premio, u) : al(L.saludo, u));
    else if (/idiota|vieja|carajo|mierda|est[uú]pida|tonta/.test(s)) r = al(L.insulto, u);
    else if (cuentaNueva && estado.repetidas < 1) { estado.repetidas++; r = al(L.repetir, u).replace('{mal}', malLeido(cuentaNueva.valor)); }
    else if (nuevos.find(d => d.tipo === 'titular')) { const n = D.titular; r = al(L.tieneTitular, u).replace(/\{n\}/g, n).replace(/\{a\}/g, n.split(' ')[1] || n); }
    else if (/c[oó]digo|\bpin\b|\bclave|contraseña/.test(s)) r = al(L.codigo, u);
    else if (/polic|fiscal|detenid|arrest/.test(s)) r = al(L.policia, u);
    else if (!D.cuenta && estado.turno % 3 === 0) r = al(L.novela, u) + ' ' + al(L.pedirCuenta, u);
    else if (!D.cuenta) r = (/r[aá]pido|urgente|ya mismo|ahora/.test(s) ? al(L.urgente, u) + ' ' : '') + al(L.pedirCuenta, u);
    else if (!D.banco) r = al(L.pedirBanco, u);
    else if (!D.titular) r = al(L.pedirTitular, u);
    else if (!D.qr && !estado.pidioQR) { estado.pidioQR = true; r = al(L.pedirQR, u); }
    else r = estado.turno % 2 ? al(L.tengoTodo, u) : al(L.sordera, u);
    return { respuesta: r, datos: nuevos };
  }

  window.Chela = { extraer, responder, nuevoEstado };
})();
