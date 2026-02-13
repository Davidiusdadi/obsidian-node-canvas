# Detailed Bug Analysis: Extra Invocation After Aggregate

## The Bug in emit_along_edges (exec-canvas.ts:80-89)

```typescript
insert.forEach(frame => {
    const already_aggregating = [
        ...active_frames.map(f => f.frame),
        ...stack
    ].some((sf) => sf.node === frame.node && sf.is_aggregating)
    if (!already_aggregating) {
        emissions++
        push_frame(frame)  // ← Line 87: Push to stack only if NOT aggregating
    }
    source_frame.chart.node_this_data.get(frame.node.id)!._invocations[frame.edge.id!]!.push(frame)  // ← Line 89: ALWAYS adds to _invocations
})
```

### The Problem

**Line 89 is OUTSIDE the `if (!already_aggregating)` block!**

This means:
- Line 87: Frame is pushed to stack ONLY if node is NOT already aggregating
- Line 89: Frame is ALWAYS added to `_invocations` (used by aggregate)

## Execution Trace for Bug Reproduction

Using `05-aggregate-debug.canvas`:

### Step 1: Emitter executes
```
[EMITTER] executing
emit('signal', 'A')  → Creates frame for receiver
emit('signal', 'B')  → Creates frame for receiver
return 'main-result' → Creates frame for final node
```

**Stack after emitter:**
- Frame for final node (input: 'main-result')
- Frame for receiver (input: 'A')
- Frame for receiver (input: 'B')

### Step 2: Receiver processes 'A'
```
[RECEIVER] got: A
return 'A'  → Creates frame for final node (input: 'A')
```

**Now final node has 2 invocations queued**

### Step 3: Receiver processes 'B'
```
[RECEIVER] got: B
return 'B'  → Creates frame for final node (input: 'B')
```

**Now final node has 3 invocations queued**

### Step 4: Final node invocations 1-3
```
[FINAL] invocation #1, input: main-result  ← aggregate not ready, throws InputsNotFullfilled
[FINAL] invocation #2, input: A            ← aggregate not ready, throws InputsNotFullfilled
[FINAL] invocation #3, input: B            ← aggregate not ready, throws InputsNotFullfilled
```

When `InputsNotFullfilled(is_aggregating=true)` is thrown, the frame is marked with `is_aggregating = true` and pushed back to stack.

### Step 5: Invocation #4 (aggregating)
```
[FINAL] invocation #4, input: main-result
```

All 3 inputs are now in `_invocations`. The aggregate succeeds:
```
[FINAL] aggregate returned: [ "main-result", "A", "B" ]
```

**CRITICAL**: At joins.ts:59-62, aggregate clears `_invocations`:
```typescript
for (const edge_id of Object.keys(this.inputs)) {
    this.inputs[edge_id].length = 0  // ← Empties all invocation arrays
}
```

### Step 6: The Mystery Invocation #5

**Question**: Where does invocation #5 come from?

Looking at pop_frame (exec-canvas.ts:119):
```typescript
_.remove(stack, (f) => f.node.id === first_ready_aggregation.node.id).forEach((f) => {
    if (f !== frame) {
        gctx.introspection?.inform({
            type: 'frame-complete',
            frame: f,
            reason: 'aggregation',
            was_invoked: false,  // ← These frames are marked as NOT invoked
            ...
        })
    }
})
```

**Hypothesis**: There are 4 frames for the final node in the stack (invocations 1-4), but after one completes with aggregation, the other 3 should be removed and marked as "not invoked". However, there seems to be a 5th frame that gets executed afterwards.

## Why Does Invocation #5 Happen?

Need to investigate:
1. Is there a frame that gets pushed to stack AFTER aggregation completes?
2. Does one of the "removed" frames somehow get re-executed?
3. Is there a timing issue with parallel execution?

## Testing Theory

Add trace logging to see:
- When frames are pushed to stack
- When frames are removed from stack
- What's in the stack before/after aggregation

## Potential Fix Location

**exec-canvas.ts:89** - Move this line INSIDE the `if (!already_aggregating)` block:

```typescript
insert.forEach(frame => {
    const already_aggregating = [
        ...active_frames.map(f => f.frame),
        ...stack
    ].some((sf) => sf.node === frame.node && sf.is_aggregating)
    if (!already_aggregating) {
        emissions++
        push_frame(frame)
        // MOVE THIS LINE HERE:
        source_frame.chart.node_this_data.get(frame.node.id)!._invocations[frame.edge.id!]!.push(frame)
    }
    // REMOVE FROM HERE
})
```

**BUT**: This might break other functionality. Need to understand why `_invocations` is tracked separately from the stack.

## Next Investigation Steps

1. Add detailed trace logging to exec-canvas.ts
2. Track exact frame IDs through execution
3. Understand the relationship between stack and _invocations
4. Determine if line 89 should be conditional or if the fix needs to be elsewhere
