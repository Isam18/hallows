
## Auto-show Debug Overlay when Debug Mode is enabled

Currently the debug overlay (with teleport buttons) requires pressing F1 independently. The game already has a debug mode toggle on the main menu (click the button or press D). This plan connects them so the overlay automatically appears when debug mode is on.

### Changes

**1. `src/components/game/DebugOverlay.tsx`**
- Instead of starting with `visible = false` and only toggling via F1, read the `debugMode` value from the Phaser game registry on mount and whenever it changes.
- Poll `gameRef.registry.get('debugMode')` alongside the existing debug state polling to auto-show/hide the overlay.
- Keep F1 as an additional manual toggle, but default to visible when debug mode is active.

**2. `src/pages/Index.tsx`**
- Pass debug mode state to `DebugOverlay` so it knows when to auto-show. This can be done by polling the registry's `debugMode` value in the existing poll interval, or by listening to `gameState.on('debugModeChange')`.

### Technical Details

- In `DebugOverlay`, change the initial `visible` state: instead of always `false`, check `gameRef?.registry?.get('debugMode')`.
- In the existing polling `useEffect`, also check `gameRef.registry.get('debugMode')` and set `visible` accordingly (unless the user has manually toggled with F1).
- Alternatively, add a `debugMode` prop from `Index.tsx` that tracks the registry value, and use it as the default for visibility. F1 can still override.

The simplest approach: make the overlay poll `registry.get('debugMode')` and auto-set visible to match, while still allowing F1 to toggle it independently.
