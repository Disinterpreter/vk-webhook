const http = require('http');
const conf = require('./config.json');
const WebSocket = require('ws');
const request = require('request')


let callback = process.env.VKCALLBACK || conf.inc_status;
let port = process.env.VKPORT || conf.cb_port;
let wsport = process.env.WSPORT || conf.ws_port;
let vkconf = process.env.VKCONF || conf.cb_conf;


if ((typeof(callback) == "undefined") ||
 (typeof(wsport) == "undefined")) {
    throw new Error('Not enough parameters');
} else {
    console.log ("The VK WebSocket wrapper is starting...")
}

if (callback == 1) {
    if (port) {
        startServer(port)
    } else {
        startServer()
    }
} else {
    startLongPoll()
}



const wss = new WebSocket.Server({ port: wsport });

function startServer(port=8080) {
    http.createServer((request, response) => {
        if (request.method === 'POST') {
          let body = [];
          request.on('data', (chunk) => {
            body.push(chunk);
          }).on('end', () => {
            body = Buffer.concat(body).toString();

            let doing = handleReq(body,response);
            if (doing == 1) {
                return;
            }
            response.end('ok');
          });
        } else {
          response.statusCode = 404;
          response.end();
        }
      }).listen(port);
}

function handleReq(arg, resp) {
    try {
        let jarg = JSON.parse(arg);
        if (jarg.type == "confirmation") {
            resp.end(process.env.VKCONF);
            return 1;
        } else {
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                client.send(arg);
                }
            });
              
            resp.end("ok");
            
            return 0;
        }
    } catch (e) {
        console.log("not JSON");
    }    
}

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        if (data == 'ACK') {
            let status = {"status": "ok"}
            let jstatus = JSON.stringify(status);
            ws.send(jstatus);
        }
    });
});


function getLpUrl() {
    return new Promise((resolve, reject) => {
        request.post('https://api.vk.com/method/groups.getLongPollServer', {
            form: {
                access_token: conf.lp_access_oken,
                group_id: conf.lp_group_id,
                v: conf.lp_v
            }
        }, (error, res, body) => {
            if (error) {
                console.error(error)
                return
            }
                resolve(body);
                return
        })
    })
}

function getLpData(url) {
    return new Promise((resolve, reject) => {
        request.get(url, function(error, response, body){
            if(error) {
                console.log(error);
                return
            } else {
                resolve(body);
                return
            }
        })
        });
}
function handleLpData(dlp) {
    let jdlp = JSON.parse(dlp);
    if(jdlp.updates.length == 0) { return dlp };
    if ( typeof(jdlp.updates) == "object" ) {
        if (jdlp.updates[0].type == "message_new") {
            message = jdlp.updates[0].object.message;

            let compArr = {
                "type": jdlp.updates[0].type,
                "object": message,
                "group_id": jdlp.updates[0].group_id,
                "event_id": jdlp.updates[0].event_id,
            }
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(compArr));
                }
            });
            return;
        }
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(jdlp.updates));
            }
        });
    }

    return jdlp.updates

}
function startLongPoll() {
    server = undefined;
    key = undefined;
    (async () => {
        while(true){
        //for (let i = 1; i< 10; i++) {
            let lpserv = await getLpUrl();
            lpserv = JSON.parse(lpserv);
            if ( (typeof(server) == "undefined" ) && (typeof(key) == "undefined" )  ) {
    
                let dlp = await getLpData(lpserv.response.server+"?act=a_check&key="+lpserv.response.key+"&ts="+lpserv.response.ts+"&wait=25" );
                handleLpData(dlp);
                server = lpserv.response.server;
                key = lpserv.response.key;
            } else {
    
                let dlp = await getLpData(server+"?act=a_check&key="+key+"&ts="+lpserv.response.ts+"&wait=25" );
                handleLpData(dlp);
            }
        }
        })()
}
