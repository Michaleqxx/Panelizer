# Panelizer / Wood3D — Refactoring Plan

Goal: sleeker, more readable code split into smaller distinctive functions, with
**zero functionality loss and zero new bugs**. This is the overriding constraint.
Every step below is behavior-preserving unless explicitly flagged **[BEHAVIOR
CHANGE]**.

---

## 0. The one thing to do first: a safety net

There are currently **no tests** in the repo (no `vitest`, no test script). A
refactor of this size without characterization tests cannot honor the "no bugs"
rule — there is nothing to catch a regression. So **Phase 0 is mandatory and
comes before any code moves.**

- Add `vitest` (dev dep) + a `test` script. It piggybacks on the existing Vite
  config, so setup is one file.
- Write **characterization tests** (pin current behavior, even if quirky) around
  the pure `lib/` layer — this is where all the load-bearing logic lives and it
  is 100% pure functions, trivial to test:
  - `units.ts` — `parseMeasurement`, `evaluateMeasurement` (all the arithmetic /
    fraction / mixed-unit cases in its doc comment), `formatMeasurement` /
    `formatInches` round-trips, `roundToUnitGrid`.
  - `nesting.ts` — `generateCutlist`: grain orientations, multi-stock offcut-first
    ordering, quantity limits, the three unplaced reasons, kerf/margin, thickness
    tolerance.
  - `snapping.ts` — `snapGroupDelta` / `snapResizeFace` on hand-built fixtures.
  - `repair.ts` — `repairPrecision` convergence + anchor stability.
  - `parts.ts` — `buildParts` grouping/normalization, `partsToCsv`.
  - `resize.ts`, `geometry.ts`, `overlaps.ts`, `persistence.ts` (parse/migrate).
- Optional but cheap: a couple of component smoke tests with
  `@testing-library/react` for `MeasurementInput` and `GestureReadout`.

**Rule for the whole refactor:** each extraction is committed only when the full
suite stays green. `npm run build` (tsc -b) must also stay clean — the root
`tsc --noEmit` checks nothing (project references), so always use the build.

---

## 1. What NOT to touch (and why libraries would *lose* functionality)

The mapping surfaced several "replace with a library" ideas. Most are traps —
adopting them would *shed* behavior you deliberately built. Decisions:

| Candidate lib | For | Verdict |
|---|---|---|
| `maxrects-packer` / `potpack` | `nesting.ts` packer | **Do not.** None handle grain-constrained rotation, per-sheet-size inventory, offcut-first opening, quantity caps, or the `no-stock`/`too-big`/`no-space` reasons. You'd reimplement all of it around the lib anyway. Keep the packer; only *restructure* it (§4). |
| `mathjs` / `expr-eval` | `evaluateMeasurement` | **Do not.** Your evaluator is a *unit-and-fraction field calculator* (`23 3/4 + 1/2 in`, `+3`, left-to-right, no precedence). General expression engines don't speak fractions/units and change precedence semantics. Keep; only split into named helpers (§4). |
| `convert-units` / `js-quantities` | unit conversion | **Do not.** `MM_PER_UNIT` is 3 numbers. A lib is pure overhead. |
| `fraction.js` | inch parse/format | **Optional, low value.** Could back `parseNumeric` + `formatInches`, but you also do superscript-glyph rendering it won't cover, and behavior must match to the 1/64. Only if tests make it provably identical. Default: keep. |
| `graphlib` / `ngraph` | `repair.ts` BFS | **Do not.** The graph code is ~40 lines; the relaxation solver is the real logic and isn't library-shaped. |
| `box-intersect` / `gl-matrix` | AABB math | **Do not** for correctness/perf (panel counts are tiny). *Do* centralize the hand-rolled math into one module (§2) — that's the real win, not a dependency. |

**Libraries that are genuinely worth it** (UI plumbing, not domain logic) are in §5.

---

## 2. `lib/` — consolidate duplicated geometry & constants (low risk)

Pure functions, fully test-covered after Phase 0, so this is the safest layer to
start on.

1. **One tolerance constant.** `1.5` mm lives independently as `CONTACT_TOL`
   (repair.ts:10), `CONTACT_TOL` (snapping.ts:197) and `MIN_OVERLAP`
   (overlaps.ts:13). Confirm they're semantically the same (they are — "meant to
   touch") and export one `JOINT_TOL` from a shared module. *Keep separate names
   only if a test shows a value must diverge.*
2. **One AABB / bounds module.** `panelBounds` (snapping.ts) is already the
   canonical box builder, but `repair.ts` re-derives `pos`/`half`/`face`
   (58-63) and the contact-rectangle `lo`/`hi` intersection is written **four
   times** (snapping.ts:165-166 & 261-262, overlaps.ts:34-46, repair.ts). Extract
   `bounds.ts`: `panelBounds`, `contactRect(a,b)`, `perpOverlap(a,b,axis,tol)`.
   Then `overlapsPerpendicular` (snapping) and `perpOverlap` (repair) collapse to
   one function.
3. **Canonical box math.** Route `repair.ts`'s half-extent/face math through
   `panelBoxSize`/`panelBounds` instead of re-deriving.
4. **Small shared idioms** (nice-to-have, do last):
   - `id()` wrapper over `crypto.randomUUID()` (panel.ts, materials.ts, stock.ts).
   - `imperialOr(inchValue, metricValue, unit)` for the `isImperial ? toMm(...) :
     metric` pattern (panel.ts, stock.ts).
   - `defaultDesign()` shared by `persistence.parse` back-fill and
     `loadFromStorage` (the default object is written twice).

Each of these is a mechanical extract-function with a green test suite behind it.

---

## 3. `units.ts` — split the mini-parser (medium, keep behavior identical)

`evaluateMeasurement` (119-193) is ~75 lines doing four jobs. Split into named
pure helpers, **same output for every input** (tests guard this):

- `normalizeOperators(text)` — the regex operator-padding (130-133).
- `tokenize(text)` → `({op}|{term})[]` — the split + mixed-number regroup (137-153).
- `foldExpression(seq, currentMm, unit)` — the left-to-right fold (164-191).
- `evaluateMeasurement` becomes the thin orchestrator + the "no operators" fast
  path.

Same treatment for `formatInches` (extract `reduceFraction` from the halving loop
249-252) — this pairs naturally with the optional `fraction.js` evaluation but
stands alone without it.

---

## 4. `nesting.ts` — restructure the packer in place (medium)

Keep the algorithm; make it readable. `generateCutlist` (208-315) is one
107-line function doing 5 jobs. Extract (all pure, all test-covered):

- `groupByStock(panels)` — the material@thickness `byKey` map (219-225). Note
  the same group-by-Map idiom is in `parts.ts`; a shared `groupBy` util can serve
  both.
- `buildInventory(matching, margin)` — the smallest-first slot list (245-252).
- `classifyUnplaced(...)` / the `unfit` helper — reason assignment.
- `packGroup(panels, inventory, kerf, margin)` — the per-group bin loop
  (261-297), returning `{bins, unplaced}`.
- `generateCutlist` becomes: group → for each group `packGroup` → shape result.

Also split `placeInBin` (138-174) into `findBestFit(bin, panel, kerf)` (scoring)
and `commitPlacement(bin, fit, margin)` (mutation), so scoring is independently
testable.

---

## 5. `viewport/` — kill the duplication, extract the drag lifecycle (high value)

The three drag components (`PanelMesh`, `ResizeHandles`, plus the readout sink
`GestureReadout`) share a lot. Order matters — do the cheap dedup first, then the
hook.

1. **mm↔m conversion appears in 7 of 10 files.** Two options:
   - Safe/minimal: export one `toMetres`/`toMm` pair from `geometry.ts` and
     import everywhere (`PanelMesh:14`, `ResizeHandles:29-33`, `ToolOverlay:10`,
     `SnapHints:44/47`, `OverlapHighlights:21-28`, `MarqueePicker:34`).
   - Cleaner but **[verify carefully]**: wrap the scene in `<group scale={MM_TO_M}>`
     so children work in mm directly. This touches raycasting/gizmo math — only
     do it with the viewport verified in-browser (see §7). If unsure, take the
     helper option; it captures 90% of the readability win at ~0 risk.
2. **Snap-hint rectangle builder.** `PanelMesh:174-193` and `ResizeHandles:118-130`
   build the identical `{axis, kind, at, size, label}` from `{plane, lo, hi}`, and
   `SnapHints:40-46` renders it. Extract `snapHintFromTarget(axis, target, label?)`
   into `lib/snapping.ts` (it's pure). Removes a three-way implicit-shape coupling.
3. **`useGesture` hook.** The readout lifecycle — `gestureOpen` ref, frozen-start
   origin, `openGesture({apply,commit,cancel})`, `setGestureEditable` /
   `armSelectSuppression` / `clearGesture` on release, click-vs-drag threshold —
   is duplicated between `PanelMesh:85-231` and `ResizeHandles:157-232`. Extract a
   `useGesture()` hook owning that state machine; the two components pass in only
   their `apply`/`commit`/`cancel` bodies. This is the single biggest viewport
   readability win. **Highest-care item** — it's stateful and interaction-heavy,
   so land it last in this section and verify moves/resizes in-browser.
4. **Split `dragGroup` (PanelMesh:128-203)** into `computeDelta` (raw→snap→grid,
   pure) and the imperative apply/hint/stream tail.
5. **Palette tokens.** `#2a6cff`, `#ff8a2a`, `#ffb02e`, grid greys are hardcoded
   across PanelMesh/ResizeHandles/ToolOverlay/SnapHints/Viewport. Collect into a
   `viewport/theme.ts` constants file. Pure rename, zero risk.
6. **Minor:** `ViewportControls:39` finds the canvas via
   `parentElement?.querySelector('canvas')` — fragile. A ref passed from
   `Viewport` is sturdier.

---

## 6. `CutlistModal.tsx` (785 lines) — decompose (highest structural win)

This is the biggest single file and the clearest "split into smaller pieces"
target. It mixes state, persistence, print, keyboard, resize, and three unrelated
render regions. Extract **without changing behavior**:

**Hooks (pure logic out of the component):**
- `useCutlistModel()` — the derived data (`result`, `parts`, `grainGroups`,
  `unplacedReason`/`unplacedNote`, `missing`/`tooBig`/`noSpace`), currently
  66-99 & 160-188.
- `usePrintMode()` — the `beforeprint`/`afterprint` + `flushSync` effect (113-123).
- `useEscapeToClose(open, close)` — (133-140).
- `useResizablePanel()` / shared `useDragResize({min,max,onWidth})` — the resize
  drag (143-155), which is **near-identical to `ResizableSidebar:42-54`**. One
  hook serves both.
- `usePersistentNumber(key, min, max)` — the controls-width localStorage
  load/clamp/persist (29-39, 125-131), also duplicated with `ResizableSidebar`.

**Subcomponents (the three render regions + the SVG):**
- `<StockList>` / `<StockRow>` — settings + sheet-goods editor (204-277).
- `<GrainEditor>` — grouped grain table (279-346).
- `<CutResult>` (356-396), `<UnplacedNotices>` (398-443), `<PrintPartsList>`
  (444-470).
- `SheetSvg` (487-704, ~217 lines) is the biggest sub-piece: extract its
  label-fitting layout math into a pure `planPlacements()` helper (516-549, also
  unit-testable), and split the print vs screen render branches (598-684) into
  `<SheetSvgScreen>` / `<SheetSvgPrint>`.
- Move inline icons (`PencilIcon`, `CheckIcon`, 770-785) to the shared icon set (§7).

Target: `CutlistModal` itself drops to a ~60-line composition root.

---

## 7. Shared UI primitives + the *worthwhile* libraries (medium)

Now the genuinely-useful library adoption — all UI plumbing, none touching domain
logic, each behavior-preserving:

1. **`<Field>` / `<SelectField>` wrappers.** The
   `.field/.field__label/.field__control` markup is hand-written in
   `MeasurementInput:70-89`, `PropertiesPanel:73-111`, `CutlistModal:234-248`.
   Extract two tiny wrappers. No lib. High readability, zero risk.
2. **Consolidate the tooltip.** `CutlistModal` reimplements the cursor tooltip
   with local `tip` state (107, 474-478, ~5 `setTip` sites) instead of the
   existing `useTooltip` hook that `PartsPanel` uses. Move it onto `useTooltip`.
3. **Shared icon set.** Inline SVGs in CutlistModal, PartsPanel, ViewportControls
   + the `✕` remove buttons (MaterialsPanel, CutlistModal). One `icons.tsx`.
4. **`useDragResize` + `usePersistentNumber`** — already listed in §6; they also
   cover `ResizableSidebar`. **[Optional lib]** `react-resizable-panels` could
   replace *both* drag-resize surfaces if you'd rather not own the hook — but the
   hook is ~20 lines and dependency-free, so default to the hook.
5. **[Optional libs] Radix UI** (`@radix-ui/react-popover` / `dropdown-menu` /
   `tooltip` / `alert-dialog`):
   - `Menu.tsx` is a hand-rolled popover with no collision/flip and missing focus
     trap / ARIA. Radix Popover/DropdownMenu would add accessibility the toolbar
     buckets currently lack, and remove Toolbar's 3 inline `menu__list` blocks
     (90-248).
   - Radix `AlertDialog` could replace the native `confirm`/`alert`
     (Toolbar:67,81,240) — **[BEHAVIOR CHANGE]**: native modal dialogs become
     in-app async dialogs; nice UX, but it changes control flow, so treat as a
     separate opt-in task, not part of the mechanical refactor.
   - This is the only place adding a dependency clearly pays off (accessibility +
     less bespoke DOM). Still optional — if you want *zero* new deps, a declarative
     `<MenuList items={...}>` around the existing `Menu` removes most of the
     boilerplate without a library.

---

## Separate, opt-in items (not part of "preserve behavior")

Flagged distinctly because they *change* behavior — do them as their own commits,
not folded into the refactor:

- **CSV escaping bug** — `partsToCsv` (parts.ts:67-81) quotes fields but doesn't
  escape embedded `"` in material names. A real bug; fixing it changes output for
  names containing quotes. Fix under its own test, or hand to a CSV lib
  (`csv-stringify`).
- **`MeasurementInput` prop mismatch** — callers pass `unit`/`precision`/`snap`
  (CutlistModal:207-208, PropertiesPanel:115-117) but the component only declares
  `defaultUnit`/`min`. Reconcile the prop contract; verify snapping-on-blur still
  behaves before/after.
- **`persistence.ts` + `zod`** — schema validation/migration is hand-rolled and
  `version`/`VERSION` is currently unused. If versioned migrations grow, `zod`
  gives real validation. Not needed today; note for later.

---

## Suggested order & risk

| Phase | Scope | Risk | Depends on |
|---|---|---|---|
| 0 | Vitest + characterization tests | none | — |
| 1 | `lib/` bounds & constant dedup | low | 0 |
| 2 | `units.ts` split | low | 0 |
| 3 | `nesting.ts` restructure | low | 0 |
| 4 | viewport dedup (helpers, hint builder, palette) | low–med | 0 |
| 5 | `useGesture` hook | **med–high** | 4, in-browser verify |
| 6 | CutlistModal decomposition | med (volume) | 0 |
| 7 | shared UI primitives (`<Field>`, tooltip, icons, drag hook) | low | — |
| 8 | *optional* Radix / resizable-panels | med | 7 |

Do 1–3 and 6–7 first for the biggest readability gain at lowest risk. Save the
stateful `useGesture` hook (5) and any **[BEHAVIOR CHANGE]** library swaps (8) for
last, each verified in-browser (move / resize / snap / marquee / cutlist print).

**Non-negotiable per step:** full test suite green + `npm run build` clean +, for
anything in `viewport/` or CutlistModal, a manual pass in the dev server. Commit
one extraction at a time so any regression bisects to a single small change.
