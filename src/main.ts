import yargs from 'yargs';
import {hideBin} from "yargs/helpers"

import {CNode, ExecutionContext, parseNode, ZEdge} from "./node/types"

import {CTX, Fn} from "./node/code_to_fn"
import z from "zod"
import chalk from "chalk"
import {logger} from './globals'
import {parseCanvas} from "./parse-canvas"
import {execCanvas} from "./exec-canvas"




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
    .parseSync()

const canvas_path = args.canvas
const vault_dir = args.vault


if (args.debug) {
    logger.debug = (...args: any[]) => {
        const args_nice = args.map(a => typeof a === 'string' ? debug_color(a) : a)
        console.debug(...args_nice)
    }
}


const debug_color = chalk.magenta;





(async () => {
    const node_data = await parseCanvas(canvas_path, {
        vault_dir
    })

    await execCanvas(node_data)

})()


