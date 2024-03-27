import yaml from "yaml"
import nunjucks from "nunjucks"
import {CTX, Fn} from "./code_to_fn"
import z from "zod"
import OpenAI from "openai"
import {ExecutionContext} from "./node-transform"
import {writeFileSync} from "node:fs"
import path from "path"
import {mkdirSync} from "fs"


nunjucks.configure({autoescape: false})

const nunjucks_env = new nunjucks.Environment(undefined, {autoescape: false});




nunjucks_env.addFilter('json', function (str: string) {
    return JSON.stringify(str, null, 4)
})

const messageSchema = z.object({
    role: z.enum(["user", "assistant", 'system']).default('user'),
    content: z.string(),
}).strip()

const schema = z.object({
    model: z.string(),
    messages: z.array(messageSchema),
}).strip()

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});


const zYamlWriteFile = z.object({
    action: z.literal('write'),
    path: z.string(),
    content: z.string(),
})

export const json_as_fn = async (json: any, ctx: CTX, canvas_context: ExecutionContext) => {


    console.log('json_as_fn: ', json)

    const completion_opts = schema.safeParse(json)
    if (completion_opts.success) {
        const chatCompletion = await openai.chat.completions.create({
            ...completion_opts.data
        });

        return {
            response: chatCompletion.choices[0].message.content,
            previous: ctx.input,
            prompt: completion_opts.data
        }
    }

    const write_file = zYamlWriteFile.safeParse(json)

    if (write_file.success) {
        const out_file = path.join(path.parse(canvas_context.canvas_path).dir, write_file.data.path)
        mkdirSync(path.parse(out_file).dir, {recursive: true})
        writeFileSync(out_file, write_file.data.content)
        console.log(`writing file: ${out_file}: ${write_file.data.content}`)

        return json
    }


    return `unknown yaml / json instruction ${JSON.stringify(json, null, 4)}`
}

export const yaml_to_fn = (yaml_string: string, context: ExecutionContext) => {
    const raw_input = yaml_string.replaceAll('\t', '    ')
    const parsed_yaml = yaml.parse(raw_input)

    const fn: Fn = (ctx, input) => {
        const interpolated = transformObjectStrings(parsed_yaml, (v) => {
            return nunjucks_env.renderString(v, {input})
        })
        return json_as_fn(interpolated, ctx, context)
    }
    return fn
}

function transformObjectStrings(obj: any, transformString: (v: string) => any): any {
    if (typeof obj === 'string') {
        // Apply the transformation to the string
        return transformString(obj);
    } else if (Array.isArray(obj)) {
        // Recursively process each item in the array
        return obj.map(item => transformObjectStrings(item, transformString));
    } else if (typeof obj === 'object' && obj !== null) {
        // Recursively process each property in the object
        const transformed: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            transformed[key] = transformObjectStrings(obj[key], transformString);
        }
        return transformed;
    }
    return obj;
}