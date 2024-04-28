import {NodeCompiler} from "../../compile/template"
import {template_render} from "../lang/yaml"
import _ from "lodash"
import {BadCanvasInstruction, NodeReturnNotIntendedByDesign} from "../../runtime/errors"
import {logger} from "../../globals"


export default {
    magic_word: true,
    lang: 'switch',
    compile: async (code) => {
        return (ctx) => {
            const switch_on = template_render(code, ctx).trim()

            const my_out_edges = ctx.frame.node.edges
                .filter((edge) => edge.direction === 'forward' && edge.from === ctx.frame.node.id)

            // sanity checks
            my_out_edges.forEach((edge) => {


                if (edge.label === undefined || edge.label === '') {
                    throw new BadCanvasInstruction(`switch node can not have unnamed outgoing edge with no label`)
                }

                const target_node = ctx.frame.chart.node_map.get(edge.to)!

                if (
                    target_node.original.type === 'file'
                    && target_node.original.file.toLowerCase().endsWith('.canvas')) {
                    throw new BadCanvasInstruction(
                        `switch node can not have outgoing edge directly a canvas node - add a empty node in between`
                    )
                }

                if (edge.label.trim() !== 'else' && edge.label.trim() !== 'default') {
                    try {
                        JSON.parse(edge.label)
                    } catch (e) {
                        throw new BadCanvasInstruction(`invalid switch case label: ${edge.label}`)
                    }
                }

            })

            logger.trace(`<frame ${ctx.frame.id}: switch case: ${my_out_edges.map(e => e.label!.trim())}>`)

            const route_target = _.get({
                input: ctx.input,
                state: ctx.state
            }, switch_on)


            let found = false
            for (const edge of my_out_edges) {
                if (['else', 'default'].includes(edge.label!.trim())) {
                    continue
                }

                const edge_value = JSON.parse(edge.label!)

                logger.trace(`test: if ${edge_value} == ${route_target} from ${switch_on}`)
                // JSON parse to e.g. parse '1' into 1 to allow for typesafe comparison
                if (_.eq(edge_value, route_target)) {
                    logger.trace(`<frame ${ctx.frame.id} using path ${edge.label} >`)
                    ctx.emit(edge.label, ctx.input)
                    found = true
                }
            }

            if(!found) {
                logger.trace(`<frame ${ctx.frame.id} using defualt/else path >`)
                // more intuitive for users
                ctx.emit('else', ctx.input)
                ctx.emit('default', ctx.input)
            }

            throw new NodeReturnNotIntendedByDesign()
        }
    }
} satisfies NodeCompiler
