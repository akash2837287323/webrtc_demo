import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import wrtc from 'wrtc';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from "socket.io";
import path from 'path';
import multer from 'multer';

const PORT = process.env.PORT || 5001;
const SOCKET_PORT = process.env.SOCKET_PORT || 8000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
const upload = multer({ storage: storage });

const app = express();
const server = createServer(app);
const io = new Server(server);

let senderStream;

app.use(cors({
  origin: "*"
}));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/broadcast', async (req, res) => {
  const { body } = req;
  const peer = new wrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org"
      }
    ]
  });
  peer.ontrack = (e) => handleTrackEvent(e, peer);
  const desc = new wrtc.RTCSessionDescription(body.sdp);
  await peer.setRemoteDescription(desc);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  const payload = {
    sdp: peer.localDescription
  };

  res.json(payload);
});

app.post("/consumer", async (req, res) => {
  const { body } = req;
  const peer = new wrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org"
      }
    ]
  });
  const desc = new wrtc.RTCSessionDescription(body.sdp);
  await peer.setRemoteDescription(desc);
  senderStream.getTracks().forEach(track => peer.addTrack(track, senderStream));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  const payload = {
    sdp: peer.localDescription
  };

  res.json(payload);
});

app.post("/upload", upload.single('file'), async (req, res) => {
  res.send('File uploaded successfully.');
});

async function handleTrackEvent(e, peer) {
  senderStream = e.streams[0];
}

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on("joinRoom", (data) => {
    const roomId = data.roomId;
    socket.join(roomId);
  })
});

app.listen(PORT, () => console.log(`Server started at port --${PORT}`));

server.listen(SOCKET_PORT, () => console.log(`Socket server started at port --${SOCKET_PORT}`));