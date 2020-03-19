const WebSocket = require('ws');
let interval;
const ws = new WebSocket('ws://127.0.0.1:3004', {
  origin: 'https://websocket.org'
});

ws.on('open', function open() {
    interval = setInterval(() => {
	 ws.send('ACK');
    }, 5e3)
});

ws.on('close', function close() {
  clearInterval(interval)
});

ws.on('message', function incoming(data) {
    const jdata = JSON.parse(data)
    if (jdata.status == 'ok') {

    } else {
      console.log(jdata);
    }

});
