# Aggregate Multiple Invocation Bug Investigation

## Summary

When an aggregate node has multiple incoming edges (especially with emissions), the node gets invoked multiple times AFTER the aggregate has already completed and cleared its inputs, causing the final return value to be an empty array instead of the aggregated results.

## Minimal Reproduction

See `claude-vault/04-aggregate-with-emissions.canvas` and `claude-vault/05-aggregate-debug.canvas`

### Test Case Structure

```
start
  ↓
emitter (emits 'signal' twice, returns 'main-result')
  ↓ (default)        ↓ (signal emissions)
  ↓                  receiver (returns signal value)
  ↓                  ↓
  └─────→ final ←────┘
          (calls aggregate().list())
```

### Expected Behavior

The final node should:
1. Wait for all 3 inputs (1 from emitter, 2 from receiver)
2. Invoke aggregate once when all inputs are ready
3. Return `["main-result", "A", "B"]`

### Actual Behavior

```
[EMITTER] executing
[EMITTER] returning main-result
[RECEIVER] got: A
[RECEIVER] got: B
[FINAL] invocation #1, input: main-result
[FINAL] invocation #2, input: A
[FINAL] invocation #3, input: B
[FINAL] invocation #4, input: main-result      ← Aggregate ready here
[FINAL] aggregate returned: [ "main-result", "A", "B" ]
[FINAL] invocation #5, input: B                 ← EXTRA INVOCATION!
[FINAL] aggregate returned: []                  ← Inputs cleared, returns empty
return_value: []
```

The node is invoked **5 times**:
- Invocations 1-3: Individual inputs arrive (aggregate not ready, throws `InputsNotFullfilled`)
- Invocation 4: All inputs ready, aggregate succeeds and returns 3 items
- **Invocation 5**: Extra invocation AFTER aggregate cleared inputs → returns `[]`

## Root Cause

The parallel execution logic (added in commit `201a169`) appears to be scheduling an extra invocation of the node after the aggregate has already completed and cleared its inputs.

### Code Location

**`src/runtime/joins.ts:43-69`** - `aggregate` getter:
```typescript
get aggregate() {
    // ... validation ...

    // Collects inputs into array
    const new_inputs = _.flatten(
        Object.values(this.inputs).map((invocations) =>
            invocations.map((invocation) => invocation.input))
    )

    // **BUG**: Clears inputs immediately
    for (const edge_id of Object.keys(this.inputs)) {
        this.inputs[edge_id].length = 0  // ← Inputs cleared here
    }

    this.ctx.updateInput(new_inputs)
    // ... returns result API ...
}
```

After the aggregate completes, `this.inputs` is emptied. If the node is invoked again (which it is), the aggregate will return an empty array.

**`src/runtime/exec-canvas.ts:260-337`** - Parallel execution loop:
- The execution engine schedules node invocations based on incoming edges
- When a node completes with aggregate, it may have already scheduled additional invocations
- These pending invocations execute even after the aggregate has cleared its state

## Why Simple Cases Work

**`claude-vault/03-aggregate-multi-edge-bug.canvas`** works correctly because:
- Simple 2-branch merge with no emissions
- Node is invoked exactly twice (once per branch)
- Aggregate completes on the 2nd invocation
- No additional invocations are scheduled

## Progressive Test Cases

### 1. Simple Return (`01-simple-return.canvas`)
✅ Works - Basic flow, returns `42`

### 2. Aggregate with Single Edge (`02-aggregate-single-edge.canvas`)
✅ Works - Returns `["processed"]`

### 3. Aggregate with Multiple Edges (`03-aggregate-multi-edge-bug.canvas`)
✅ Works - Returns `["result-A", "result-B"]`

### 4. Aggregate with Emissions (`04-aggregate-with-emissions.canvas`)
❌ **FAILS** - Returns `[]` instead of `["main-result", "A", "B"]`

### 5. Aggregate with Debug Logging (`05-aggregate-debug.canvas`)
❌ **FAILS** - Shows 5 invocations, last one returns empty array

## Hypothesis

The bug occurs when:
1. A node has multiple incoming edges
2. At least one edge comes from emissions (not just direct returns)
3. The parallel execution scheduler has queued invocations before the aggregate completes
4. After aggregate clears inputs, pending invocations still execute

The execution engine doesn't check if an aggregate node has already completed before executing pending invocations.

## Potential Solutions

### Option 1: Prevent Multiple Executions After Aggregate
Mark the node as "aggregate completed" and skip subsequent invocations

### Option 2: Don't Clear Inputs Until All Invocations Complete
Track pending invocations and only clear inputs when the queue is empty

### Option 3: Cache Aggregate Result
Store the aggregate result and return it for subsequent invocations instead of re-computing

### Option 4: Fix Invocation Scheduling
The execution engine should deduplicate or cancel pending invocations when a node completes with aggregate

## Next Steps

1. ✅ Reproduce bug with minimal test case
2. ✅ Document invocation sequence
3. ⏳ Analyze execution engine scheduling logic
4. ⏳ Determine why extra invocations are scheduled
5. ⏳ Implement fix in parallel execution logic

## Related Files

- `src/runtime/exec-canvas.ts` - Parallel execution logic
- `src/runtime/joins.ts` - Aggregate implementation
- `tests/feature-tour-tests/test.spec.ts:78` - Failing test
- `examples/feature-tour/2-flow-control/zip-and-aggregate.canvas` - Complex failing example

## Test Command

```bash
bun test-canvas.ts
```

Or run specific test:
```bash
bun test tests/feature-tour-tests/test.spec.ts
```
