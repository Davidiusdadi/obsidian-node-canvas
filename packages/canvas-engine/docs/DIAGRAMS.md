# Visual Diagrams: Aggregate Bug Investigation

## Test Case 1: Simple Return ✅ WORKS

```
┌─────────┐
│  start  │
└────┬────┘
     │
     ▼
┌─────────┐
│ return  │
│   42    │
└─────────┘

Result: 42
Status: ✅ Works perfectly
```

---

## Test Case 2: Single Edge Aggregate ✅ WORKS

```
┌─────────┐
│  start  │
└────┬────┘
     │
     ▼
┌─────────────┐
│  emitter    │
│ emit('a',1) │
│ emit('a',2) │
└──────┬──────┘
       │ (label: 'a')
       ▼
┌──────────────┐
│  receiver    │
│ aggregate()  │ ← Waits for both emissions
│ return 'ok'  │
└──────┬───────┘
       │
       ▼
┌────────────────┐
│     final      │
│ aggregate()    │ ← Gets 1 input from receiver
│    .list()     │
└────────────────┘

Invocations:
- receiver: 2 times (once per emission)
- final: 1 time (once after receiver completes)

Result: ["ok"]
Status: ✅ Works perfectly
```

---

## Test Case 3: Multiple Edges (No Emissions) ✅ WORKS

```
┌─────────┐
│  start  │
└────┬────┘
     │
     ├─────────────┐
     │             │
     ▼             ▼
┌─────────┐   ┌─────────┐
│ branch1 │   │ branch2 │
│return A │   │return B │
└────┬────┘   └────┬────┘
     │             │
     └──────┬──────┘
            ▼
      ┌──────────┐
      │  final   │
      │aggregate │
      │  .list() │
      └──────────┘

Invocations:
- final: 2 times (once per branch)
  - Invocation 1: input=A, aggregate not ready (throws)
  - Invocation 2: input=B, aggregate ready → returns ["A", "B"]

Result: ["A", "B"]
Status: ✅ Works perfectly
```

---

## Test Case 4: With Emissions ❌ BUG REPRODUCES

```
┌─────────┐
│  start  │
└────┬────┘
     │
     ▼
┌──────────────────┐
│    emitter       │
│ emit('signal',A) │
│ emit('signal',B) │
│ return 'main'    │
└────┬─────────┬───┘
     │         │ (label: 'signal')
     │         │
     │         ▼
     │    ┌──────────┐
     │    │ receiver │ ← Invoked 2x (once per emission)
     │    │ return   │
     │    │  input   │
     │    └────┬─────┘
     │         │
     └────┬────┘
          │
          ▼
    ┌──────────┐
    │  final   │  ← ⚠️ Invoked 5 TIMES (should be 3)
    │aggregate │
    │  .list() │
    └──────────┘

Invocations of 'final':
1. input='main'  → aggregate not ready
2. input='A'     → aggregate not ready
3. input='B'     → aggregate not ready
4. input='main'  → aggregate ready! Returns ["main","A","B"] ✅
5. input='B'     → 🐛 EXTRA! Inputs cleared, returns []

Final return_value: [] ❌
Expected: ["main", "A", "B"]
```

---

## The Bug Explained Visually

### What SHOULD Happen:

```
Time →

Emitter completes
    ├─→ Frame(final, input='main')     → Stack
    ├─→ Frame(receiver, input='A')     → Stack
    └─→ Frame(receiver, input='B')     → Stack

Receiver(A) completes
    └─→ Frame(final, input='A')        → Stack

Receiver(B) completes
    └─→ Frame(final, input='B')        → Stack

Final node has 3 inputs ready:
    _invocations = {
        edge1: [Frame(input='main')],
        edge2: [Frame(input='A'), Frame(input='B')]
    }

Final executes (picks one frame, marks as aggregating)
    → All 3 frames in _invocations
    → aggregate() collects: ["main", "A", "B"]
    → Clears _invocations
    → Other 2 frames removed from stack
    ✅ Done! Return ["main", "A", "B"]
```

### What ACTUALLY Happens:

```
Time →

[Same as above until...]

Final executes 4th time (aggregating)
    → aggregate() collects: ["main", "A", "B"]
    → Clears _invocations
    ✅ Success!

⚠️ BUT THEN...

Final executes 5th time (?!)
    → _invocations is EMPTY (cleared on step 4)
    → aggregate() returns: []
    ❌ This becomes the return_value
```

---

## Why the Extra Invocation?

### The Code Path:

**exec-canvas.ts:64-92** - `emit_along_edges` function:

```typescript
const emit_along_edges = (source_frame, edges, value) => {
    const insert = edges.map(e => {
        return {
            node: get_node(e.to),
            input: value,
            // ... other fields
        }
    })

    insert.forEach(frame => {
        const already_aggregating =
            [...active_frames, ...stack]
                .some(sf => sf.node === frame.node && sf.is_aggregating)

        if (!already_aggregating) {
            push_frame(frame)  // ← Add to execution stack
        }

        // 🐛 BUG: This line is OUTSIDE the if block!
        _invocations[frame.edge.id].push(frame)
    })
}
```

### The Problem:

```
Step 1: Emitter returns 'main'
    → Creates frame for final node
    → already_aggregating = false
    → ✅ Pushes to stack
    → ✅ Adds to _invocations

Step 2: Receiver returns 'A'
    → Creates frame for final node
    → already_aggregating = false
    → ✅ Pushes to stack
    → ✅ Adds to _invocations

Step 3: Receiver returns 'B'
    → Creates frame for final node
    → already_aggregating = false
    → ✅ Pushes to stack
    → ✅ Adds to _invocations

Step 4: Final node starts executing (invocation 1-3)
    → Throws InputsNotFullfilled(is_aggregating=true)
    → Frame marked with is_aggregating = true
    → Put back on stack

Step 5: Some other emission happens (?)
    → Creates frame for final node
    → already_aggregating = TRUE ← Skip stack push
    → ❌ STILL adds to _invocations (Line 89!)

Step 6: Final node aggregates (invocation 4)
    → Collects from _invocations
    → Clears _invocations
    → Success!

Step 7: Final node executes again (invocation 5)
    → 🐛 Frame from Step 5 was on stack somehow?
    → _invocations is empty
    → Returns []
```

---

## Comparison: Working vs Broken

### ✅ Working (Test 3: Multi-edge, no emissions)

```
Branch1 ──┐
          ├─→ Final (2 frames total, both execute)
Branch2 ──┘

Timeline:
1. Both branches complete → 2 frames for final
2. Final invoked with frame 1 → aggregate not ready
3. Final invoked with frame 2 → aggregate ready → SUCCESS
```

### ❌ Broken (Test 4: With emissions)

```
Emitter ──┬─→ Final (frame 1)
          │
          └─→ Receiver ─→ Final (frame 2, 3)

Timeline:
1. Emitter completes → 1 frame for final, 2 for receiver
2. Receivers complete → 2 more frames for final
3. Final invoked 3 times → aggregate not ready
4. Final marked as aggregating
5. ⚠️ Some emission adds frame to _invocations but NOT stack
6. Final aggregates → clears _invocations
7. 🐛 Orphaned frame executes → empty aggregate
```

---

## The Fix

### Problem Location:

**File**: `src/runtime/exec-canvas.ts`
**Lines**: 80-90

```typescript
insert.forEach(frame => {
    const already_aggregating = [
        ...active_frames.map(f => f.frame),
        ...stack
    ].some((sf) => sf.node === frame.node && sf.is_aggregating)

    if (!already_aggregating) {
        emissions++
        push_frame(frame)
    }

    // 🐛 BUG IS HERE - Line 89
    source_frame.chart.node_this_data.get(frame.node.id)!
        ._invocations[frame.edge.id!]!.push(frame)
})
```

### Proposed Fix Option 1: Move Line Inside Conditional

```typescript
insert.forEach(frame => {
    const already_aggregating = [
        ...active_frames.map(f => f.frame),
        ...stack
    ].some((sf) => sf.node === frame.node && sf.is_aggregating)

    if (!already_aggregating) {
        emissions++
        push_frame(frame)
        // ✅ FIX: Move this inside the if block
        source_frame.chart.node_this_data.get(frame.node.id)!
            ._invocations[frame.edge.id!]!.push(frame)
    }
    // Remove from here
})
```

**Pros**:
- Simple, one-line move
- Ensures _invocations only tracks frames that will execute

**Cons**:
- May break if _invocations serves another purpose
- Need to verify all tests still pass

---

### Proposed Fix Option 2: Guard in Aggregate

**File**: `src/runtime/joins.ts`
**Lines**: 43-69

```typescript
get aggregate() {
    logger.trace(`<frame ${this.ctx.frame.id} attempt aggregation>`)
    this.guardJoinOrAggregateStillPossible()

    if (!this.frame.is_aggregating) {
        logger.trace(`<frame ${this.ctx.frame.id} aggregation begins>`)
        throw new InputsNotFullfilled(true)
    }

    // ✅ FIX: Check if already completed
    if (this.completed === 'aggregate') {
        // Return cached result instead of re-computing
        return Object.assign(() => this.ctx.input, this.resultAPI('input'))
    }

    logger.trace(`${this.ctx.frame.id} aggregation complete`)
    const new_inputs = _.flatten(
        Object.values(this.inputs).map((invocations) =>
            invocations.map((invocation) => invocation.input))
    )

    // ... rest of function
}
```

**Pros**:
- Defensive - handles multiple invocations gracefully
- Doesn't change execution flow

**Cons**:
- Treats symptom, not root cause
- Still allows extra invocations

---

### Proposed Fix Option 3: Prevent Re-execution After Aggregate

**File**: `src/runtime/exec-canvas.ts`
**Function**: `pop_frame` or `invoke_frame`

Add check before invoking frame:

```typescript
const invoke_frame = async (frame: StackFrame): Promise<InvocationResult> => {
    // ✅ FIX: Check if node already completed aggregate
    const node_data = frame.chart.node_this_data.get(frame.node.id)
    if (node_data._aggregate_completed) {
        return {
            type: 'frame-complete',
            frame,
            return_canceled: true,
            was_invoked: false,
            return_emissions: 0,
            reason: 'aggregate-already-completed'
        }
    }

    // ... existing code
}
```

And in the aggregate getter, mark completion:

```typescript
this.ctx._this._aggregate_completed = true
```

**Pros**:
- Prevents execution of duplicate frames
- Clear intent

**Cons**:
- Adds new state tracking
- More complex

---

## Recommended Fix

**Option 1** (move line 89 inside conditional) is the cleanest fix if it doesn't break other functionality.

### Implementation Steps:

1. Move line 89 inside the `if (!already_aggregating)` block
2. Run all existing tests to verify nothing breaks
3. Run the failing test to confirm it now passes
4. Add a regression test using one of the minimal canvases

### Test After Fix:

```bash
# Should all pass
bun test

# Specific test that was failing
bun test tests/feature-tour-tests/test.spec.ts

# Minimal reproduction
bun test-canvas.ts
```

Expected after fix:
```
[FINAL] invocation #1, input: main-result
[FINAL] invocation #2, input: A
[FINAL] invocation #3, input: B
[FINAL] aggregate returned: [ "main-result", "A", "B" ]
return_value: [ "main-result", "A", "B" ] ✅
```
