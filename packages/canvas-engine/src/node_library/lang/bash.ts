import {NodeCompiler} from "../../compile/template"
import {spawn} from 'child_process'
import {template_render} from "./yaml"
import {logger} from "../../globals"

export default {
    lang: 'bash',
    compile: async (code) => {
        return async (ctx) => {

            let exit: (value: unknown) => void;
            const exit_promise = new Promise((resolve, reject) => {
                exit = resolve;
            })

            const bash_proc = spawn('bash', [
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


            bash_proc.stdout.on('data', (data) => {
                process.stdout.write(data)
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


            bash_proc.stderr.on('data', (data) => {
                process.stdout.write(data)
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


            bash_proc.on('close', (code) => {
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

            const competion = await Promise.race([
                exit_promise, new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve('timeout');
                    }, 10 * 1000);
                })]);

            if (competion === 'timeout') {
                logger.trace('<bash timeout error>')
                ctx.emit('timeout', ctx.input)
                bash_proc.kill('SIGKILL');
                return -1
            }

            return competion
        }
    }
} satisfies NodeCompiler