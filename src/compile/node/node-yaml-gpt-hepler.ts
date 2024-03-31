import OpenAI from "openai"
import z from "zod"
import {CTX} from "../../runtime/runtime-types"
import {logger} from "../../globals"
import chalk from "chalk"


const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted,
});

const messageSchema = z.object({
    role: z.enum(["user", "assistant", 'system']).default('user'),
    content: z.string(),
}).strip()

export const ZSchemaGPT = z.object({
    model: z.string(),
    messages: z.array(messageSchema),
}).strip()

export async function gpt_runner_yaml(data: z.output<typeof ZSchemaGPT>, ctx:  CTX) {
    const res = await gpt_runner_generic(data, ctx)
    logger.info(`${chalk.green(data.model ?? 'model missing')} response: `, chalk.magenta(res.response))
    return res
}

export async function gpt_runner_generic(data: z.output<typeof ZSchemaGPT>, ctx:  CTX) {
    const chatCompletion = await openai.chat.completions.create({
        ...data
    });

    const response = chatCompletion.choices[0].message.content?.trim()

    return {
        response,
        previous: ctx.input,
        prompt: data
    }
}