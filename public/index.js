let recorder;

window.onload = () => {
    document.getElementById('start-streaming-button').onclick = () => {
        init();
    }

    document.getElementById('stop-streaming-button').onclick = () => {
        stopRecording();
    }
}

async function init() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    recorder = new RecordRTCPromisesHandler(stream, {
        mimeType: 'video/webm'
    })

    recorder.startRecording();

    document.getElementById("video").srcObject = stream;
    const peer = createPeer();
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    // The above code is adding all the tracks present in a stream i.e. audio or video or both to the peer connection.
    // This basically is mapping the stream and it's track to the peer connection object.
}

function createPeer() {
    const peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });

    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription
    };

    const { data } = await axios.post('http://localhost:5000/broadcast', payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch(e => console.log(e));
}

async function stopRecording() {
    await recorder.stopRecording();
    let blob = await recorder.getBlob();
    const randomNumber = Math.floor(Math.random() * 1000000);
    const filename = `recorded-video-${randomNumber}.mp4`;
    // invokeSaveAsDialog(blob, filename);

    const formData = new FormData();
    formData.append('file', blob, filename);

    try {
        const response = await axios.post('http://localhost:5000/upload', formData);
        console.log('File uploaded successfully:', response.data);
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}