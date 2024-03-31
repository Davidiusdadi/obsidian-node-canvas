import {NodeCompiler} from "./template"
import { gpt_runner_generic} from "./node-yaml-gpt-hepler"
import {logger} from "../../globals"
import {nunjucks_env, template_render} from "./node-yaml"
import chalk from "chalk"

export default {
    lang: 'decide',
    magic_word: true,
    compile: async (code) => {
        return async (ctx, input) => {

            const final_prompt = template_render(code, ctx).trim()
            logger.info(`${chalk.green('decide')} prompt: `, chalk.gray(final_prompt))
            const resp = (await gpt_runner_generic({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: final_prompt
                    }
                ]
            }, ctx)).response?.trim()
            logger.info(`${chalk.green('decide')} response: `, chalk.magenta(resp))
            ctx.emit(resp?.toLowerCase() ?? 'error', input)
            return resp
        }
    }
} satisfies NodeCompiler