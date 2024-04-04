import yargs from 'yargs';
import {hideBin} from "yargs/helpers"
import chalk from "chalk"
import {logger} from './globals'
import {parseCanvas} from "./compile/parse-canvas"
import {execCanvas} from "./runtime/exec-canvas"
import chokidar from 'chokidar'
import path from "node:path"
import {existsSync} from "node:fs"
import {ExecutableCanvas} from "./runtime/ExecutableCanvas"
import {startDevServer} from "./runtime/dev-server/server"


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
        console.debug(...args_nice)
    }
}


const debug_color = chalk.magenta;
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
    chokidar.watch(canvas_path_full, {
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 200
        },
        atomic: 400,
    }).on('all', async (eventName, path, stats) => {
        refeshes++
        console.log(`evt (${eventName})`)

        if (refeshes > 1) {
            console.log(`canvas changed... (${eventName})`)
            canvas_invalidated = true
        }

        const run = () => {
            console.log(`executing ${canvas_path}...`)
            completion_promise = parseAndRun().then(() => {
                completion_promise = null
                if (canvas_invalidated) {
                    canvas_invalidated = false
                    run()
                }
            })
        }

        if (completion_promise) {
            console.log('waiting for previous run to complete...')
        } else {
            canvas_invalidated = false
            run()
        }
    })
})()

async function parseAndRun() {
    try {
        const node_data = await parseCanvas(canvas_path, {
            vault_dir
        })
        const canvas = new ExecutableCanvas(node_data)
        if (should_start_server) {
            const server = startDevServer()
            server.setCanvas(canvas)
        }

        stage = 'runtime'
        await execCanvas(canvas, {
            vault_dir
        })
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
