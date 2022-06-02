import { WebSocketServer } from 'ws';
import { performStca } from './stca.js';

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

    console.log("New connection from %s", ws._socket.address());
});

wss.broadcast = function broadcast(msg) {
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};

setInterval(() => {
    performStca(planeData, (data) => {
        wss.broadcast(JSON.stringify(data));
        console.debug(data);
    });
}, 1000)