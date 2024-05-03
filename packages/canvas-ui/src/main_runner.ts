import yargs from "yargs"
import {hideBin} from "yargs/helpers"
import {createCanvasEngine} from "canvas-engine"

console.log('process.argv', process.argv)

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
    }).parseSync()

const canvas_path = args.canvas
const vault_dir = args.vault

async function parseAndRun() {
    try {
        return await createCanvasEngine(vault_dir, canvas_path)
    } catch (e) {
        console.trace(e)
        console.log(`Error during canvas execution: ${e}`)
        process.exit(1)
    }

}

export {parseAndRun}