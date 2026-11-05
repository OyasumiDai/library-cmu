// A tiny stand-in for Supabase Realtime (Phoenix channels over WebSocket, JSON "vsn=1.0.0"), for trying the game
// with two players on one computer:
//   node tests/mock-realtime.mjs [port]            (default 54329)
// It does what the real one does for the game: answers phx_join / heartbeat, and relays every "broadcast" on a topic
// to the OTHER sockets joined to the same topic (self: false). It counts messages and can drop them to mimic the
// real project's per-second limit:   LIMIT=20 node tests/mock-realtime.mjs   (messages per second, all clients)
import http from "node:http";
import crypto from "node:crypto";

const port = Number(process.argv[2] ?? 54329);
const limit = Number(process.env.LIMIT ?? 0);
const sockets = new Set();
let windowStart = Date.now();
let inWindow = 0;
let dropped = 0;
let relayed = 0;

function frame(text) {
  const body = Buffer.from(text);
  const n = body.length;
  const head = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x81, 127]), Buffer.alloc(8)]);
  if (n >= 65536) head.writeBigUInt64BE(BigInt(n), 2);
  return Buffer.concat([head, body]);
}

function reply(socket, topic, ref, status = "ok") {
  socket.write(frame(JSON.stringify({ topic, event: "phx_reply", payload: { status, response: status === "ok" ? { postgres_changes: [] } : { reason: "mock" } }, ref })));
}

function handle(socket, message) {
  let data;
  try { data = JSON.parse(message); } catch { return; }
  const { topic, event, payload, ref } = data;
  if (event === "phx_join") {
    socket.topics.add(topic);
    reply(socket, topic, ref);
  } else if (event === "phx_leave") {
    socket.topics.delete(topic);
    reply(socket, topic, ref);
  } else if (event === "heartbeat") {
    reply(socket, "phoenix", ref);
  } else if (event === "broadcast" && socket.topics.has(topic)) {
    const now = Date.now();
    if (now - windowStart >= 1000) { windowStart = now; inWindow = 0; }
    inWindow++;
    if (limit && inWindow > limit) { dropped++; return; }
    for (const other of sockets) {
      if (other !== socket && other.topics.has(topic)) { other.write(frame(JSON.stringify({ topic, event: "broadcast", payload, ref: null }))); relayed++; }
    }
  }
}

const server = http.createServer((request, response) => {
  if (request.url === "/quit") { response.end("bye"); setTimeout(() => process.exit(0), 50); return; }
  if (request.url === "/stats") { response.end(JSON.stringify({ clients: sockets.size, relayed, dropped })); return; }
  response.writeHead(404).end();
});
server.on("upgrade", (request, socket) => {
  const key = request.headers["sec-websocket-key"];
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.topics = new Set();
  sockets.add(socket);
  let buffer = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.length < 2) return;
      const opcode = buffer[0] & 15;
      let length = buffer[1] & 127;
      let offset = 2;
      if (length === 126) { if (buffer.length < 4) return; length = buffer.readUInt16BE(2); offset = 4; }
      else if (length === 127) { if (buffer.length < 10) return; length = Number(buffer.readBigUInt64BE(2)); offset = 10; }
      const masked = (buffer[1] & 128) !== 0;
      if (buffer.length < offset + (masked ? 4 : 0) + length) return;
      const mask = masked ? buffer.subarray(offset, offset + 4) : null;
      if (masked) offset += 4;
      const payload = Buffer.from(buffer.subarray(offset, offset + length));
      if (mask) for (let index = 0; index < payload.length; index++) payload[index] ^= mask[index % 4];
      buffer = buffer.subarray(offset + length);
      if (opcode === 8) { socket.end(); return; }
      if (opcode === 9) { socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); continue; }
      if (opcode === 1) handle(socket, payload.toString("utf8"));
    }
  });
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => sockets.delete(socket));
});
server.listen(port, () => console.log(`mock realtime on :${port}${limit ? ` (limit ${limit}/s)` : ""}`));
