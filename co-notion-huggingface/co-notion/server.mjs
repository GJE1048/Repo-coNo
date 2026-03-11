import http from "http";
import next from "next";
import WebSocket, { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";


const port = Number.parseInt(process.env.PORT || "7860", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();

const clients = new Set();
const docs = new Map();

const messageSync = 0;
const messageAwareness = 1;

const broadcastPresence = (documentId) => {
  const onlineUsernames = Array.from(
    new Set(
      Array.from(clients)
        .filter((client) => client.documentId === documentId && client.username)
        .map((client) => client.username)
    )
  );

  const payload = JSON.stringify({
    type: "presence",
    documentId,
    onlineUsernames,
  });

  for (const client of clients) {
    if (client.documentId === documentId) {
      try {
        client.socket.send(payload);
      } catch {
      }
    }
  }
};

const broadcastToDocument = (documentId, message) => {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.documentId === documentId) {
      try {
        client.socket.send(payload);
      } catch {
      }
    }
  }
};

const handleRealtimeConnection = (socket) => {
  const meta = {
    socket,
    documentId: null,
    username: null,
  };

  clients.add(meta);

  socket.on("message", (data) => {
    let parsed;
    try {
      const str =
        typeof data === "string"
          ? data
          : data instanceof Buffer
          ? data.toString("utf-8")
          : "";
      if (!str) {
        return;
      }
      parsed = JSON.parse(str);
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const msg = parsed;
    if (msg.type === "join_document" && msg.documentId && msg.username) {
      meta.documentId = msg.documentId;
      meta.username = msg.username;
      broadcastPresence(msg.documentId);
      return;
    }

    if (msg.type === "leave_document" && msg.documentId) {
      if (meta.documentId === msg.documentId) {
        meta.documentId = null;
        meta.username = null;
        broadcastPresence(msg.documentId);
      }
      return;
    }

    if (msg.type === "heartbeat" && meta.documentId) {
      return;
    }

    if (msg.type === "document_operations_updated" && msg.documentId) {
      broadcastToDocument(msg.documentId, {
        type: "document_operations_updated",
        documentId: msg.documentId,
        latestVersion: msg.latestVersion ?? null,
      });
    }
  });

  const cleanup = () => {
    const { documentId } = meta;
    clients.delete(meta);
    if (documentId) {
      broadcastPresence(documentId);
    }
  };

  socket.on("close", cleanup);
  socket.on("error", cleanup);
};

class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = ({ added, updated, removed }) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, conn) => {
        send(conn, buff);
      });
    };

    this.awareness.on("update", awarenessChangeHandler);

    this.on("update", (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, conn) => {
        if (conn !== origin) {
          send(conn, buff);
        }
      });
    });
  }
}

const send = (conn, message) => {
  if (conn.readyState !== WebSocket.OPEN) {
    conn.close();
    return;
  }
  try {
    conn.send(message);
  } catch {
    conn.close();
  }
};

const normalizeMessage = (message) => {
  if (Array.isArray(message)) {
    return Buffer.concat(message);
  }
  if (message instanceof ArrayBuffer) {
    return new Uint8Array(message);
  }
  return message;
};

const extractDocName = (url) => {
  const clean = (url || "").split("?")[0];
  if (!clean.startsWith("/yjs")) {
    return "";
  }
  const remainder = clean.slice("/yjs".length);
  return remainder.replace(/^\/+/, "");
};

const setupYjsConnection = (conn, req) => {
  const docName = extractDocName(req.url);
  if (!docName) {
    conn.close();
    return;
  }

  if (!docs.has(docName)) {
    docs.set(docName, new WSSharedDoc(docName));
  }

  const doc = docs.get(docName);
  doc.conns.set(conn, new Set());

  conn.binaryType = "arraybuffer";

  conn.on("message", (message) => {
    const normalized = normalizeMessage(message);
    const data = normalized instanceof Uint8Array ? normalized : new Uint8Array(normalized);
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, null);
        if (encoding.length(encoder) > 1) {
          send(conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness:
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
      default:
        break;
    }
  });

  conn.on("close", () => {
    if (doc.conns.has(conn)) {
      const controlledIds = doc.conns.get(conn);
      doc.conns.delete(conn);
      if (controlledIds) {
        awarenessProtocol.removeAwarenessStates(
          doc.awareness,
          Array.from(controlledIds),
          null
        );
      }
      if (doc.conns.size === 0) {
        doc.destroy();
        docs.delete(docName);
      }
    }
  });

  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(conn, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      send(conn, encoding.toUint8Array(encoder));
    }
  }
};

await app.prepare();

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end("Bad request");
    return;
  }

  if (req.method === "POST" && req.url === "/events/document-operations") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (data?.documentId) {
          broadcastToDocument(data.documentId, {
            type: "document_operations_updated",
            documentId: data.documentId,
            latestVersion: data.latestVersion ?? null,
          });
        }
      } catch {
      }
      res.statusCode = 200;
      res.end("ok");
    });
    return;
  }

  handle(req, res);
});

const wssRealtime = new WebSocketServer({ noServer: true });
const wssYjs = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = req.url || "";
  if (url === "/ws") {
    wssRealtime.handleUpgrade(req, socket, head, (ws) => {
      handleRealtimeConnection(ws);
    });
    return;
  }

  if (url.startsWith("/yjs")) {
    wssYjs.handleUpgrade(req, socket, head, (ws) => {
      setupYjsConnection(ws, req);
    });
    return;
  }

  socket.destroy();
});

server.listen(port, () => {
  process.stdout.write(`Server listening on port ${port}\n`);
});
