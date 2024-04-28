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

    logger.debug('GPT payload:', chalk.yellow(yaml.dump(payload, {lineWidth: process.stdout.columns})))

    const completion_config: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
        ...payload,
        stream: true
    }

    const chatCompletion = await openai.chat.completions.create(completion_config);

    let response = ''

    let attempts = 1
    while (true) {
        try {
            for await (const compl of chatCompletion) {
                const message = compl.choices[0].delta.content

                if (message) {
                    response += message
                    ctx.emit('stream', message)
                }
            }
            break
        } catch (e) {
            let max_attempts = 3
            if (attempts <= max_attempts && e instanceof OpenAI.APIError) {
                logger.error('OpenAI API Error: ', e)
                let sleep_sec = 2 ** attempts
                logger.error(`retrying (${attempts}/${max_attempts}) in ${sleep_sec}s...`)
                await new Promise((resolve) => setTimeout(resolve, sleep_sec * 1000))
                attempts++
                continue
            }
            throw e
        }
    }


    return {
        response,
        previous: ctx.input,
        prompt: data,
        toString() {
            return response
        }
    }
}