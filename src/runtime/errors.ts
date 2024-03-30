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