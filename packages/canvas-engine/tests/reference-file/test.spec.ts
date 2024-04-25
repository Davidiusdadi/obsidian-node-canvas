import {expect, test} from "bun:test";
import {createCanvasEngine} from "../../src/lib"


test('createCanvasEngine return last return_value', async () => {
    const res = await createCanvasEngine(import.meta.dirname, "hello.canvas",);
    expect(res.return_value).toBe(42);
});