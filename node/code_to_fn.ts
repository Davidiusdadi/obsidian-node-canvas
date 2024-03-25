
export type CTX =  {
    emit: (label: string, value: any) => void
    input: any
} & Record<string, any>

export type Fn = (ctx: CTX, input: any) => any


export function js_to_fn(code: string): Fn {
    const instr_code =  `return (async () => {${code}})()`
    const fn = new Function('ctx','input', instr_code) as Fn
    return fn
}

