

export class BadCanvasNode extends Error {
    constructor(node: any, message?: string) {
        super(`issue: ${message} in canvas node: ${JSON.stringify(node)}`)
    }
}