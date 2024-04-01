import {NodeCompiler} from "../compile/node/template"
import {gpt_runner_generic} from "../compile/node/node-yaml-gpt-hepler"
import {logger} from "../globals"
import {template_render} from "../compile/node/node-yaml"
import chalk from "chalk"

export default {
    lang: 'llm-prompt',
    magic_word: true,
    compile: async (code) => {
        return async (ctx, input) => {
            const final_prompt = template_render(code, ctx).trim()
            logger.debug(`${chalk.green('llm-prompt')}: `, chalk.gray(final_prompt))
            const resp = (await gpt_runner_generic({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: final_prompt
                    }
                ]
            }, ctx))

            return resp
        }
    }
} satisfies NodeCompiler