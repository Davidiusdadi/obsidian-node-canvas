export class InputsNotFullfilled extends Error {
    /**
     * whether node enters aggregating state
     **/

    constructor(public is_aggregating: boolean) {
        super()
    }
}

/// means the user has a badly constructed canvas
export class BadCanvasInstruction extends Error {

}

// e.g. arrow to a .canvas should not "return"
export class NodeReturnNotIntendedByDesign extends Error {

}

/**
 * The run passed `gctx.deadline`. Thrown out of `execCanvas`, which abandons
 * whatever is still in flight — a node's promise may stay pending forever, and
 * that is deliberate: the engine cannot cancel arbitrary user code, so the
 * caller's contract is "this run produced nothing" rather than "this run
 * stopped cleanly". Callers that publish results must therefore treat a whole
 * run as one transaction and discard partial output.
 */
export class DeadlineExceeded extends Error {
    constructor(public readonly deadline_ms: number) {
        super(`canvas run exceeded its deadline (${new Date(deadline_ms).toISOString()})`)
        this.name = 'DeadlineExceeded'
    }
}