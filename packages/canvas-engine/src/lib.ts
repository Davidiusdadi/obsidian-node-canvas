import {GlobalContext} from "./types"
import {parseCanvas} from "./compile/parse-canvas"
import {execCanvas} from "./runtime/exec-canvas"
import {ExecutableCanvas} from "./runtime/ExecutableCanvas"
import {Introspection} from "./runtime/runtime-types"
import {NodeCompiler} from "./compile/template"

// ── Engine entry ──────────────────────────────────────────────────────────────
export {execCanvas} from "./runtime/exec-canvas"
// Built-in node library was removed in the whalerust fork — callers must
// supply their own `compilers:` to createCanvasEngine.
export const defaultCompilers: NodeCompiler[] = []

export type EngineOptions = {
    introspection?: Introspection
    /** Fully replaces built-in compilers when provided */
    compilers?: NodeCompiler[]
    /** Merged after built-in compilers */
    extraCompilers?: NodeCompiler[]
}

export const createCanvasEngine = async (
    vault_dir: string,
    canvas_path: string,
    optionsOrIntrospection?: EngineOptions | Introspection
) => {
    let introspection: Introspection | undefined
    let compilers: NodeCompiler[]

    if (optionsOrIntrospection && 'inform' in optionsOrIntrospection) {
        // Backward compat: 3rd arg is Introspection directly
        introspection = optionsOrIntrospection as Introspection
        compilers = defaultCompilers
    } else {
        const opts = optionsOrIntrospection as EngineOptions | undefined
        introspection = opts?.introspection
        compilers = opts?.compilers ?? [...defaultCompilers, ...(opts?.extraCompilers ?? [])]
    }

    let global_context = new GlobalContext(vault_dir)
    global_context.introspection = introspection
    global_context.nodeCompilers = compilers
    let node_data = await parseCanvas(canvas_path, global_context)
    return await execCanvas(new ExecutableCanvas(canvas_path, node_data), global_context)
}

export default createCanvasEngine

// ── Global state ──────────────────────────────────────────────────────────────
export {GlobalContext} from "./types"
export type {ParsedCanvas, InvocationResult} from "./types"

// ── Authoring NodeCompilers ───────────────────────────────────────────────────
export type {NodeCompiler, CompilationContext} from "./compile/template"
export type {ExecutionContext} from "./compile/types"

// ── Canvas model ──────────────────────────────────────────────────────────────
export type {ONode, ONodeFile, RuntimeONode} from "./compile/canvas-node-transform"
export {ExecutableCanvas} from "./runtime/ExecutableCanvas"

// ── Runtime types ─────────────────────────────────────────────────────────────
export type {CTX, Fn, FnThis, Introspection, StackFrame} from "./runtime/runtime-types"

// ── Errors ────────────────────────────────────────────────────────────────────
export * from "./runtime/errors"

// ── Inspection protocol (for debuggers / viewers) ─────────────────────────────
export type {
    zRFrame,
    MsgRunner2Inspector,
    MsgInspector2Runner,
    RRunnerState,
    DMsgCanvas,
} from "./runtime/inspection/protocol"
