// server.js
const WebSocket = require('ws');
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('@koush/wrtc');

const signalingServerUrl = 'wss://earthics.org./ws/';
let peerConnections = {};

const signalingSocket = new WebSocket(signalingServerUrl, {  rejectUnauthorized: false // This is necessary for self-signed certificates 
});

signalingSocket.onopen = () => {
    signalingSocket.send(JSON.stringify({ type: 'register', role: 'musicSynth' }));
    console.log('Connected to signaling server as music synth');
};

signalingSocket.onmessage = async (message) => {
    console.log(message.data);
    const data = JSON.parse(message.data);

    if (data.type === 'newClient') {
        const clientId = data.clientId;
        const peerConnection = new RTCPeerConnection();

        peerConnections[clientId] = peerConnection;

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingSocket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, clientId: clientId }));
            }
        };

        peerConnection.ondatachannel = (event) => {
            const dataChannel = event.channel;
            dataChannel.onmessage = (event) => {
                console.log(event);
                const orientationData = JSON.parse(event.data);
                if (orientationData.type === 'orientationData') {
                    console.log('Received orientation data:', orientationData.orientation);
                    // Use the orientation data for your music synth
                }
            };
        };

        // Create an offer and send it to the client
        const dataChannel = peerConnection.createDataChannel('dataChannel');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log(`Sending offer to client ${clientId}:`, offer);
        signalingSocket.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription, clientId: clientId }));


    } else if (data.type === 'answer') {
        const clientId = data.clientId;
        const peerConnection = peerConnections[clientId];
        console.log('Received answer from client:', clientId, data.answer);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));

    } else if (data.type === 'candidate') {
        const clientId = data.clientId;
        const peerConnection = peerConnections[clientId];
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

signalingSocket.onclose = () => {
    peerConnections = {};
    console.log('Disconnected from signaling server');
};
