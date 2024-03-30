import z from "zod"
import {CTX} from "../../runtime/runtime-types"
import {ExecutionContext} from "../canvas-node-transform"
import path from "path"
import {mkdirSync} from "fs"
import {writeFileSync} from "node:fs"
import {BadCanvasInstruction} from "../../runtime/errors"

const zYamlWriteFile = z.object({
    action: z.literal('write'),
    path: z.string(),
    content: z.string(),
})


export async function yaml_action_runner(json: object, ctx: CTX, canvas_context: ExecutionContext) {
    const write_file = zYamlWriteFile.safeParse(json)

    if (write_file.success) {
        const out_file = path.join(path.parse(canvas_context.canvas_path).dir, write_file.data.path)
        mkdirSync(path.parse(out_file).dir, {recursive: true})
        writeFileSync(out_file, write_file.data.content)
        console.log(`writing file: ${out_file}: ${write_file.data.content}`)

        return json
    } else {
        throw new BadCanvasInstruction(`yaml instruction not recognized: ${JSON.stringify(json, null, 4)}`)
    }
}