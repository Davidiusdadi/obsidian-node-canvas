import {expect, test} from "bun:test";
import {createCanvasEngine} from "../../src/lib"
import * as path from "path"
import {logger} from "../../src/globals"
import chalk from "chalk"


const vault = path.join(path.parse(import.meta.path).dir, '../../../../examples/');


logger.debug = (...args: any[]) => {
    const args_nice = args.map(a => typeof a === 'string' ? chalk.gray(a) : a)
    console.debug('(dbg)', ...args_nice)
}


test('1-arrow-propagation leads to 10 invocation ', async () => {
    const file = "feature-tour/1-arrow-propagation/propagation.canvas"
    const res = await createCanvasEngine(vault, file);
    expect(res.return_value).toBe(10);
});

test('2-flow-control/zip-demo.canvas', async () => {
    const file = "feature-tour/2-flow-control/zip-demo.canvas"

    let inputs: any[] = []
    let id = 0
    const res = await createCanvasEngine(vault, file, {
        inform: (msg) => {
            if (msg.type === 'frame-complete') {
                if (
                    msg.was_invoked
                    && msg.return_canceled === false
                    && msg.return_emissions === 0
                    && msg.frame.edge?.label === 'count'
                ) {
                    console.log('msg.return_value', msg.return_value)
                    expect(msg.return_value.id).toBe(id)
                    inputs.push(msg.return_value)
                    id++
                }
            }
        },
    });
    expect(inputs).toHaveLength(3)
});

test('2-flow-control/aggregate.canvas', async () => {
    const file = "feature-tour/2-flow-control/aggregate.canvas"
    const res = await createCanvasEngine(vault, file);
    expect(res.return_value).toHaveLength(2)
    expect(res.return_value).toHaveLength(2)
    expect(res.return_value).toContain(1)
    expect(res.return_value).toContain(2)
});


test('2-flow-control/aggregate-async.canvas', async () => {
    const file = "feature-tour/2-flow-control/aggregate-async.canvas"
    const res = await createCanvasEngine(vault, file);
    console.log(res.return_value)
    expect(res.return_value).toHaveLength(21)
    expect(res.return_value!.filter((v: string) => v.startsWith('left'))).toHaveLength(10)
    expect(res.return_value!.filter((v: string) => v.startsWith('right'))).toHaveLength(10)
});

test('2-flow-control/aggregate-loop.canvas', async () => {
    const file = "feature-tour/2-flow-control/aggregate-loop.canvas"
    const res = await createCanvasEngine(vault, file);
    console.log(res.return_value)
    expect(res.return_value).toHaveLength(21)
    expect(res.return_value!.filter((v: string) => v.startsWith('left'))).toHaveLength(10)
    expect(res.return_value!.filter((v: string) => v.startsWith('right'))).toHaveLength(10)
});



test('2-flow-control/zip-and-aggregate.canvas', async () => {
    const file = "feature-tour/2-flow-control/zip-and-aggregate.canvas"
    const res = await createCanvasEngine(vault, file);
    expect(res.return_value).toHaveLength(2)
    const left = res.return_value.find((v: any) => typeof v === 'object')
    expect(left.id).toBe('a')
    expect(Object.keys(left)).toHaveLength(4)
});




test('3-canvas-signals/caller.canvas', async () => {
    const file = "feature-tour/3-canvas-signals/caller.canvas"
    let inputs: any[] = []
    let id = 0
    const res = await createCanvasEngine(vault, file, {
        inform: (msg) => {
            if (msg.type === 'frame-complete') {
                if (
                    msg.was_invoked
                    && msg.return_canceled === false
                    && msg.return_emissions === 0
                    && msg.frame.edge?.label === 'count'
                ) {
                    //console.log('msg.return_value', msg.return_value)
                    expect(msg.return_value.id).toBe(id)
                    inputs.push(msg.return_value)
                    id++
                }
            }
        }
    });
    expect(res.return_value).toBe(4)
});
