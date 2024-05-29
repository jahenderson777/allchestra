// server.js
const WebSocket = require('ws');
const easymidi = require('easymidi');
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('@koush/wrtc');

//console.log(easymidi.getOutputs()); process.exit(1);

const midiOut = new easymidi.Output(easymidi.getOutputs()[0]);
// const x =  Math.floor(Math.random() * 127);
// console.log(x);
// midiOut.send('cc', {
//     controller: 4,
//     value: x,
//     channel: 0
// });

// process.exit(1);

function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function handleData(data) {
    console.log(data);
    midiOut.send('cc', {
        controller: 1,
        value: Math.floor(mapRange(data.alpha, 0, 360, 0, 127)),
        channel: 0
    });
    midiOut.send('cc', {
        controller: 2,
        value: Math.floor(mapRange(data.beta, -180, 180, 0, 127)),
        channel: 0
    });
    midiOut.send('cc', {
        controller: 3,
        value: Math.floor(mapRange(data.gamma, -90, 90, 0, 127)),
        channel: 0
    });
}

const signalingServerUrl = 'wss://earthics.org./ws/';
let peerConnections = {};

const signalingSocket = new WebSocket(signalingServerUrl, {
    rejectUnauthorized: false // This is necessary for self-signed certificates 
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
                //console.log(event);
                const orientationData = JSON.parse(event.data);
                if (orientationData.type === 'orientationData') {
                    //console.log('Received orientation data:', orientationData.orientation);
                    handleData(orientationData.orientation);
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
