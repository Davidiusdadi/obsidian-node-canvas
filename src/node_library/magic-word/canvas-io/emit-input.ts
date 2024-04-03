import {NodeCompiler} from "../../../compile/template"


export default {
    magic_word: true,
    lang: 'emit',
    compile: async (code) => {
        return (ctx) => {
            // this function will be manipulated by the file-loader in order bridge between caller and callee .canvas
            ctx.emit(code, ctx.input)
        }
    }
} satisfies NodeCompiler
