import {createCanvasEngine} from "./packages/canvas-engine/src/lib"
import * as path from "path"

const vault = path.join(__dirname, 'claude-vault');

async function test(file: string) {
    console.log(`\n=== Testing: ${file} ===`)
    const res = await createCanvasEngine(vault, file);
    console.log('return_value:', res.return_value)
    console.log('type:', typeof res.return_value)
    if (Array.isArray(res.return_value)) {
        console.log('length:', res.return_value.length)
    }
    return res
}

// Run tests
(async () => {
    // await test('01-simple-return.canvas')
    // await test('02-aggregate-single-edge.canvas')
    // await test('03-aggregate-multi-edge-bug.canvas')
    // await test('04-aggregate-with-emissions.canvas')
    await test('05-aggregate-debug.canvas')
})()
