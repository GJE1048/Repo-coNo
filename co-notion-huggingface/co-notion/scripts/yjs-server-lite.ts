import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { IncomingMessage } from 'http';

const port = process.env.PORT ? parseInt(process.env.PORT) : 1234;
const wss = new WebSocketServer({ port } as any);

const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = ({ added, updated, removed }: any, origin: any) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients));
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(c, buff);
      });
    };
    this.awareness.on('update', awarenessChangeHandler);

    this.on('update', (update: Uint8Array, origin: any, doc: Y.Doc) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        if (c !== origin) {
           send(c, buff);
        }
      });
    });
  }
}

const send = (conn: WebSocket, m: Uint8Array) => {
  if (conn.readyState !== WebSocket.OPEN) {
    conn.close();
    return;
  }
  try {
    conn.send(m);
  } catch (e) {
    conn.close();
  }
};

const setupWSConnection = (conn: WebSocket, req: IncomingMessage) => {
  const url = req.url || '';
  const docName = url.slice(1).split('?')[0]; // Simple extraction
  
  if (!docs.has(docName)) {
    docs.set(docName, new WSSharedDoc(docName));
  }
  const doc = docs.get(docName)!;
  doc.conns.set(conn, new Set());

  conn.binaryType = 'arraybuffer';
  
  conn.on('message', (message: ArrayBuffer) => {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(new Uint8Array(message));
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
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn);
        break;
    }
  });

  conn.on('close', () => {
    if (doc.conns.has(conn)) {
      const controlledIds = doc.conns.get(conn);
      doc.conns.delete(conn);
      if (controlledIds) {
        awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
      }
      if (doc.conns.size === 0) {
        doc.destroy();
        docs.delete(docName);
      }
    }
  });

  // Init sync
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(conn, encoding.toUint8Array(encoder));
    
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())));
      send(conn, encoding.toUint8Array(encoder));
    }
  }
};

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
});

console.log(`Yjs WebSocket server running on port ${port}`);
