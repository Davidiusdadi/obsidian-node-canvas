import {ONode} from "../compile/canvas-node-transform"
import {FnThis} from "./runtime-types"
import {ParsedCanvas} from "../types"


export class ExecutableCanvas {

    node_this_data = new Map<string, FnThis>()
    node_ancestors = new Map<string, Set<string>>()
    nodes: ONode[]
    node_map: Map<string, ONode>

    constructor(public file: string, node_data: ParsedCanvas) {
        const instr = [...node_data.values()]
        this.nodes = instr
        this.node_map = node_data

        instr.forEach(node => {
            const node_this_init = {
                _invocations: Object.assign({}, ...node.edges.filter((edge) => {
                    return edge.direction === 'forward' && edge.to === node.id
                }).map((edge) => {
                    return {
                        [edge.id]: [] as any[]
                    }
                }))
            } satisfies FnThis
            this.node_this_data.set(node.id, node_this_init)

            const ancestors = collect_ancestor(instr, node)
            this.node_ancestors.set(node.id, ancestors)
        })
    }
}


/** collects and returns ancestor_node_ids */
function collect_ancestor(all_nodes: ONode[], node: ONode, ancestor_node_ids: Set<string> = new Set<string>()) {

    const edges_in = node.edges
        .filter((edge) => {
            return edge.direction === 'forward' && edge.to === node.id
        }).map(e => e.from)

    const parents = all_nodes.filter(n => edges_in.includes(n.id))

    for (const parent of parents) {
        if (ancestor_node_ids.has(parent.id)) {
            continue
        }
        ancestor_node_ids.add(parent.id)
        collect_ancestor(all_nodes, parent, ancestor_node_ids)
    }

    return ancestor_node_ids

}