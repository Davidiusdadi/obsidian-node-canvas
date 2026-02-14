# How to Create a Canvas

## Purpose

Canvas files define visual node-based programs where nodes execute code and connect via edges to pass data. Each node can:
- Execute TypeScript/JavaScript code
- Receive input from connected nodes
- Emit data along labeled edges
- Aggregate inputs from multiple sources
- Maintain state across invocations

## Format (JSON)

Canvas files are JSON with two main arrays:

```json
{
  "nodes": [
    {
      "id": "unique-node-id",
      "type": "text",
      "text": "node content",
      "x": 0,
      "y": 0,
      "width": 250,
      "height": 100
    }
  ],
  "edges": [
    {
      "id": "unique-edge-id",
      "fromNode": "source-node-id",
      "fromSide": "bottom",
      "toNode": "target-node-id",
      "toSide": "top",
      "label": "optional-edge-label"
    }
  ]
}
```

## Node Instruction Format

Nodes execute code written in TypeScript/JavaScript code blocks:

### Basic Code Execution
````markdown
```ts
// Access input from incoming edges
console.log(input)

// Return value sent along default edges
return 'result'
```
````

### Emissions (Named Outputs)
````markdown
```ts
// Emit values along labeled edges
emit('label-name', 'value')

// Default return still works
return 'main-result'
```
````

### Aggregation
````markdown
```ts
// Wait for all incoming edges and collect their values
const values = aggregate().list()
return values  // Returns array of all inputs
```
````

### State Management
````markdown
```ts
// Access persistent state across invocations
this.counter = (this.counter || 0) + 1
return this.counter
```
````

### Special Syntax
- **Markdown blocks**: Text nodes without code blocks are treated as markdown
- **Variables**: `{{expression}}` syntax for templating (e.g., `**log**: {{input}}`)
- **Special prefixes**:
  - `**log**: message` - Log output
  - `**emit**: label` - Emit along labeled edge
  - `**on**: event-name` - Event trigger nodes
