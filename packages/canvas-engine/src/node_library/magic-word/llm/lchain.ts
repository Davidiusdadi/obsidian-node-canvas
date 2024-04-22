import {NodeCompiler} from "../../../compile/template"
import {logger} from "../../../globals"
import {template_render} from "../../lang/yaml"
import chalk from "chalk"
import {ChatOllama} from "@langchain/community/chat_models/ollama";
import {StringOutputParser} from "@langchain/core/output_parsers";
import {HumanMessage} from "@langchain/core/messages";
import {zRLLMChunk, zRUpdate} from "../../../runtime/inspection/protocol"
import {z} from "zod"


const model_ollama_gemma = new ChatOllama({
    baseUrl: "http://localhost:11434", // Default value
    model: "gemma", // Default value
});



export default {
    lang: 'lchain',
    magic_word: true,
    compile: async (code) => {
        return async (ctx) => {
            const final_prompt = template_render(code, ctx).trim()
            logger.debug(`${chalk.green('llm-prompt')}: `, chalk.gray(final_prompt))

            const stream = await model_ollama_gemma
                .pipe(new StringOutputParser())
                .stream([
                    new HumanMessage(final_prompt)
                ])


            const chunks: string[] = []
            for await (const message of stream) {
                process.stdout.write(message)
                chunks.push(message)
                ctx.gctx.introspection?.inform({
                    type: 'llm-chunk',
                    chunk: message,
                    frame_id: ctx.frame.id
                } satisfies z.input<typeof zRLLMChunk>)
            }

            return chunks.join('')
        }
    }
} satisfies NodeCompiler