import OpenAI from "openai"
import z from "zod"
import {CTX} from "../../../runtime/runtime-types"
import {logger} from "../../../globals"
import chalk from "chalk"
import yaml from "js-yaml"

const prefix = process.env.LLM_PROVIDER ?? 'OPENAI'
const LLM_CONFIG = {
    API_BASE_URL: process.env[`${prefix}_BASE_URL`] ?? 'https://api.openai.com/v1',
    API_KEY: process.env[`${prefix}_API_KEY`] ?? 'no-key-specifed',
    API_MODEL: process.env[`${prefix}_API_MODEL`] ?? 'gpt-3.5-turbo'
}

let openai: OpenAI

const messageSchema = z.object({
    role: z.enum(["user", "assistant", 'system']).default('user'),
    content: z.string(),
}).strip()

export const ZSchemaGPT = z.object({
    model: z.string().default(LLM_CONFIG.API_MODEL),
    messages: z.array(messageSchema),
    stop: z.array(z.string()).optional(),
}).strip()

export async function gpt_runner_yaml(data: z.input<typeof ZSchemaGPT>, ctx: CTX) {
    const res = await gpt_runner_generic(data, ctx)
    logger.debug(`${chalk.green(ZSchemaGPT.parse(data).model ?? 'model missing')} response: `, chalk.magenta(res.response))
    return res
}


export async function gpt_runner_generic(data: z.input<typeof ZSchemaGPT>, ctx: CTX) {

    if (!openai) {
        logger.debug(`creating LLM client: ${LLM_CONFIG.API_MODEL} @ ${LLM_CONFIG.API_BASE_URL}`)
        openai = new OpenAI({
            baseURL: LLM_CONFIG.API_BASE_URL ?? 'https://api.openai.com/v1',
            apiKey: LLM_CONFIG.API_KEY, // This is the default and can be omitted,
            defaultQuery: {
                model: LLM_CONFIG.API_MODEL ?? 'gpt-3.5-turbo',
            }
        });
    }


    const payload = ZSchemaGPT.parse(data)

    logger.debug('GPT payload: ', chalk.yellow(yaml.dump(payload)))

    const completion_config: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        ...payload,

    }

    const chatCompletion = await openai.chat.completions.create(completion_config);

    const response = chatCompletion.choices[0].message.content?.trim()

    return {
        response,
        previous: ctx.input,
        prompt: data,
        toString() {
            return response
        }
    }
}