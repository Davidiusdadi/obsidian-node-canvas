import OpenAI from "openai"
import z from "zod"
import {CTX} from "../../../runtime/runtime-types"
import {logger} from "../../../globals"
import chalk from "chalk"
import yaml from "js-yaml"
import _ from "lodash"

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

    // mistral does not support stop -- so we need to impl. it ourselves
    let stop = _.flatten([completion_config.stop!])
        .filter(s => s !== undefined && s !== null)

    if (prefix === 'MISTRAL') {
        if (_.last(completion_config.messages)?.role === 'assistant') {
            const last = completion_config.messages.pop()
            if (last) {
                const new_last = _.last(completion_config.messages!)
                if (!new_last || !new_last.content || typeof new_last.content !== 'string') {
                    throw new Error('last message is not assistant')
                }
                new_last!.content! += last!.content!
            }
        }
    }

    const chatCompletion = await openai.chat.completions.create(completion_config);

    let response = ''

    let attempts = 1

    streaming: while (true) {
        try {

            let buffer = '';
            let max_stop = _.max(stop.map(s => s.length)) ?? 0
            let message = ''

            unspool: for await (const compl of chatCompletion) {
                const chunk = compl.choices[0].delta.content

                if (chunk) {
                    for (const c of chunk) {
                        buffer += c
                        for (const s of stop) {
                            if (buffer.includes(s)) {
                                buffer = buffer.split(s)[0]
                                break unspool
                            }
                        }
                        if (buffer.length === max_stop) {
                            message+=buffer[0]
                            buffer = buffer.slice(1)
                        }
                    }

                    if (message) {
                        response += message
                        ctx.emit('stream', message)
                        message = ''
                    }

                }
            }
            // empty buffer on completion
            if (buffer) {
                response += buffer
                ctx.emit('stream', buffer)
                buffer = ''
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
            logger.error('LLM API Error: ', e)
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