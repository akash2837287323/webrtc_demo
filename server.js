const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const webrtc = require("wrtc");
const cors = require('cors');
const fs = require('fs');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath);
const w2f = require('wrtc-to-ffmpeg')(webrtc)

let senderStream;

app.use(cors({
    origin: "*"
}))
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/broadcast', async ({ body }, res) => {
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });
    peer.ontrack = (e) => handleTrackEvent(e, peer);
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload);
});

app.post("/consumer", async ({ body }, res) => {
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    senderStream.getTracks().forEach(track => peer.addTrack(track, senderStream));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload);
});

async function handleTrackEvent(e, peer) {
    senderStream = e.streams[0];

    var track = senderStream.getVideoTracks()[0];

    if (track) {
        const input = await w2f.input(track)
        
        var f = ffmpeg().input(input.url)
            .inputOptions(input.options)
            .on('start', function () {
                console.log("START")
            })
            .on('error', function (err) {
                console.log('An error occurred: ' + err.message);
            })
            .on('end', function () {
                console.log('Processing finished !');
            })
            .output(`./public/${Date.now()}.mkv`)
            .run();

        console.log("HERE WE GO")
    }
}

app.listen(5000, () => console.log('server started'));