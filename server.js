// ====== Boot logs muy tempranos ======
console.log('[BOOT] Starting chat server bootstrap...');
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

console.log('[BOOT] Modules loaded OK');

const app = express();
app.use(cors());

// Rutas y carpetas
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const audioDir = path.join(dataDir, 'audio');
const messagesFile = path.join(dataDir, 'messages.json');

// Asegura estructura de persistencia
try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  if (!fs.existsSync(messagesFile)) fs.writeFileSync(messagesFile, JSON.stringify([]));
  console.log('[BOOT] Data directories OK');
} catch (e) {
  console.error('[BOOT] Error creating data folders/files:', e);
  process.exit(1);
}

// Archivos estáticos del frontend
app.use(express.static(publicDir));

// (Opcional) endpoint de carga via multipart
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file' });
  res.json({ ok: true, file: req.file.filename });
});

// Servir audios guardados
app.use('/data/audio', express.static(audioDir));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Estado en memoria
const clients = new Map();      // id -> { id, name, ws }
const groups = {};              // gid -> { id, name, members: [] }

// Utilidades
function send(ws, type, payload) {
  try {
    ws.send(JSON.stringify({ type, payload }));
  } catch (e) {
    console.error('[WS] send error:', e);
  }
}

function broadcastAll(type, payload) {
  const obj = JSON.stringify({ type, payload });
  for (const c of clients.values()) {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(obj);
  }
}

function saveMessage(msg) {
  try {
    const arr = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
    arr.push(msg);
    fs.writeFileSync(messagesFile, JSON.stringify(arr, null, 2));
  } catch (e) {
    console.error('[IO] Error saving message:', e);
  }
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  const clientName = `User-${clientId.slice(0, 4)}`;
  clients.set(clientId, { id: clientId, name: clientName, ws });

  console.log(`[WS] Client connected: ${clientName} (${clientId})`);

  // Enviar estado inicial
  send(ws, 'welcome', {
    id: clientId,
    name: clientName,
    clients: Array.from(clients.values()).map(c => ({ id: c.id, name: c.name })),
    groups: Object.values(groups),
    history: JSON.parse(fs.readFileSync(messagesFile, 'utf8'))
  });

  // Notificar a todos la lista de usuarios
  broadcastAll('clients_update', Array.from(clients.values()).map(c => ({ id: c.id, name: c.name })));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch (e) { console.error('[WS] Invalid JSON message:', e); return; }

    const { type, payload } = msg || {};
    if (!type) return;

    if (type === 'set_name') {
      const c = clients.get(clientId);
      if (c && payload?.name) {
        c.name = String(payload.name);
        broadcastAll('clients_update', Array.from(clients.values()).map(x => ({ id: x.id, name: x.name })));
      }
      return;
    }

    if (type === 'create_group') {
      const gid = uuidv4();
      const name = (payload?.name || `Grupo-${gid.slice(0, 4)}`).toString();
      const members = Array.isArray(payload?.members) && payload.members.length ? payload.members : [clientId];
      groups[gid] = { id: gid, name, members };
      console.log(`[GRP] Group created: ${name} (${gid}) members=${members.length}`);
      broadcastAll('groups_update', Object.values(groups));
      send(ws, 'group_created', groups[gid]);
      return;
    }

    if (type === 'text_message') {
      if (!payload?.to || !payload?.toType || !payload?.text) return;
      const message = {
        id: uuidv4(),
        from: clientId,
        fromName: clients.get(clientId)?.name || 'Unknown',
        to: payload.to,
        toType: payload.toType, // 'user' | 'group'
        text: String(payload.text),
        ts: Date.now(),
        kind: 'text'
      };
      saveMessage(message);

      if (message.toType === 'user') {
        const t = clients.get(message.to);
        if (t?.ws?.readyState === WebSocket.OPEN) send(t.ws, 'incoming_text', message);
        send(ws, 'incoming_text', message);
      } else {
        const g = groups[message.to];
        if (g) {
          g.members.forEach(id => {
            const c = clients.get(id);
            if (c?.ws?.readyState === WebSocket.OPEN) send(c.ws, 'incoming_text', message);
          });
        }
      }
      return;
    }

    if (type === 'voice_note') {
      if (!payload?.to || !payload?.toType || !payload?.blobBase64) return;

      const id = uuidv4();
      const raw = payload.blobBase64;
      const m = raw.match(/^data:(audio\/[a-z0-9.+-]+);base64,(.*)$/i);
      let mime = 'audio/webm';
      let b64 = raw;
      if (m) { mime = m[1]; b64 = m[2]; }
      const ext = mime.includes('webm') ? 'webm' : (mime.includes('wav') ? 'wav' : 'ogg');
      const filename = `${Date.now()}-${id}.${ext}`;

      try {
        fs.writeFileSync(path.join(audioDir, filename), Buffer.from(b64, 'base64'));
      } catch (e) {
        console.error('[IO] Error writing audio file:', e);
        return;
      }

      const message = {
        id,
        from: clientId,
        fromName: clients.get(clientId)?.name || 'Unknown',
        to: payload.to,
        toType: payload.toType,
        audioFile: `/data/audio/${filename}`,
        ts: Date.now(),
        kind: 'audio'
      };
      saveMessage(message);

      if (message.toType === 'user') {
        const t = clients.get(message.to);
        if (t?.ws?.readyState === WebSocket.OPEN) send(t.ws, 'incoming_voice', message);
        send(ws, 'incoming_voice', message);
      } else {
        const g = groups[message.to];
        if (g) {
          g.members.forEach(id => {
            const c = clients.get(id);
            if (c?.ws?.readyState === WebSocket.OPEN) send(c.ws, 'incoming_voice', message);
          });
        }
      }
      return;
    }

    if (type === 'signal') {
      const to = payload?.to;
      const data = payload?.data;
      if (!to || !data) return;
      const t = clients.get(to);
      if (t?.ws?.readyState === WebSocket.OPEN) {
        send(t.ws, 'signal', { from: clientId, fromName: clients.get(clientId)?.name, data });
      }
      return;
    }

    if (type === 'update_group') {
      const { groupId, members } = payload || {};
      if (groups[groupId] && Array.isArray(members)) {
        groups[groupId].members = members;
        broadcastAll('groups_update', Object.values(groups));
      }
      return;
    }

    if (type === 'get_history') {
      try {
        const history = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
        send(ws, 'history', history);
      } catch (e) {
        console.error('[IO] Error reading history:', e);
        send(ws, 'history', []);
      }
      return;
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[WS] Client disconnected: ${clientName} (${clientId})`);
    broadcastAll('clients_update', Array.from(clients.values()).map(c => ({ id: c.id, name: c.name })));
  });
});

// Errores del servidor
server.on('error', (err) => {
  console.error('[HTTP] Server error:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[HTTP] Server listening on http://localhost:${PORT}`);
});
