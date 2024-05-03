import {WebSocket, WebSocketServer} from 'ws';
import {ExecutableCanvas} from "../ExecutableCanvas"
import {DMsgCanvas, inspector2runner, MsgRunner2Inspector, RRunnerState, runner2inspector} from "./protocol"
import {GlobalContext} from "../../types"
import * as Flatted from 'flatted';
import {logger} from "../../globals"

const clients = new Set<WebSocket>()


let dev_server_await: ReturnType<typeof createResolvable> | null = null

export const startDevServer = () => {
    const PORT = 9763;
    const wss = new WebSocketServer({port: PORT});


    const runner_state: RRunnerState = {
        type: 'runner-state',
        state: 'running'
    }

    let canvases: ExecutableCanvas[] = []

    wss.on('connection', function connection(ws) {
        logger.info('inspector connected');

        clients.add(ws)

        const send = (msg: MsgRunner2Inspector) => {
            ws.send(Flatted.stringify(msg))
        }

        canvases.forEach((canvas) => {
            send({
                type: 'canvas',
                canvas
            } satisfies DMsgCanvas)
        })

        send(runner_state)


        ws.on('message', function message(data) {
            const json = Flatted.parse(data.toString())
            const msg = inspector2runner.parse(json)

            if (msg.type === 'debug-action') {
                if (msg.action === 'step') {
                    runner_state.state = 'stepping'
                } else if (msg.action === 'fast-forward') {
                    runner_state.state = 'running'
                }
            }
            dev_server_await?.resolve()

        });

        ws.on('close', function close() {
            logger.info('inspector disconnected');
        })
    });

    const waitForInput = (): Promise<any> => {
        if (dev_server_await) {
            return dev_server_await.promise
        } else {
            dev_server_await = createResolvable()
        }
        return dev_server_await.promise.then(() => {
            dev_server_await = null
        })
    }


    return {
        installGlobalIntrospections: (context: GlobalContext) => {

            context.introspection = {
                inform: async (msg) => {
                    try {
                        const wire_msg = runner2inspector.parse(msg)
                        logger.debug('(introspection)', wire_msg.type)

                        if(wire_msg.type === 'canvas') {
                            canvases.push(wire_msg.canvas!)
                        }


                        const str = Flatted.stringify(wire_msg)
                        clients.forEach((ws) => {
                            ws.send(str)
                        })

                        if (runner_state.state === 'stepping' && msg.type === 'frame-step') {
                            await waitForInput()
                        }
                    } catch (e) {
                        logger.error('Error sending message to inspector:', JSON.stringify(msg, null, 2))
                        process.exit(1)
                    }
                },
                installIntrospections: (canvas: ExecutableCanvas) => {
                    //
                },
                waitForInput
            }
        }
    }
}


function createResolvable() {
    let resolve: () => void
    const promise = new Promise<void>((r) => {
        resolve = r
    })
    return {
        resolve: resolve!,
        promise
    }
}