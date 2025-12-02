# Performance Issue: Hover Detection Causing Lag During Pan/Zoom

## Problem Summary

The application experiences significant FPS drops and lag during panning and zooming. Commenting out the pointer event handlers on the `<points>` element dramatically improves performance.

## Current Implementation

In `frontend/src/components/PackagePoints.tsx`, we attach pointer event handlers directly to the Three.js points element:

```tsx
<points
  ref={pointsRef}
  geometry={geometry}
  material={material}
  onPointerMove={handlePointerMove}
  onPointerOut={handlePointerOut}
  onClick={handleClick}
/>
```

The hover detection logic in `frontend/src/hooks/usePointHover.ts` uses a spatial index for efficient point lookup and includes throttling:

```typescript
const handlePointerMove = useCallback(
  (event: ThreeEvent<PointerEvent>) => {
    const now = performance.now();

    // Throttle: skip if we checked recently
    if (now - lastHoverCheckRef.current < HOVER_THROTTLE_MS) {
      return;
    }
    lastHoverCheckRef.current = now;

    // Skip hover detection while camera is moving
    // ... camera movement check ...

    // Spatial index lookup (checks only nearby cells, not all points)
    // ... efficient hover detection logic ...
  },
  [...]
);
```

## Root Cause

The performance issue is **not** in our hover detection logic. The bottleneck occurs in React Three Fiber's event system *before* our handler is even called.

### How R3F Events Work

When you attach `onPointerMove` to a mesh or points element, React Three Fiber:

1. Intercepts pointer events at the canvas level
2. Performs **raycasting against all objects with event handlers**
3. For a `<points>` geometry, this means raycasting against potentially **thousands of points**
4. Only then calls your event handler

This raycasting happens on **every pointer move event** (60+ times per second), regardless of any throttling in your handler.

### Why Our Optimizations Don't Help

```
User moves mouse
       ↓
R3F intercepts event
       ↓
R3F raycasts against ~10,000 points  ← EXPENSIVE (happens before our code)
       ↓
Our handlePointerMove is called
       ↓
Our throttle check (too late, damage done)
```

## Evidence

When the pointer event handlers are commented out:
```tsx
<points
  ref={pointsRef}
  geometry={geometry}
  material={material}
  // onPointerMove={handlePointerMove}
  // onPointerOut={handlePointerOut}
  // onClick={handleClick}
/>
```

Panning and zooming become significantly smoother with higher FPS, confirming the issue is in R3F's event/raycasting system.

## Relevant Files

- `frontend/src/components/PackagePoints.tsx` - Points component with event handlers
- `frontend/src/hooks/usePointHover.ts` - Hover detection logic with spatial index
- `frontend/src/utils/spatialIndex.ts` - Spatial indexing implementation

## Constraints

- Need to maintain hover detection (highlight point under cursor, show tooltip)
- Need to maintain click-to-select functionality
- Must work with ~10,000+ points
- Should not degrade pan/zoom performance

## Questions to Consider

1. How should pointer events be captured without triggering R3F's expensive raycasting?
2. Should we use native DOM events on the canvas instead of R3F's event system?
3. Is there a way to disable R3F raycasting while keeping event handlers?
4. Should hover detection be tied to the render loop instead of pointer events?
5. What are the tradeoffs between different approaches in terms of code complexity and maintainability?
