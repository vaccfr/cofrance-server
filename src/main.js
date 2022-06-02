import { WebSocketServer } from 'ws';
import { performStca } from './stca.js';
import { RotatingFileStream } from 'rotating-file-stream';

const stream = new RotatingFileStream(function(){return "runtime.log"}, {
  size: "10M", // rotate every 10 MegaBytes written
  interval: "1d", // rotate daily
  compress: "gzip" // compress rotated files
});

const log = function(msg) {
    stream.write("["+new Date().toString()+"] - " + msg+"\n");
}

var planeData = []

const wss = new WebSocketServer({ port: 4756 });

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        var d = JSON.parse(data);
        var test = planeData.filter(obj => obj.callsign == d.callsign)

        // If it exists in array we delete from it
        if (test !== undefined)
            planeData = planeData.filter(obj => obj.callsign !== d.callsign);
        
        planeData.push(d);
    });

    log("Connection from "+ws._socket.address().toString());
});

wss.on('close', function close() {
    log("Client disconnected.");
});

wss.broadcast = function broadcast(msg) {
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};

setInterval(() => {
    performStca(planeData, (data) => {
        wss.broadcast(JSON.stringify(data));
        if (data.length > 0)
            log("Found conflicts: "+data.join());
    });
}, 1000)