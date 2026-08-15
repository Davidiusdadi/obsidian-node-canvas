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

export type {ExecCanvasOptions} from "./runtime/exec-canvas"


// ── Global state ──────────────────────────────────────────────────────────────
export {GlobalContext, MINT_LABEL} from "./types"
export type {ParsedCanvas, InvocationResult} from "./types"

// ── Authoring NodeCompilers ───────────────────────────────────────────────────
export type {NodeCompiler, CompilationContext} from "./compile/template"
export type {ExecutionContext} from "./compile/types"

// ── Compilation ───────────────────────────────────────────────────────────────
// `parseCanvasData` is the path-free half of `parseCanvas`: hand it nodes+edges
// and it runs the identical compile pipeline. This is what a synthesizing
// frontend (inline snippet → one node, markdown → linear chain) builds on.
export {parseCanvas, parseCanvasData} from "./compile/parse-canvas"
export type {RawCanvasData, JSONCanvasNode} from "./compile/parse-canvas"

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

// ── Reusable node-library primitives ──────────────────────────────────────────
// Re-exported so downstream callers that pass a custom `compilers:` array can
// still opt into the engine's stock building blocks (control flow via
// `js`/`ts` code blocks, plus the canvas-IO magic-words for emitting on a
// labeled edge or for the inject/return sub-canvas pattern). Pick what you
// need; nothing is registered by default in this fork.
export {js_to_fn} from "./runtime/js-block-to-fn"
export {default as emitMagicCompiler} from "./node_library/magic-word/canvas-io/emit-input"
export {default as injectMagicCompiler} from "./node_library/magic-word/canvas-io/inject"
export {default as returnMagicCompiler} from "./node_library/magic-word/canvas-io/return"
