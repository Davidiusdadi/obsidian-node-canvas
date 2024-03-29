
export type CTX =  {
    emit: (label: string, value: any) => void
    input: any
    vault_dir: string
} & Record<string, any>

export type Fn = (ctx: CTX, input: any) => any


export function js_to_fn(code: string): Fn {
    const instr_code =  `
return (async () => {
let state = ctx.state;
const emit = (...args) => {
    ctx.state = state;
    return ctx.emit(...args);
};
${code}

ctx.state = state;
})()
`
    const fn = new Function('ctx','input', instr_code) as Fn
    return fn
}

