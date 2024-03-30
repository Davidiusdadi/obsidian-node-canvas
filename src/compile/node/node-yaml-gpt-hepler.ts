import OpenAI from "openai"
import z from "zod"
import {CTX} from "../../runtime/runtime-types"


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

export async function gpt_runner(data: z.output<typeof ZSchemaGPT>, ctx:  CTX) {
    const chatCompletion = await openai.chat.completions.create({
        ...data
    });

    return {
        response: chatCompletion.choices[0].message.content,
        previous: ctx.input,
        prompt: data
    }
}