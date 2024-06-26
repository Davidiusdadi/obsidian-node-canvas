import yaml from "yaml"
import nunjucks from "nunjucks"
import {CTX, Fn} from "../../../runtime/runtime-types"
import {NodeCompiler} from "../../../compile/template"
import {gpt_runner_yaml, ZSchemaGPT} from "./node-yaml-gpt-hepler"
import {yaml_action_runner} from "./node-yaml-action"
import {logger} from "../../../globals"

import {ExecutionContext} from "../../../compile/types"


nunjucks.configure({autoescape: false})

export const nunjucks_env = new nunjucks.Environment(undefined, {autoescape: false});

nunjucks_env.addFilter('json', function (str: string) {
    return JSON.stringify(str, null, 4)
})


export const json_as_fn = async (json: any, ctx: CTX, canvas_context: ExecutionContext) => {

    logger.debug('compiled yaml: ', json)
    const completion_opts = ZSchemaGPT.safeParse(json)
    if (completion_opts.success) {
        return gpt_runner_yaml(completion_opts.data, ctx)
    } else {
        return yaml_action_runner(json, ctx, canvas_context)
    }
}

export const yaml_to_fn = (yaml_string: string, context: ExecutionContext) => {
    const raw_input = yaml_string.replaceAll('\t', '    ')
    const parsed_yaml = yaml.parse(raw_input)

    const fn: Fn = (ctx, input) => {
        const interpolated = transformObjectStrings(parsed_yaml, (v) => {
            return template_render(v, ctx)
        })
        return json_as_fn(interpolated, ctx, context)
    }
    return fn
}

export function template_render(template: string, ctx: CTX) {
    return nunjucks_env.renderString(template, {input: ctx.input, state: ctx.state, ctx: ctx, this: ctx._this})
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

export default {
    lang: 'yaml',
    compile: async (code, context) => {
        return yaml_to_fn(code, context)
    }
} satisfies NodeCompiler