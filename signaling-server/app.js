const http = require('http');
const WebSocket = require('ws');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(404);
  res.end();
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

let musicSynthClient = null;
const clientConnections = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    const data = JSON.parse(message);
        
    if (data.type === 'register' && data.role === 'musicSynth') {
        musicSynthClient = ws;
        ws.role = 'musicSynth';
        console.log('Music Synth connected');
    } else if (data.type === 'register' && data.role === 'client') {
        clientConnections.set(ws, data.clientId);
        ws.role = 'client';
        console.log(`Client ${data.clientId} connected`);
        
        // Notify the music synth about the new client
        if (musicSynthClient) {
            musicSynthClient.send(JSON.stringify({ type: 'newClient', clientId: data.clientId }));
        }
    } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'candidate') {
        // Forward messages from clients to the music synth
        if (ws.role === 'client' && musicSynthClient) {
            musicSynthClient.send(JSON.stringify(data));
        }
        // Forward messages from the music synth to the specific client
        else if (ws.role === 'musicSynth' && data.clientId) {
            for (let [clientWs, clientId] of clientConnections) {
                if (clientId === data.clientId) {
                    clientWs.send(JSON.stringify(data));
                    break;
                }
            }
        }
    }
  });

  ws.on('close', () => {
    if (ws.role === 'client') {
        clientConnections.delete(ws);
        console.log(`Client ${ws.clientId} disconnected`);
    } else if (ws.role === 'musicSynth') {
        musicSynthClient = null;
        console.log('Music Synth disconnected');
    }
  });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});