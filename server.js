console.log('[PROXY] Starting HTTP proxy server...');
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
const net = require('net');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

console.log('[PROXY] Modules loaded OK');

const app = express();
app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const audioDir = path.join(dataDir, 'audio');

try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  console.log('[PROXY] Data directories OK');
} catch (e) {
  console.error('[PROXY] Error creating data folders:', e);
  process.exit(1);
}

app.use(express.static(publicDir));
app.use('/data/audio', express.static(audioDir));

const JAVA_BACKEND_HOST = process.env.JAVA_BACKEND_HOST || 'localhost';
const JAVA_BACKEND_PORT = process.env.JAVA_BACKEND_PORT || 8888;

const sessions = new Map();


function sendTCPRequest(requestData, clientId = null) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let responseData = '';
    let responseTimeout;
    let responses = [];

    client.setEncoding('utf8');

    client.on('connect', () => {
      console.log('[TCP] Connected to Java backend');
      
      if (clientId) {
        requestData.clientId = clientId;
      }
      
      client.write(JSON.stringify(requestData) + '\n');
    });

    client.on('data', (data) => {
      responseData += data.toString();
      const lines = responseData.split('\n');
      responseData = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line.trim());
            responses.push(response);
          } catch (e) {
            console.error('[TCP] Error parsing response line:', e.message);
          }
        }
      }
      
      if (responses.length > 0) {
        if (requestData.type === 'init') {
          const welcomeResponse = responses.find(r => r.type === 'welcome');
          if (welcomeResponse) {
            clearTimeout(responseTimeout);
            client.destroy();
            resolve(welcomeResponse);
          }
        } else {
          const actualResponse = responses.find(r => r.type !== 'welcome') || responses[responses.length - 1];
          if (actualResponse && actualResponse.type !== 'welcome') {
            clearTimeout(responseTimeout);
            client.destroy();
            resolve(actualResponse);
          }
        }
      }
    });

    client.on('error', (err) => {
      clearTimeout(responseTimeout);
      console.error('[TCP] Connection error:', err.message);
      reject(new Error('Failed to connect to Java backend: ' + err.message));
    });

    client.on('close', () => {
      clearTimeout(responseTimeout);
      if (responses.length > 0) {
        if (requestData.type === 'init') {
          const welcomeResponse = responses.find(r => r.type === 'welcome');
          resolve(welcomeResponse || responses[responses.length - 1]);
        } else {
          const nonWelcome = responses.find(r => r.type !== 'welcome');
          resolve(nonWelcome || responses[responses.length - 1]);
        }
      } else if (responseData.trim()) {
        try {
          const response = JSON.parse(responseData.trim());
          resolve(response);
        } catch (e) {
          if (responses.length === 0) {
            reject(new Error('Invalid response from backend'));
          }
        }
      } else if (responses.length === 0) {
        reject(new Error('No response from backend'));
      }
    });

    responseTimeout = setTimeout(() => {
      client.destroy();
      if (responses.length > 0) {
        const nonWelcome = responses.find(r => r.type !== 'welcome');
        resolve(nonWelcome || responses[responses.length - 1]);
      } else {
        reject(new Error('Request timeout'));
      }
    }, 10000); 

    client.connect(JAVA_BACKEND_PORT, JAVA_BACKEND_HOST, (err) => {
      if (err) {
        clearTimeout(responseTimeout);
        reject(new Error('Failed to connect to Java backend: ' + err.message));
      }
    });
  });
}

/**
 * Get or create a client session
 */
function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { sessionId });
  }
  return sessions.get(sessionId);
}


app.post('/api/init', async (req, res) => {
  try {
    const sessionId = req.body.sessionId || require('crypto').randomBytes(16).toString('hex');
    const session = getOrCreateSession(sessionId);
    
    if (session.clientId) {
      return res.json({
        ok: true,
        sessionId,
        clientId: session.clientId,
        clientName: session.clientName,
        groups: [],
        history: []
      });
    }
    
    const response = await sendTCPRequest({
      type: 'init',
      payload: {}
    });
    
    if (response.type === 'welcome') {
      session.clientId = response.payload.id;
      session.clientName = response.payload.name;
      res.json({
        ok: true,
        sessionId,
        clientId: session.clientId,
        clientName: session.clientName,
        groups: [],
        history: []
      });
    } else {
      res.status(500).json({ ok: false, error: 'Unexpected response from backend' });
    }
  } catch (error) {
    console.error('[PROXY] Error in /api/init:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { sessionId, name, members } = req.body;
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'sessionId required' });
    }
    
    const session = getOrCreateSession(sessionId);
    if (!session.clientId) {
      return res.status(400).json({ ok: false, error: 'Session not initialized. Call /api/init first' });
    }

    const response = await sendTCPRequest({
      type: 'create_group',
      payload: {
        name: name || `Grupo-${Date.now()}`,
        members: members || [session.clientId]
      }
    }, session.clientId);

    if (response.type === 'group_created') {
      res.json({
        ok: true,
        group: response.payload
      });
    } else if (response.type === 'error') {
      res.status(400).json({ ok: false, error: response.payload.error });
    } else {
      res.status(500).json({ ok: false, error: 'Unexpected response from backend' });
    }
  } catch (error) {
    console.error('[PROXY] Error in /api/groups:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { sessionId, to, toType, text } = req.body;
    if (!sessionId || !to || !toType || !text) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: sessionId, to, toType, text' });
    }
    
    const session = getOrCreateSession(sessionId);
    if (!session.clientId) {
      return res.status(400).json({ ok: false, error: 'Session not initialized. Call /api/init first' });
    }

    const response = await sendTCPRequest({
      type: 'text_message',
      payload: {
        to,
        toType,
        text
      }
    }, session.clientId);

    if (response.type === 'message_sent') {
      res.json({
        ok: true,
        message: response.payload
      });
    } else if (response.type === 'error') {
      res.status(400).json({ ok: false, error: response.payload.error });
    } else {
      res.status(500).json({ ok: false, error: 'Unexpected response from backend' });
    }
  } catch (error) {
    console.error('[PROXY] Error in /api/messages:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { sessionId, targetId, targetType } = req.query;
    if (!sessionId || !targetId || !targetType) {
      return res.status(400).json({ ok: false, error: 'Missing required query parameters: sessionId, targetId, targetType' });
    }
    
    const session = getOrCreateSession(sessionId);
    if (!session.clientId) {
      return res.status(400).json({ ok: false, error: 'Session not initialized. Call /api/init first' });
    }

    const response = await sendTCPRequest({
      type: 'get_history',
      payload: {
        targetId,
        targetType
      }
    }, session.clientId);

    if (response.type === 'history') {
      res.json({
        ok: true,
        messages: response.payload.messages || []
      });
    } else if (response.type === 'error') {
      res.status(400).json({ ok: false, error: response.payload.error });
    } else {
      res.status(500).json({ ok: false, error: 'Unexpected response from backend' });
    }
  } catch (error) {
    console.error('[PROXY] Error in /api/history:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'proxy running' });
});

const server = http.createServer(app);

server.on('error', (err) => {
  console.error('[PROXY] Server error:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[PROXY] HTTP proxy server listening on http://localhost:${PORT}`);
  console.log(`[PROXY] Java backend expected at ${JAVA_BACKEND_HOST}:${JAVA_BACKEND_PORT}`);
  console.log(`[PROXY] Make sure the Java backend is running before making requests`);
});
