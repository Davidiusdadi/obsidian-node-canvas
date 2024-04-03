import {NodeCompiler} from "../../compile/template"
import {spawn} from 'child_process'
import {nunjucks_env, template_render} from "./yaml"

export default {
    lang: 'bash',
    compile: async (code) => {
        return async (ctx) => {

            let exit: (value: unknown) => void;
            const exit_promise = new Promise((resolve, reject) => {
                exit = resolve;
            })

            const process = spawn('bash', [
                '-c', template_render(code, ctx)
            ]);


            let partialLineStdout = '';
            let partialLineStderr = '';


            function processStdoutLine(line: string) {
                ctx.emit('stdout', line)

            }


            function processStderrLine(line: string) {
                ctx.emit('stderr', line)
            }


            process.stdout.on('data', (data) => {
                const lines = (partialLineStdout + data.toString()).split('\n');
                lines.forEach((line, index) => {
                    if (index === lines.length - 1 && line) {
                        partialLineStdout = line;
                    } else if (line) {
                        processStdoutLine(line);
                        partialLineStdout = ''; // Reset partial line buffer after processing
                    }
                });
            });


            process.stderr.on('data', (data) => {
                const lines = (partialLineStderr + data.toString()).split('\n');
                lines.forEach((line, index) => {
                    if (index === lines.length - 1 && line) {
                        partialLineStderr = line;
                    } else if (line) {
                        processStderrLine(line);
                        partialLineStderr = ''; // Reset partial line buffer after processing
                    }
                });
            });


            process.on('close', (code) => {
                // Process any remaining partial line if the process closes
                if (partialLineStdout) {
                    processStdoutLine(partialLineStdout);
                    partialLineStdout = ''; // Clear the buffer
                }
                if (partialLineStderr) {
                    processStderrLine(partialLineStderr);
                    partialLineStderr = ''; // Clear the buffer
                }
                exit(code);
            });

            return exit_promise
        }
    }
} satisfies NodeCompiler