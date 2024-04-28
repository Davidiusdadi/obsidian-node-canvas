

export let logger = {
    ...console,
    debug: (...args: any[]) => {},
    warn: console.warn,
    error: console.error,
    info: console.info,
    trace: (...args: any[]) => {
        logger.debug('(trace)', ...args)
    },
}

