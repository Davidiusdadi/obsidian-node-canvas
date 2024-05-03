import yargs from 'yargs';
import {hideBin} from "yargs/helpers"
import chalk from "chalk"
import {logger} from './globals'
import {execCanvas} from "./runtime/exec-canvas"
import chokidar from 'chokidar'
import path from "node:path"
import {existsSync} from "node:fs"
import {ExecutableCanvas} from "./runtime/ExecutableCanvas"
import {startDevServer} from "./runtime/inspection/server"
import {GlobalContext} from "./types"
import {DMsgCanvas} from "./runtime/inspection/protocol"
import _ from "lodash"
import {FileNode, loadFileNode} from "./compile/file-loader"
import {node_non_unique_fields} from "./compile/canvas-node-transform"


const args = yargs(hideBin(process.argv))
    .option('vault', {
        type: 'string',
        demandOption: true,
    })
    .option('canvas', {
        type: 'string',
        demandOption: true,
    }).option('debug', {
        type: 'boolean',
        default: false
    })
    .option('watch', {
        type: 'boolean',
        default: false
    })
    .option('hot', {
        type: 'boolean',
        default: true
    })
    .option('--server', {
        type: 'boolean',
        description: 'start a dev server for the canvas',
        default: false
    })
    .parseSync()

const canvas_path = args.canvas
const vault_dir = args.vault
const watch = args.watch
const should_start_server = args.server


if (args.debug) {
    logger.debug = (...args: any[]) => {
        const args_nice = args.map(a => typeof a === 'string' ? debug_color(a) : a)
        console.debug('(dbg)', ...args_nice)
    }
}


const debug_color = chalk.reset;
let stage = 'parsing';

// parse canvas and run it
(async () => {

    let refeshes = 0
    let completion_promise: Promise<void> | null = null
    let canvas_invalidated = false

    if (!watch) {
        return await parseAndRun()
    }

    let canvas_path_full = path.join(vault_dir, canvas_path)

    if (!existsSync(canvas_path_full)) {
        console.log(`canvas file not found: ${canvas_path_full}`)
        process.exit(1)
    }

    console.log(`watching ${canvas_path_full} ...`)
    parseAndRun()
})()

async function parseAndRun() {
    try {

        let global_context = new GlobalContext(vault_dir)


        stage = 'runtime'

        let root_canvas: ExecutableCanvas


        const parseC = async () => {

            if (root_canvas) {
                return root_canvas
            }

            const root_file = () => ({
                type: 'file',
                edges: [],
                id: 'root',
                comment: 'root',
                fn: () => {
                },
                canvas: undefined,
                original: {
                    type: 'file',
                } as any,
                file: canvas_path
            } satisfies FileNode)

            const parse = await loadFileNode(root_file(), {
                gctx: global_context,
                ectx: {
                    canvas_path,
                    vault_dir
                }
            })

            if (parse.type !== 'file' || !parse.canvas) {
                throw new Error(`expected a canvas file`)
            }
            root_canvas = parse.canvas


            if (args.hot) {
                const all_canvas: ExecutableCanvas[] = []

                let paths = Object.values(global_context.loaded_files).map((n) => {
                    if (n.type === 'file') {
                        return path.join(vault_dir, n.file)
                    }
                    return undefined as any as string
                }).filter((n) => n)
                paths = _.uniq(paths)

                console.log(`watching: ${paths}`)
                chokidar.watch(paths, {
                    ignoreInitial: true,
                    awaitWriteFinish: {
                        stabilityThreshold: 200
                    },
                    atomic: 400,
                }).on('all', async (evnt, path,) => {
                    console.log(`hot reload: ${evnt}: ${path}`)
                    const node = global_context.loaded_files[path]
                    let temp_gctx = new GlobalContext(vault_dir)
                    temp_gctx.introspection = global_context.introspection
                    let new_node = await loadFileNode(root_file(), {
                        gctx: temp_gctx,
                        ectx: {
                            canvas_path,
                            vault_dir
                        }
                    })
                    const new_files = temp_gctx.loaded_files
                    const old_files = global_context.loaded_files
                    Object.entries(old_files).forEach(([k, old]) => {
                        const new_file = new_files[k]
                        if (!old_files) {
                            console.log('hot: adding', k)
                            delete old_files[k]
                        } else {

                            if (new_file.type === 'file'
                                && old.type === 'file'
                                && new_file.canvas
                                && old.canvas
                            ) {
                                console.log('hot: update', k)
                                old.canvas.replaceWith(new_file.canvas)
                            } else {
                                throw new Error(`hot: failed update ${k}`)
                            }
                        }
                    })
                    console.log('hot: stack', global_context.stack.map((f) => f.id));
                    [
                        ...global_context.stack,
                        ...global_context.active_frames.map((f) => f.frame)
                    ].forEach((frame) => {
                        const new_node = frame.chart.node_map.get(frame.node.id)
                        if (!new_node) {
                            throw new Error(`hot: node not found: ${frame.node.id}`)
                        }


                        {
                            const new_node_og = _.omit(new_node.original, node_non_unique_fields)
                            for (const key of Object.keys(new_node_og)) {
                                const k = key as any
                                const old_v = _.get(frame.node.original, k)
                                const new_v = _.get(new_node.original, k)
                                if (old_v !== new_v) {
                                    console.log(`hot: stack <frame ${frame.node.id}>`, new_node_og, '=>', old_v)
                                }
                            }

                        }

                        frame.node = new_node


                        console.log('hot: stack replace frame', frame.id)
                    })
                })
            }

            return root_canvas
        }


        if (should_start_server) {
            const inspector = startDevServer()


            inspector.installGlobalIntrospections(global_context)
            let canvas = await parseC()

            global_context.introspection?.inform({
                type: 'canvas',
                canvas,
                is_start_canvas: true
            } satisfies DMsgCanvas)

            console.log('waiting for inspector to connect / (re)start...')
            await global_context.introspection?.waitForInput?.()
            await execCanvas(canvas, global_context)


        } else {
            await execCanvas(await parseC(), global_context)
        }


    } catch (e) {
        console.trace(e)
        console.log(`Error during ${chalk.red(stage)}: ${e}`)
        process.exit(1)
    }

    if (!watch) {
        console.log('done 🎉')
        process.exit(0)
    } else {
        console.log('done 🎉 (continuing to watch for changes...)')
    }
}
