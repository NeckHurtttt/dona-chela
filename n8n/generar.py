# Genera n8n/dona-chela.json (importar en n8n). Uso: python3 n8n/generar.py
import json, uuid, pathlib

PROMPT = """Eres Doña Chela, una abuelita cruceña de 78 años (Santa Cruz, Bolivia). Un ESTAFADOR te escribe. Tu misión secreta:
1) Hacerle perder el mayor tiempo posible, con calidez y humor: tu nieto Brayan, la novela de las 3, los porotos en el fuego, el gato, los lentes perdidos, el audífono, la Virgen de Cotoca.
2) Sacarle, sin que sospeche, su número de cuenta, banco, nombre del titular, celular y QR de cobro. Lee mal los números a propósito para que los repita.
Reglas: habla en español cruceño con voseo (mirá, decime, m'hijito, ve, pues). Responde en 1 a 3 frases cortas, como chat. Nunca des datos reales, códigos, claves ni transfieras de verdad (puedes prometer que irás al banco). No insultes ni amenaces. Si te piden un código, inventa excusas.
Responde SOLO con JSON válido, sin texto extra: {"respuesta":"lo que dice Chela","datos":[{"tipo":"cuenta|banco|titular|celular|qr","valor":"..."}]} donde datos son los que el estafador reveló en su ÚLTIMO mensaje (lista vacía si ninguno)."""

ARMAR = r"""
const P = %s;
const h = $input.first().json;
const body = h.body || h;
const hist = (body.historial || []).slice(-20);
const msgs = [];
for (const m of [...hist, { rol: 'estafador', texto: body.mensaje }]) {
  const role = m.rol === 'chela' ? 'assistant' : 'user';
  if (!m.texto) continue;
  if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += '\n' + m.texto;
  else msgs.push({ role, content: m.texto });
}
while (msgs.length && msgs[0].role !== 'user') msgs.shift();
const ya = body.datos ? '\nYa anotaste: ' + JSON.stringify(body.datos) + '. Pesca lo que falte.' : '';
return [{ json: { chat_id: body.chat_id, peticion: { model: 'claude-haiku-5-5', max_tokens: 300, system: P + ya, messages: msgs } } }];
""" % json.dumps(PROMPT)

LEER = r"""
const t = ($input.first().json.content || []).map(c => c.text || '').join('');
let j = {};
try { j = JSON.parse(t.match(/\{[\s\S]*\}/)[0]); } catch (e) { j = { respuesta: t || 'Ay, se me cortó, m\'hijito. ¿Qué me decías?', datos: [] }; }
return [{ json: { respuesta: j.respuesta, datos: Array.isArray(j.datos) ? j.datos : [] } }];
"""

ROUTER = r"""
const m = $input.first().json.message || {};
const chat_id = m.chat?.id; const txt = (m.text || m.caption || '').trim();
const st = $getWorkflowStaticData('global'); st.chats = st.chats || {};
const c = st.chats[chat_id] = st.chats[chat_id] || { historial: [], datos: {}, inicio: Date.now() };
if (!txt || txt === '/start' || txt === '/ayuda')
  return [{ json: { accion: 'texto', chat_id, texto: '👵 ¡Hola, m\'hijito! Soy Doña Chela.\n\nReenvíame lo que te escribe el estafador y te digo qué contestarle. Yo lo entretengo y le saco la cuenta.\n\n/verificar 70012345 — ver si una cuenta o celular es de estafador\n/denunciar — mandarlo a la lista negra\n/nuevo — empezar con otro estafador' } }];
if (txt === '/nuevo') { st.chats[chat_id] = { historial: [], datos: {}, inicio: Date.now() }; return [{ json: { accion: 'texto', chat_id, texto: 'Listo, cuaderno nuevo. Pasame al siguiente estafador. 📒' } }]; }
if (txt.startsWith('/verificar')) {
  const q = txt.replace(/\D/g, '');
  if (q.length < 7) return [{ json: { accion: 'texto', chat_id, texto: 'Escribime el número así: /verificar 70012345' } }];
  return [{ json: { accion: 'verificar', chat_id, q, filtro: `or=(cuenta.eq.${q},celular.eq.${q})` } }];
}
if (txt === '/denunciar') {
  const d = c.datos;
  if (!d.cuenta && !d.celular) return [{ json: { accion: 'texto', chat_id, texto: 'Todavía no le saqué ni cuenta ni celular. Sigamos charlando con él. 😉' } }];
  const t = c.historial.filter(h => h.rol === 'estafador').map(h => h.texto).join(' ').toLowerCase();
  const guion = /nieto|abuel|accidente/.test(t) ? 'Falso nieto' : /premio|sorteo|gan[oó]/.test(t) ? 'Premio falso' : /bloque|banco|tarjeta|c[oó]digo/.test(t) ? 'Cuenta bloqueada' : 'Otro';
  return [{ json: { accion: 'denunciar', chat_id, caso: { canal: 'telegram', guion, cuenta: d.cuenta || null, celular: d.celular || null, banco: d.banco || null, titular: d.titular || null, qr: !!d.qr, minutos: Math.max(1, Math.round((Date.now() - c.inicio) / 60000)) } } }];
}
c.historial.push({ rol: 'estafador', texto: txt });
return [{ json: { accion: 'chela', chat_id, body: { chat_id, historial: c.historial.slice(0, -1), mensaje: txt, datos: c.datos } } }];
"""

TG_RESP = r"""
const r = $input.first().json; const chat_id = $('Telegram: Router').first().json.chat_id;
const st = $getWorkflowStaticData('global'); const c = st.chats[chat_id];
c.historial.push({ rol: 'chela', texto: r.respuesta });
const nuevos = [];
for (const d of r.datos) if (d && d.valor && !c.datos[d.tipo]) { c.datos[d.tipo] = d.valor; nuevos.push(d.tipo + ': ' + d.valor); }
let texto = 'Contestale esto 👇\n\n' + r.respuesta;
if (nuevos.length) texto += '\n\n📒 Anoté → ' + nuevos.join(' · ') + '\nCuando quieras: /denunciar';
return [{ json: { chat_id, texto } }];
"""

VERIF = r"""
const q = $('Telegram: Router').first().json;
const filas = $input.all().map(i => i.json).filter(f => f.id);
const texto = filas.length
  ? `🚫 ¡NO transfieras! ${q.q} está en la lista negra (${filas.length} reporte${filas.length > 1 ? 's' : ''}): ${filas[0].guion}${filas[0].titular ? ', a nombre de ' + filas[0].titular : ''}.`
  : `✅ ${q.q} no está en mi lista. Igual desconfiá si te apuran o te piden códigos.`;
return [{ json: { chat_id: q.chat_id, texto } }];
"""

CASO_HASH = r"""
const crypto = require('crypto');
const src = $input.first().json; const c = { ...(src.body || src.caso || src) };
const ok = ['creado','canal','guion','cuenta','celular','banco','titular','qr','minutos'];
const caso = {}; for (const k of ok) if (c[k] !== undefined) caso[k] = c[k];
caso.creado = caso.creado || new Date().toISOString();
caso.hash = crypto.createHash('sha256').update(JSON.stringify([caso.cuenta||null, caso.celular||null, caso.banco||null, caso.titular||null, caso.guion||null, caso.creado])).digest('hex');
return [{ json: caso }];
"""

DENUNCIA_OK = r"""
const r = $input.first().json; const chat_id = $('Telegram: Router').first().json.chat_id;
const st = $getWorkflowStaticData('global'); st.chats[chat_id] = { historial: [], datos: {}, inicio: Date.now() };
return [{ json: { chat_id, texto: `✅ ¡Atrapado! Quedó en la lista negra pública.\nHuella: ${r.hash}\nLe hice perder ${r.minutos} min. Pasame al siguiente: el cuaderno ya está limpio.` } }];
"""

nodes, conns = [], {}
def node(name, typ, ver, params, pos, **extra):
    n = {"parameters": params, "id": str(uuid.uuid4()), "name": name, "type": typ, "typeVersion": ver, "position": pos, **extra}
    nodes.append(n); return name
def link(a, b, out=0):
    conns.setdefault(a, {"main": []})
    m = conns[a]["main"]
    while len(m) <= out: m.append([])
    m[out].append({"node": b, "type": "main", "index": 0})
def code(name, js, pos, **kw): return node(name, "n8n-nodes-base.code", 2, {"jsCode": js.strip()}, pos, **kw)
def claude(name, pos):
    return node(name, "n8n-nodes-base.httpRequest", 4.2, {
        "method": "POST", "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [{"name": "anthropic-version", "value": "2023-06-01"}]},
        "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify($json.peticion) }}", "options": {"timeout": 20000}},
        pos, credentials={"httpHeaderAuth": {"id": "", "name": "Anthropic (x-api-key)"}})
SB = {"supabaseApi": {"id": "", "name": "Supabase (service_role)"}}
CORS = {"allowedOrigins": "*"}

# A) Chat de la web
a = node("Web: mensaje al chat", "n8n-nodes-base.webhook", 2, {"httpMethod": "POST", "path": "chela", "responseMode": "responseNode", "options": CORS}, [0, 0], webhookId=str(uuid.uuid4()))
b = code("Armar pedido", ARMAR, [220, 0]); c = claude("Claude: Doña Chela", [440, 0]); d = code("Leer respuesta", LEER, [660, 0])
e = node("Responder a la web", "n8n-nodes-base.respondToWebhook", 1.1, {"respondWith": "json", "responseBody": "={{ $json }}", "options": {}}, [880, 0])
link(a, b); link(b, c); link(c, d); link(d, e)

# B) Guardar caso desde la web
a = node("Web: denunciar caso", "n8n-nodes-base.webhook", 2, {"httpMethod": "POST", "path": "chela-caso", "responseMode": "responseNode", "options": CORS}, [0, 240], webhookId=str(uuid.uuid4()))
b = code("Limpiar caso", CASO_HASH, [220, 240])
c = node("Supabase: guardar caso", "n8n-nodes-base.supabase", 1, {"operation": "create", "tableId": "casos", "dataToSend": "autoMapInputData"}, [440, 240], credentials=SB)
d = node("Responder id", "n8n-nodes-base.respondToWebhook", 1.1, {"respondWith": "json", "responseBody": "={{ { id: $json.id, hash: $json.hash } }}", "options": {}}, [660, 240])
link(a, b); link(b, c); link(c, d)

# C) Bot de Telegram
t = node("Telegram: mensaje", "n8n-nodes-base.telegramTrigger", 1.1, {"updates": ["message"], "additionalFields": {}}, [0, 520], webhookId=str(uuid.uuid4()), credentials={"telegramApi": {"id": "", "name": "Telegram Doña Chela"}})
r = code("Telegram: Router", ROUTER, [220, 520])
sw = node("¿Qué hago?", "n8n-nodes-base.switch", 3.2, {"rules": {"values": [
    {"conditions": {"options": {"caseSensitive": True, "typeValidation": "strict", "version": 2}, "combinator": "and",
     "conditions": [{"leftValue": "={{ $json.accion }}", "rightValue": v, "operator": {"type": "string", "operation": "equals"}}]},
     "renameOutput": True, "outputKey": v} for v in ["texto", "verificar", "chela", "denunciar"]]}, "options": {}}, [440, 520])
env = node("Enviar Telegram", "n8n-nodes-base.telegram", 1.2, {"chatId": "={{ $json.chat_id }}", "text": "={{ $json.texto }}", "additionalFields": {"appendAttribution": False}}, [1320, 520], credentials={"telegramApi": {"id": "", "name": "Telegram Doña Chela"}})
link(t, r); link(r, sw)
link(sw, env, 0)
v1 = node("Supabase: buscar", "n8n-nodes-base.supabase", 1, {"operation": "getAll", "tableId": "casos", "returnAll": True, "filterType": "string", "filterString": "={{ $json.filtro }}"}, [660, 420], credentials=SB, alwaysOutputData=True)
v2 = code("Respuesta verificar", VERIF, [880, 420]); link(sw, v1, 1); link(v1, v2); link(v2, env)
c1 = node("Pedido Telegram", "n8n-nodes-base.set", 3.4, {"mode": "raw", "jsonOutput": "={{ $json.body }}", "options": {}}, [660, 560])
c2 = code("Armar pedido TG", ARMAR, [880, 560]); c3 = claude("Claude TG", [1100, 560]); c4 = code("Leer respuesta TG", LEER, [1100, 700])
c5 = code("Guardar charla", TG_RESP, [1320, 700])
link(sw, c1, 2); link(c1, c2); link(c2, c3); link(c3, c4); link(c4, c5); link(c5, env)
d1 = code("Caso TG", CASO_HASH, [660, 760])
d2 = node("Supabase: guardar caso TG", "n8n-nodes-base.supabase", 1, {"operation": "create", "tableId": "casos", "dataToSend": "autoMapInputData"}, [880, 760], credentials=SB)
d3 = code("Confirmar denuncia", DENUNCIA_OK, [1100, 860])
link(sw, d1, 3); link(d1, d2); link(d2, d3); link(d3, env)

out = {"name": "Doña Chela — abuelita antiestafa", "nodes": nodes, "connections": conns, "settings": {"executionOrder": "v1"}, "active": False}
pathlib.Path(__file__).with_name("dona-chela.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(len(nodes), "nodos")
