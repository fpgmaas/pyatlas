# Layout Overhaul Plan: Google Maps Style UI

## Overview

Transform the current sidebar-centric layout into a Google Maps-style interface with:

- **Mobile**: Top search bar with action chips
- **Desktop**: Collapsible sidebar with modal-based interactions

---

## Current State Analysis

### Existing Architecture

- React 19 + TypeScript + Tailwind CSS
- Zustand for state management
- Responsive breakpoint: `lg` (1024px)
- Components: Sidebar, SearchBar, ClusterLegend, PackageDetail
- No formal modal system

### Components to Refactor

- `Sidebar.tsx` - Currently handles both mobile/desktop with conditional rendering
- `SearchBar.tsx` - Embedded in sidebar
- `ClusterLegend.tsx` - Embedded in sidebar

---

## Target Architecture

```
/frontend/src/
├── components/
│   ├── layout/
│   │   ├── MobileLayout.tsx          # Mobile-specific layout (composition only)
│   │   ├── DesktopLayout.tsx         # Desktop-specific layout (composition only)
│   │   ├── TopBar.tsx                # Mobile: search bar + chips
│   │   └── Sidebar/
│   │       ├── Sidebar.tsx           # Desktop sidebar container
│   │       ├── SidebarHeader.tsx     # Logo + close button
│   │       ├── SidebarSearch.tsx     # Search wrapper
│   │       └── SidebarMenu.tsx       # Menu buttons (Controls/Clusters/FAQ)
│   ├── modals/
│   │   ├── Modal.tsx                 # Reusable modal wrapper (accessible)
│   │   ├── Modals.tsx                # All modals mounted once (global)
│   │   ├── ControlsModal.tsx         # Controls/keyboard shortcuts
│   │   ├── ClustersModal.tsx         # Cluster visibility management
│   │   └── FAQModal.tsx              # FAQ content (placeholder)
│   ├── shared/
│   │   ├── SearchBar.tsx             # Refactored search (reusable)
│   │   ├── Chip.tsx                  # Action chip component
│   │   └── ClusterList.tsx           # Cluster toggle list (extracted)
│   └── ... (existing canvas components)
├── hooks/
│   └── useModal.ts                   # Convenience wrapper around store
├── store/
│   └── useGalaxyStore.ts             # Single source of truth for modal state
└── ...
```

---

## Key Architectural Decisions

### 1. Modal State: Single Source of Truth

**Store as primary, hook as convenience wrapper:**

```typescript
// store/useGalaxyStore.ts
type ModalId = "controls" | "clusters" | "faq" | null;

interface GalaxyState {
  activeModal: ModalId;
  setActiveModal: (modal: ModalId) => void;
  // ...existing state
}
```

```typescript
// hooks/useModal.ts
export function useModal(modalId: Exclude<ModalId, null>) {
  const activeModal = useGalaxyStore((s) => s.activeModal);
  const setActiveModal = useGalaxyStore((s) => s.setActiveModal);

  return {
    isOpen: activeModal === modalId,
    open: () => setActiveModal(modalId),
    close: () => setActiveModal(null),
  };
}
```

**Why**: Single state source prevents desync, clean API for components.

### 2. Layout Components: Composition Only

`MobileLayout` and `DesktopLayout` should contain **no business logic**:

- All behavior/state lives in shared components + store
- Layouts are pure composition of UI elements

```tsx
// MobileLayout - composition only
<>
  <TopBar />
  <PackageDetail />
  {/* Canvas lives in parent App */}
</>

// DesktopLayout - composition only
<>
  <Sidebar />
  <PackageDetail />
</>
```

### 3. Global Modal Rendering

**Render modals ONCE at app root**, not in each layout:

```tsx
// App.tsx
<>
  <GalaxyCanvas />
  {isMobile ? <MobileLayout /> : <DesktopLayout />}
  <Modals /> {/* Single mount point for all modals */}
</>
```

**Why**: Avoids duplicate DOM, z-index issues, and focus management problems.

### 4. Pointer Events Strategy

Use `pointer-events-none` on floating overlays to prevent blocking canvas:

```tsx
<div className="pointer-events-none fixed inset-x-0 top-0 z-50">
  <div className="pointer-events-auto ...">{/* Interactive elements */}</div>
</div>
```

---

## Implementation Steps

### Phase 1: Foundation

#### 1.1 Update Store with Modal State

**File: `store/useGalaxyStore.ts`**

```typescript
type ModalId = 'controls' | 'clusters' | 'faq' | null;

// Add to store:
activeModal: null as ModalId,
setActiveModal: (modal) => set({ activeModal: modal }),
```

#### 1.2 Create useModal Hook

**File: `hooks/useModal.ts`**

- Thin convenience wrapper around store
- Returns `{ isOpen, open, close }` for specified modal

#### 1.3 Create Accessible Modal Component

**File: `components/modals/Modal.tsx`**

Required accessibility features:

- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` pointing to title
- Focus trap (focus first focusable on open, return focus on close)
- Escape key to close
- Click outside to close (with `stopPropagation` on content)

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
}

// Implementation skeleton:
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-xl",
    lg: "max-w-3xl",
    full: "w-full h-full m-0 rounded-none",
  }[size];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onMouseDown={onClose}
      aria-hidden="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-[70] w-full ${sizeClass} mx-4 rounded-2xl
                    border border-gray-600/50 bg-gray-900/95 shadow-xl
                    animate-[modal-in_150ms_ease-out]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/60 px-4 py-3">
          <h2 id="modal-title" className="text-sm font-semibold text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-800
                       hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
```

#### 1.4 Create Global Modals Container

**File: `components/modals/Modals.tsx`**

- Single component rendering all modals
- Each modal uses `useModal` hook for open state

```tsx
export function Modals() {
  return (
    <>
      <ControlsModal />
      <ClustersModal />
      <FAQModal />
    </>
  );
}
```

#### 1.5 Create Chip Component

**File: `components/shared/Chip.tsx`**

Semantic HTML: `<a>` for links, `<button>` for actions:

```tsx
interface ChipProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  variant?: "default" | "primary" | "outline";
}

export function Chip({
  label,
  icon: Icon,
  href,
  onClick,
  active,
  variant = "default",
}: ChipProps) {
  const baseClass = `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
                     border bg-gray-900/80 border-gray-700/60 backdrop-blur
                     hover:bg-gray-800/90 transition-transform duration-100
                     hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500`;

  const activeClass = active
    ? "border-indigo-400/80 text-indigo-200"
    : "text-gray-200";
  const variantClass =
    variant === "primary" ? "bg-indigo-600/80 border-indigo-500" : "";

  const className = `${baseClass} ${activeClass} ${variantClass}`;

  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-pressed={active ?? undefined}
    >
      {content}
    </button>
  );
}
```

---

### Phase 2: Mobile Layout

#### 2.1 Create TopBar Component

**File: `components/layout/TopBar.tsx`**

Use `pointer-events-none` pattern:

```tsx
export function TopBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col gap-2 px-3 pt-3 pb-2">
      {/* Search container */}
      <div className="pointer-events-auto rounded-2xl border border-gray-700/60
                      bg-gray-900/95 backdrop-blur px-3 py-2">
        <SearchBar />
      </div>

      {/* Chips row */}
      <div className="pointer-events-auto flex gap-2 overflow-x-auto">
        <Chip label="Clusters" icon={Palette} onClick={() => ...} />
        <Chip label="Controls" icon={Settings} onClick={() => ...} />
        <Chip label="FAQ" icon={HelpCircle} onClick={() => ...} />
        <Chip label="GitHub" icon={Github} href="https://github.com/..." />
      </div>
    </div>
  );
}
```

#### 2.2 Create MobileLayout Component

**File: `components/layout/MobileLayout.tsx`**

Pure composition, no business logic:

```tsx
export function MobileLayout() {
  return (
    <>
      <TopBar />
      <PackageDetail />
    </>
  );
}
```

---

### Phase 3: Desktop Layout

#### 3.1 Create Sidebar Components

**File: `components/layout/Sidebar/Sidebar.tsx`**

- Main container with slide animation
- Always-visible close button

**File: `components/layout/Sidebar/SidebarHeader.tsx`**

- PyAtlas logo/title
- Subtitle description
- Close button

**File: `components/layout/Sidebar/SidebarSearch.tsx`**

- Wrapper around shared SearchBar

**File: `components/layout/Sidebar/SidebarMenu.tsx`**

- Three menu buttons (Controls, Clusters, FAQ)
- Each triggers `setActiveModal()`
- Full width, icon + label, hover states

#### 3.2 Create DesktopLayout Component

**File: `components/layout/DesktopLayout.tsx`**

```tsx
export function DesktopLayout() {
  const isSidebarOpen = useGalaxyStore((s) => s.isSidebarOpen);

  return (
    <>
      {isSidebarOpen ? <Sidebar /> : <SidebarToggleButton />}
      <PackageDetail />
    </>
  );
}
```

---

### Phase 4: Modal Content

#### 4.1 ControlsModal

**File: `components/modals/ControlsModal.tsx`**

- Title: "Controls"
- Content: Keyboard/mouse controls
  - Scroll to zoom
  - Right-click + drag to pan
  - Left-click package for details
  - Click cluster label to toggle
- Lucide icons (ZoomIn, Move, MousePointer2, Tag)

#### 4.2 ClustersModal

**File: `components/modals/ClustersModal.tsx`**

- Title: "Package Clusters"
- Content: ClusterList component

**File: `components/shared/ClusterList.tsx`**

- "Show All" / "Hide All" button (logic in store)
- Scrollable cluster list
- Each row: color indicator, name, toggle switch
- Optional: search/filter, package count badge
- Note: Consider virtualization if cluster count grows large

#### 4.3 FAQModal

**File: `components/modals/FAQModal.tsx`**

- Title: "FAQ"
- Placeholder content for now

---

### Phase 5: Integration & Cleanup

#### 5.1 Update App.tsx

```tsx
function App() {
  const isMobile = useIsMobile();

  return (
    <div className="h-screen w-screen">
      <GalaxyCanvas />
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
      <Modals /> {/* Global modal mount point */}
    </div>
  );
}
```

#### 5.2 useIsMobile Hook (SSR-safe pattern)

```typescript
function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
```

#### 5.3 Adjust PackageDetail Positioning

- Mobile: Bottom sheet style (slide-up panel with reserved margin for OS UI)
- Desktop: No change (bottom-left positioning)

#### 5.4 Remove Old Components

- Delete `components/Sidebar.tsx`
- Delete `components/ClusterLegend.tsx`
- Clean up unused imports

---

## Component Specifications

### Modal Component Props

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
}
```

### Chip Component Props

```typescript
interface ChipProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string; // renders <a> if provided
  active?: boolean;
  variant?: "default" | "primary" | "outline";
}
```

### TopBar Layout (Mobile)

```
┌─────────────────────────────────────────┐
│  [Search packages...                 ]  │
├─────────────────────────────────────────┤
│  [Clusters] [Controls] [FAQ] [GitHub]   │
└─────────────────────────────────────────┘
       ↑ pointer-events-none container
           with pointer-events-auto children
```

### Sidebar Layout (Desktop)

```
┌──────────────────────────────┐
│  PyAtlas              [X]    │
│  Interactive Python Packages │
├──────────────────────────────┤
│  [Search packages...]        │
├──────────────────────────────┤
│  [Controls                 ] │
│  [Clusters                 ] │
│  [FAQ                      ] │
├──────────────────────────────┤
│  [GitHub]  [Sponsor]         │
└──────────────────────────────┘
```

---

## Styling Guidelines

### Glass-morphism (Consistent with existing)

```css
background: rgba(17, 24, 39, 0.95); /* bg-gray-900/95 */
backdrop-filter: blur(12px);
border: 1px solid rgba(75, 85, 99, 0.5); /* border-gray-600/50 */
```

### Animation

- Modal: fade + scale (0.95 → 1.0), 150ms ease-out
- Sidebar: translateX(-100% → 0)
- Chips: subtle scale on hover (1.02)

### Z-Index Stack

```
Canvas:         0
PackageDetail: 40
TopBar/Sidebar: 50
Modal Backdrop: 60
Modal Content:  70
```

---

## File Changes Summary

### New Files

1. `components/layout/MobileLayout.tsx`
2. `components/layout/DesktopLayout.tsx`
3. `components/layout/TopBar.tsx`
4. `components/layout/Sidebar/Sidebar.tsx`
5. `components/layout/Sidebar/SidebarHeader.tsx`
6. `components/layout/Sidebar/SidebarSearch.tsx`
7. `components/layout/Sidebar/SidebarMenu.tsx`
8. `components/modals/Modal.tsx`
9. `components/modals/Modals.tsx`
10. `components/modals/ControlsModal.tsx`
11. `components/modals/ClustersModal.tsx`
12. `components/modals/FAQModal.tsx`
13. `components/shared/Chip.tsx`
14. `components/shared/ClusterList.tsx`
15. `hooks/useModal.ts`

### Modified Files

1. `store/useGalaxyStore.ts` - Add `activeModal` state
2. `App.tsx` - Replace layout structure, add global `<Modals />`
3. `components/SearchBar.tsx` - Refactor for reusability
4. `components/PackageDetail.tsx` - Adjust mobile positioning (bottom sheet style)
5. `hooks/useIsMobile.ts` - Update to SSR-safe pattern if needed

### Deprecated Files (to remove after migration)

1. `components/Sidebar.tsx`
2. `components/ClusterLegend.tsx`

---

## Testing Checklist

### Accessibility

- [ ] Modal has `role="dialog"` and `aria-modal="true"`
- [ ] Modal title linked via `aria-labelledby`
- [ ] Focus moves to modal on open
- [ ] Focus returns to trigger on close
- [ ] Escape key closes modal
- [ ] Chips use `aria-pressed` for toggle states
- [ ] Screen reader announces modal title

### Mobile

- [ ] TopBar renders with search and chips
- [ ] Each chip opens correct modal
- [ ] GitHub chip opens in new tab
- [ ] Modals are full-screen with proper close behavior
- [ ] Search works and closes on selection
- [ ] PackageDetail doesn't overlap TopBar
- [ ] Touch interactions work on canvas (not blocked by overlays)

### Desktop

- [ ] Sidebar opens/closes properly
- [ ] Sidebar close button always visible
- [ ] Menu buttons open correct modals
- [ ] Modals are centered, properly sized
- [ ] Search works within sidebar
- [ ] Toggle button appears when sidebar closed

### Both Platforms

- [ ] Cluster toggles work in modal
- [ ] Show All/Hide All works
- [ ] Camera animations still work after search selection
- [ ] Click outside closes modals
- [ ] Proper z-index stacking
- [ ] No duplicate modal rendering

---

## Notes

- Keep existing GalaxyCanvas, PackagePoints, Constellations, Labels unchanged
- Maintain current color palette and glass-morphism aesthetic
- Preserve all keyboard shortcuts and touch interactions
- Show All/Hide All logic lives in store (shared across mobile/desktop)
- Footer links (GitHub, Sponsor):
  - Mobile: GitHub as chip, Sponsor in FAQ or removed
  - Desktop: Keep in sidebar footer
- Consider virtualization for ClusterList if cluster count grows
- Consider Radix Dialog for full accessibility if needed later
