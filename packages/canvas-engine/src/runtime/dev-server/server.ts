import {WebSocketServer} from 'ws';
import {ExecutableCanvas} from "../ExecutableCanvas"


export type DMsgCanvas = {
    type: 'canvas',
    canvas: ExecutableCanvas | null
}

export const startDevServer = () => {
    const PORT = 9763;
    const wss = new WebSocketServer({port: PORT});


    let canvas: ExecutableCanvas | null = null

    wss.on('connection', function connection(ws) {
        console.log('Connection opened');

        ws.send(JSON.stringify({
            type: 'canvas',
            canvas: canvas
        } satisfies DMsgCanvas));

        ws.on('message', function message(data) {
            console.log('received: %s', data);
            // Echo the message back to the client
            ws.send(`Server received: ${data}`);
        });

        ws.on('close', function close() {
            console.log('Connection closed');
        });


    });

    return {
        setCanvas: (c: ExecutableCanvas) => {
            canvas = c
        }
    }
}