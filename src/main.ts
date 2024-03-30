import yargs from 'yargs';
import {hideBin} from "yargs/helpers"
import chalk from "chalk"
import {logger} from './globals'
import {parseCanvas} from "./compile/parse-canvas"
import {execCanvas} from "./runtime/exec-canvas"




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
let stage = 'parsing';

// parse canvas and run it
(async () => {

    const node_data = await parseCanvas(canvas_path, {
        vault_dir
    })
    stage = 'runtime'
    await execCanvas(node_data, {
        vault_dir
    })
})().catch((e) => {
    console.trace(e)
    console.log(`Error during ${chalk.red(stage)}: ${e}`)
    process.exit(1)
}).then(() => {
    console.log('done 🎉')
})


