# Aggregate Bug Investigation Summary

## Quick Summary

**Bug**: Aggregate nodes with multiple incoming edges (especially with emissions) return empty arrays instead of aggregated results.

**Root Cause**: The node gets invoked an extra time AFTER the aggregate has cleared its inputs, causing the final return value to be `[]`.

**Status**: ✅ Successfully reproduced with minimal test case

---

## What I Did

### 1. Created Minimal Test Cases (`claude-vault/`)

Progressive test suite to isolate the bug:

- ✅ `01-simple-return.canvas` - Basic flow works correctly
- ✅ `02-aggregate-single-edge.canvas` - Single-edge aggregate works
- ✅ `03-aggregate-multi-edge-bug.canvas` - Simple multi-edge works (!)
- ❌ `04-aggregate-with-emissions.canvas` - **BUG REPRODUCED**
- ❌ `05-aggregate-debug.canvas` - Detailed logging reveals 5 invocations

### 2. The Bug Manifestation

When running `05-aggregate-debug.canvas`:

```
[EMITTER] executing
[EMITTER] returning main-result
[RECEIVER] got: A
[RECEIVER] got: B
[FINAL] invocation #1, input: main-result    ← Aggregate not ready
[FINAL] invocation #2, input: A              ← Aggregate not ready
[FINAL] invocation #3, input: B              ← Aggregate not ready
[FINAL] invocation #4, input: main-result    ← Aggregate succeeds!
[FINAL] aggregate returned: [ "main-result", "A", "B" ]
[FINAL] invocation #5, input: B              ← EXTRA INVOCATION after clearing
[FINAL] aggregate returned: []                ← Inputs already cleared
return_value: []                              ← Test fails
```

### 3. Key Finding

The final node is invoked **5 times instead of 4**:
- Invocations 1-3: Individual inputs arrive, aggregate not ready yet
- Invocation 4: All inputs ready, **aggregate succeeds** and clears inputs
- **Invocation 5**: Mysterious extra invocation with empty inputs → returns `[]`

---

## Probable Root Cause

**File**: `src/runtime/exec-canvas.ts`
**Function**: `emit_along_edges` (lines 64-92)
**Issue**: Line 89 is outside the conditional block

```typescript
insert.forEach(frame => {
    const already_aggregating = [
        ...active_frames.map(f => f.frame),
        ...stack
    ].some((sf) => sf.node === frame.node && sf.is_aggregating)

    if (!already_aggregating) {
        emissions++
        push_frame(frame)  // ← Only pushes if NOT aggregating (line 87)
    }

    // ⚠️ BUG: This happens REGARDLESS of already_aggregating!
    source_frame.chart.node_this_data.get(frame.node.id)!
        ._invocations[frame.edge.id!]!.push(frame)  // ← Line 89
})
```

**The Problem**:
- Frames are added to `_invocations` even when NOT added to the execution stack
- After aggregation completes and clears `_invocations`, there may be pending frames
- These frames execute with empty `_invocations` → aggregate returns `[]`

---

## Why Simple Cases Work

`03-aggregate-multi-edge-bug.canvas` works because:
- Simple 2-branch merge with no emissions
- Node invoked exactly twice (once per branch)
- No extra invocations after aggregate completes

**The bug only triggers with emissions** because:
- Emissions create additional frames during execution
- These frames may be added to `_invocations` after aggregation starts
- Leading to the extra invocation after aggregation clears its state

---

## Documentation Created

1. **`aggregate-multiple-invocation-bug.md`**
   - Full reproduction steps
   - Progressive test cases
   - Expected vs actual behavior
   - Potential solutions

2. **`bug-analysis-detailed.md`**
   - Line-by-line code analysis
   - Execution trace
   - Theory about invocation #5
   - Proposed fix location

3. **`INVESTIGATION-SUMMARY.md`** (this file)
   - High-level overview
   - Quick reference

---

## Test Files

All test files are in `claude-vault/` (git-ignored):

```bash
# Run individual test
bun test-canvas.ts

# Run failing pipeline test
bun test tests/feature-tour-tests/test.spec.ts
```

---

## Next Steps (If Fixing)

1. **Add trace logging** to track frame IDs through execution
2. **Understand `_invocations` purpose** - why tracked separately from stack?
3. **Test proposed fix**: Move line 89 inside conditional OR add guard in aggregate
4. **Verify all test cases** still pass after fix
5. **Consider edge cases** with nested aggregates

---

## Questions to Resolve

1. Why is `_invocations` populated even for non-executing frames?
2. Where exactly does invocation #5 come from?
3. Is this related to the parallel execution refactor (commit 201a169)?
4. Should aggregate cache its result to handle multiple invocations?
5. Should the execution engine deduplicate/cancel pending invocations after aggregate?

---

## Files Modified/Created

**Created**:
- `claude-vault/` - Test canvas files (5 files)
- `test-canvas.ts` - Test runner script
- `packages/canvas-engine/docs/aggregate-multiple-invocation-bug.md`
- `packages/canvas-engine/docs/bug-analysis-detailed.md`
- `packages/canvas-engine/docs/INVESTIGATION-SUMMARY.md`

**Modified**:
- `.gitignore` - Added `claude-vault/`

**NOT modified**:
- No changes to source code (investigation only)
