import {NodeCompiler} from "../../compile/template"
import {gpt_runner_generic} from "../lang/yaml/node-yaml-gpt-hepler"
import {logger} from "../../globals"
import {template_render} from "../lang/yaml"
import chalk from "chalk"

export default {
    lang: 'llm-prompt',
    magic_word: true,
    compile: async (code) => {
        return async (ctx) => {
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