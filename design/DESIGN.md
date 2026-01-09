# Hallows Design Document

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Systems](#core-systems)
4. [Design Patterns](#design-patterns)
5. [Coding Standards](#coding-standards)
6. [Configuration Management](#configuration-management)
7. [Development Guidelines](#development-guidelines)
8. [Known Issues & Technical Debt](#known-issues--technical-debt)
9. [Future Enhancements](#future-enhancements)

---

## Project Overview

**Hallows** is a 2D metroidvania-style platformer game inspired by Hollow Knight, built with a hybrid React + Phaser architecture.

### Technology Stack
- **Frontend Framework**: React 18 + TypeScript
- **Game Engine**: Phaser 3.90.0
- **Build Tool**: Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **State Management**: Custom event-driven system + TanStack React Query
- **Styling**: Tailwind CSS with custom animations

### Game Features
- Fluid platformer movement with advanced mechanics
- Combat system with melee attacks and focus healing
- Charm system for character customization
- Soul resource system
- Multiple biomes and procedural level generation
- Boss battles with phase-based combat
- Death/recovery mechanics with currency drops
- Checkpoint system via benches
- Debug tools and overlays

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────┐
│           React UI Layer               │
│  (HUD, Menus, Dialogs, Debug Overlays) │
└─────────────────┬───────────────────────┘
                  │ Events (registry)
┌─────────────────▼───────────────────────┐
│       Phaser Game Engine Layer          │
│  (Scenes, Entities, Physics, Input)    │
└─────────────────┬───────────────────────┘
                  │ State Management
┌─────────────────▼───────────────────────┐
│        Core Systems Layer              │
│  (GameState, Config, Audio, Input)     │
└─────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── components/              # React UI components
│   ├── game/               # Game-specific UI (HUD, menus, dialogs)
│   └── ui/                 # shadcn/ui components
├── game/
│   ├── core/               # Core game systems
│   │   ├── GameConfig.ts   # Global constants and types
│   │   ├── GameState.ts    # Central state manager
│   │   ├── InputManager.ts # Input handling
│   │   ├── AudioManager.ts # Audio system
│   │   ├── CombatConfig.ts # Combat tuning
│   │   ├── MovementConfig.ts # Movement tuning
│   │   ├── DeathConfig.ts  # Death/recovery mechanics
│   │   └── SaveManager.ts  # Save/load system
│   ├── entities/           # Game entities
│   │   ├── Player.ts       # Player controller
│   │   ├── Enemy.ts        # Base enemy class
│   │   ├── [EnemyTypes]/   # Specific enemy implementations
│   │   ├── Boss.ts         # Boss entity
│   │   └── [Interactables] # Benches, portals, hazards
│   ├── scenes/             # Phaser scenes
│   │   ├── BootScene.ts    # Asset loading
│   │   ├── MenuScene.ts    # Main menu
│   │   └── GameScene.ts    # Main game scene
│   ├── systems/            # Game systems
│   │   ├── RoomGenerator.ts # Procedural level generation
│   │   ├── [Particles]/    # Particle systems
│   │   └── [Backgrounds]/  # Parallax systems
│   └── data/               # JSON configuration files
│       ├── levels/          # Level layouts
│       ├── enemies.json     # Enemy configurations
│       ├── charms.json      # Charm definitions
│       ├── benches.json     # Bench types
│       └── death.json       # Death mechanics config
├── pages/                  # React pages
└── hooks/                  # Custom React hooks
```

### React-Phaser Communication

**Pattern**: Event-driven via Phaser Registry

```typescript
// Phaser → React: Emit to registry
this.registry.set('lastUIEvent', { 
  event: 'benchActivated', 
  data: {...}, 
  timestamp: Date.now() 
});

// React → Phaser: Poll registry (50ms interval)
const pollInterval = setInterval(() => {
  const lastEvent = gameRef.current?.registry.get('lastUIEvent');
  if (lastEvent && Date.now() - lastEvent.timestamp < 100) {
    // Handle event
  }
}, 50);
```

**Note**: Polling is a known performance issue (see Technical Debt). Consider replacing with direct event subscriptions or a state management library like Redux/Zustand.

---

## Core Systems

### 1. GameState Management

**File**: `src/game/core/GameState.ts`

**Pattern**: Singleton with Event Emitter

**Responsibilities**:
- Player data (HP, max HP, shells, soul)
- Charm system (owned, equipped, effects)
- Death drops and recovery
- Checkpoint/bench tracking
- Door state persistence
- Boss state
- Game state transitions (menu, playing, paused, death, etc.)

**Key Methods**:
```typescript
gameState.setHp(value)
gameState.damage(amount)
gameState.heal(amount)
gameState.addSoul(amount)
gameState.useSoulForHeal()
gameState.setLastBench(levelId, spawnId)
gameState.dropShells(levelId, x, y, roomId)
gameState.recoverShells()
gameState.equipCharm(charmId)
gameState.buyCharm(charmId)
gameState.setState(newState)
```

**Event Types**:
- `stateChange` - Game state transition
- `hpChange` - Player HP changed
- `shellsChange` - Currency changed
- `soulChange` - Soul resource changed
- `playerDied` - Player death
- `benchActivated` - Bench used
- `shellsDropped` - Currency dropped on death
- `shellsRecovered` - Death marker collected
- `charmEquipped` / `charmUnequipped` - Charm changes
- `bossDefeated` - Boss defeated

**Design Principle**: All state changes should go through GameState methods, never direct mutation.

---

### 2. Player Movement System

**File**: `src/game/entities/Player.ts`

**Pattern**: Finite State Machine (FSM)

**States**:
- `grounded` - On ground, can run/jump/dash
- `airborne` - In air, can move/fall/dash/wall-attach
- `wallSlide` - Sliding down wall, can wall-jump
- `dash` - Dashing, overrides other movement
- `hitstun` - Knocked back (currently stubbed)

**Advanced Mechanics**:

#### Coyote Time
```typescript
// Allow jump for 150ms after leaving ground
private coyoteTimer = 0;
private onLeftGround(): void {
  this.coyoteTimer = MOVEMENT_TUNING.coyoteTimeMs; // 150ms
}
```

#### Jump Buffer
```typescript
// Queue jump input for 100ms before landing
private jumpBufferTimer = 0;
if (inputManager.justPressed('jump')) {
  this.jumpBufferTimer = MOVEMENT_TUNING.jumpBufferMs; // 100ms
}
```

#### Variable Jump Height
```typescript
// Cut jump velocity early if jump released
if (!this.jumpHeld && body.velocity.y < 0) {
  body.velocity.y *= MOVEMENT_TUNING.jumpCutMultiplier; // 0.5
}
```

#### Wall Sliding
```typescript
// Slide down walls when falling and touching wall
// Requires input toward wall (configurable)
private canWallSlide(): boolean {
  if (!this.isTouchingWall) return false;
  if (body.velocity.y <= 0) return false; // Only when falling
  return this.inputTowardWall || this.wallStickTimer > 0;
}
```

#### Dashing
```typescript
// Air dash limit: 1 dash per air time
// Dash buffer: Queue dash input for 150ms
// Dash cooldown: 600ms (modifiable by charms)
// Dash invulnerability: Configurable
```

**Movement Tuning**: See `src/game/core/MovementConfig.ts`

---

### 3. Combat System

**Files**: 
- `src/game/core/CombatConfig.ts`
- `src/game/entities/Player.ts` (attack handling)
- `src/game/entities/Boss.ts`

**Attack Flow**:
```
Input → Start Attack → Active Frames → Recovery Frames → Cooldown
```

**Hitbox System**:
- Hitbox follows player position
- Only active during active frames (80ms)
- One hit per swing tracked by swingId
- Hitstop (time freeze) on successful hit

**Attack Timing** (from CombatConfig):
- `attackActiveMs`: 80ms - Hitbox active duration
- `attackRecoveryMs`: 170ms - Recovery animation
- `attackCooldownMs`: 250ms - Time before next attack
- `hitstopMs`: 50ms - Time freeze on hit

**Damage Handling**:
```typescript
// Player damage
player.takeDamage(amount, fromX)
  → Knockback calculation
  → Invulnerability frames (1500ms)
  → GameState.damage(amount)
  → Check death → Handle death

// Enemy damage
enemy.takeDamage(damage, fromX, swingId)
  → Check invulnerability
  → Apply damage
  → Knockback
  → Update health
  → Check death → Spawn pickup
```

**Focus Healing**:
- Hold focus button for 1500ms to heal
- Costs 33 soul
- Heals 1 HP
- Can be interrupted by damage or movement
- Requires: grounded, not attacking, not dashing
- Particle effects and visual feedback

---

### 4. Charm System

**File**: `src/game/core/GameState.ts` (charm methods)
**Data**: `src/game/data/charms.json`

**Charm Structure**:
```typescript
interface CharmData {
  id: string;
  name: string;
  description: string;
  effect: {
    type: string;  // 'maxHpMod', 'damageMod', 'dashCooldownMod'
    value: number;
  };
  slots: number;   // 1-3 slots used
  price?: number;  // Shop cost (0 = free)
}
```

**Charm Slots**: Max 5 slots (configurable in charms.json)

**Effect Types**:
- `maxHpMod` - Modify max HP
- `damageMod` - Add to attack damage
- `dashCooldownMod` - Modify dash cooldown multiplier

**Usage**:
```typescript
// Purchase from shop
gameState.buyCharm(charmId)

// Equip (must own or price = 0)
gameState.equipCharm(charmId)

// Get modifiers
const damageMod = gameState.getCharmModifier('damageMod')
```

**Design Principle**: Charms should be data-driven. New charms added by modifying `charms.json` only.

---

### 5. Level System

**Files**:
- `src/game/data/levels/` - JSON level files
- `src/game/systems/RoomGenerator.ts` - Procedural generation
- `src/game/scenes/GameScene.ts` - Level loading

**Level Structure**:
```typescript
interface LevelConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  spawnPoint: { x: number; y: number };
  platforms: PlatformConfig[];
  enemies: EnemySpawnConfig[];
  pickups: PickupConfig[];
  triggers: TriggerConfig[];
  spawns: Record<string, { x: number; y: number }>;
  spikes?: SpikeConfig[];
  breakables?: BreakableConfig[];
  acidPools?: AcidPoolConfig[];
  biome?: string;  // 'crossroads', 'greenway'
  bossArena?: BossArenaConfig;
}
```

**Trigger Types**:
- `bench` - Checkpoint with configurable behavior
- `transition` - Level transition portal
- `bossGate` - Enter boss arena
- `chain` - Giant chain (climbing minigame)
- `shop` - Charm shop NPC
- `endDoor` - End game door
- `greenwayDoor` - Door to Greenway biome

**Procedural Generation**:
- `generateForgottenCrossroads()` - Procedural room layout
- `generateGreenway()` - Procedural Greenway generation
- Uses `RoomGenerator.ts` for platform/enemy placement

**Biomes**:
- Crossroads: Dark, moody, dust particles
- Greenway: Green, lush, leaf particles, acid hazards

---

### 6. Enemy System

**Base**: `src/game/entities/Enemy.ts`
**Data**: `src/game/data/enemies.json`

**Enemy Types**:
- **Basic Crawlers**: `basicHusk`, `husk`, `infectedHusk`
- **Elite Enemies**: `huskGuard`, `mossWarrior` (dual-state)
- **Flying Enemies**: `vengefly`, `aspid`, `squit`
- **Special**: `mosskin`, `mossCreep`, `mossTitan` (mini-boss)

**Enemy Configuration**:
```typescript
interface EnemyCombatConfig {
  hp: number;
  contactDamage: number;
  attackDamage?: number;
  attackRange?: number;
  attackCooldown?: number;
  moveSpeed?: number;
  patrolRange?: number;
  isFlying?: boolean;
  isElite?: boolean;
  isPassive?: boolean;
}
```

**Enemy AI States**:
- `idle` - Waiting
- `patrol` - Moving back and forth
- `chase` - Pursuing player
- `attack` - Performing attack
- `stagger` - Hit by player

**Damage System**:
```typescript
enemy.takeDamage(damage, fromX, swingId)
  → Check invulnerability
  → Check swingId (prevent multi-hit)
  → Apply damage
  → Check death
```

---

### 7. Death & Recovery System

**File**: `src/game/core/DeathConfig.ts`

**Death Flow**:
```
Player HP = 0
  → gameState.handleDeath()
  → Drop shells at death location
  → Create death marker
  → Show death screen
  → Respawn at last bench
```

**Death Drop Configuration**:
```typescript
{
  dropPercentage: 0.75,  // Drop 75% of shells
  minDrop: 10,          // Minimum 10 shells
  onSecondDeathWhileUnreclaimed: 'replace', // Options: 'replace', 'stack', 'discardNew'
  dropCurrencyOnDeath: true,
  respawnInvulnMs: 3000, // 3s invulnerability after respawn
}
```

**Recovery**:
- Death marker persists until collected
- Collecting recovers full dropped amount
- Second death replaces old drop (configurable)
- Respawn invulnerability with blink effect

---

### 8. Input Management

**File**: `src/game/core/InputManager.ts`

**Pattern**: Centralized input handling with buffering

**Input Types**:
- `justPressed` - Single frame press (with buffer)
- `isDown` - Button currently held
- `justReleased` - Single frame release

**Key Bindings**:
- Arrow keys / WASD - Movement
- Z / Space - Jump
- X / K - Attack
- C / L - Dash
- A / H - Focus (heal)
- I - Interact
- Esc / P - Pause
- F1 - Movement debug overlay
- F2 - Combat debug overlay

**Input Buffers**:
- Jump buffer: 100ms
- Dash buffer: 150ms
- Used to improve responsiveness

---

### 9. Camera System

**File**: `src/game/scenes/GameScene.ts` (camera setup)

**Features**:
- Follow player with lerp (0.12 x, 0.10 y)
- Look-ahead based on player facing (40px)
- Deadzone for stability (20x30)
- World bounds clamping
- Fade transitions between levels

**Look-ahead**:
```typescript
private updateCameraLookAhead(): void {
  const targetOffset = this.player.getFacing() * 40;
  this.cameraLookAheadX += (targetOffset - this.cameraLookAheadX) * 0.08;
  this.cameras.main.setFollowOffset(-this.cameraLookAheadX, 0);
}
```

---

## Design Patterns

### 1. Singleton Pattern
**Used**: GameState, InputManager

```typescript
export const gameState = new GameStateManager();
export default gameState;
```

**Why**: Single source of truth, global access

---

### 2. Observer Pattern
**Used**: GameState event system

```typescript
gameState.on('hpChange', (newHp) => {
  // Update UI
});
gameState.emit('hpChange', newHp);
```

**Why**: Decouple state changes from UI updates

---

### 3. State Machine
**Used**: Player movement, Enemy AI

```typescript
type MovementState = 'grounded' | 'airborne' | 'wallSlide' | 'dash' | 'hitstun';
private movementState: MovementState = 'grounded';
```

**Why**: Clear state transitions, easier debugging

---

### 4. Component-Based Design
**Used**: Phaser entities (Sprite + Physics + Custom Logic)

```typescript
export class Player extends Phaser.Physics.Arcade.Sprite {
  // Extends Phaser sprite with custom logic
}
```

**Why**: Leverage Phaser's component system

---

### 5. Factory Pattern
**Used**: Enemy spawning

```typescript
if (e.type === 'mosskin') {
  new Mosskin(this, e.x, e.y, config);
} else if (e.type === 'basicHusk') {
  new BasicHusk(this, e.x, e.y, config);
}
```

**Why**: Create appropriate enemy type based on config

---

### 6. Data-Driven Design
**Used**: Levels, enemies, charms, benches

```typescript
import enemiesData from '../data/enemies.json';
const config = enemiesData[type];
```

**Why**: Easy to tune values without code changes

---

## Coding Standards

### TypeScript Guidelines

1. **Use strict types** - Avoid `any`
```typescript
// Bad
const enemy: any = ...

// Good
const enemy: Enemy = ...
const enemy = entity as Enemy;
```

2. **Prefer interfaces for public APIs**
```typescript
export interface PlayerData {
  hp: number;
  maxHp: number;
  // ...
}
```

3. **Use type aliases for unions**
```typescript
type MovementState = 'grounded' | 'airborne' | 'wallSlide';
```

4. **Mark private methods**
```typescript
private handleAttack(delta: number): void { }
```

---

### Naming Conventions

**Files**: PascalCase for components/classes
- `Player.ts`
- `GameScene.ts`

**Classes**: PascalCase
- `class Player extends Phaser.Physics.Arcade.Sprite`

**Methods**: camelCase
- `takeDamage()`
- `update()`

**Constants**: UPPER_SNAKE_CASE
- `MAX_SOUL = 100`
- `GAME_CONFIG`

**Private Properties**: camelCase with underscore prefix (optional)
- `private movementState: MovementState;`

---

### Code Organization

1. **Order of sections in files**:
```typescript
// 1. Imports
import Phaser from 'phaser';
import { GameState } from './GameState';

// 2. Type definitions
type MovementState = 'grounded' | 'airborne';

// 3. Class/interface definitions
export class Player extends Sprite {
  // 4. Properties
  private hp: number;

  // 5. Constructor
  constructor(...) { }

  // 6. Public methods
  public update(): void { }

  // 7. Private methods
  private handleDamage(): void { }
}
```

2. **Group related methods together**
```typescript
// Movement methods
private moveLeft(): void { }
private moveRight(): void { }
private jump(): void { }

// Combat methods
private attack(): void { }
private takeDamage(): void { }
```

---

### Commenting Guidelines

1. **Document complex algorithms**
```typescript
/**
 * Apply wall slide movement with reduced fall speed
 * Allows slight horizontal movement away from wall
 */
private applyWallSlideMovement(body: Body, horizontal: number): void {
  // ...
}
```

2. **Document state machine transitions**
```typescript
// Transition to wall slide if touching wall and falling
if (this.canWallSlide()) {
  this.movementState = 'wallSlide';
}
```

3. **Use JSDoc for public APIs**
```typescript
/**
 * Deal damage to player with knockback
 * @param amount - Damage amount
 * @param fromX - X position of damage source (for knockback direction)
 */
public takeDamage(amount: number, fromX: number): void {
  // ...
}
```

---

### Error Handling

1. **Validate JSON data**
```typescript
const level = LEVELS[levelId];
if (!level) {
  console.error(`Level not found: ${levelId}`);
  return;
}
```

2. **Check null/undefined before use**
```typescript
if (this.player && this.player.x > 0) {
  // Safe to use
}
```

3. **Use try-catch for parsing**
```typescript
try {
  const data = JSON.parse(jsonString);
} catch (error) {
  console.error('Failed to parse JSON:', error);
}
```

---

## Configuration Management

### Configuration Files

**Location**: `src/game/core/`

| File | Purpose |
|------|---------|
| `GameConfig.ts` | Global constants, types, colors |
| `MovementConfig.ts` | Movement tuning (gravity, speeds, timers) |
| `CombatConfig.ts` | Combat tuning (damage, timing, hitboxes) |
| `DeathConfig.ts` | Death/recovery mechanics |
| `SaveManager.ts` | Save/load functionality |

### Data Files

**Location**: `src/game/data/`

| File | Purpose |
|------|---------|
| `levels/` | Level layouts |
| `enemies.json` | Enemy configurations |
| `charms.json` | Charm definitions |
| `benches.json` | Bench types |
| `death.json` | Death mechanics |
| `boss.json` | Boss configuration |

### Adding New Configuration

1. **Create JSON file** in `src/game/data/`
```json
{
  "id": "newEnemy",
  "name": "New Enemy",
  "hp": 50,
  "contactDamage": 2,
  "moveSpeed": 100
}
```

2. **Import in code**
```typescript
import newEnemyData from '../data/newEnemy.json';
```

3. **Add type definition** (if new structure)
```typescript
interface NewEnemyConfig {
  id: string;
  name: string;
  hp: number;
  // ...
}
```

4. **Use in game**
```typescript
const config = newEnemyData as NewEnemyConfig;
const enemy = new NewEnemy(this, x, y, config);
```

---

## Development Guidelines

### Adding New Features

1. **Design First**
   - Define the feature's scope
   - Identify which systems need changes
   - Plan the architecture

2. **Update Design Document**
   - Document new systems here
   - Add configuration examples
   - Update diagrams if needed

3. **Implement**
   - Follow existing patterns
   - Use TypeScript types
   - Add error handling

4. **Test**
   - Test in different scenarios
   - Check edge cases
   - Verify performance

5. **Document**
   - Add comments to code
   - Update this document
   - Add examples if needed

---

### Adding New Enemies

1. **Create enemy class** extending `Enemy`
```typescript
export class NewEnemy extends Enemy {
  constructor(scene: GameScene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    // Custom initialization
  }
  
  update(time: number, delta: number, player: Player): void {
    // Custom AI
  }
}
```

2. **Add configuration** to `enemies.json`
```json
{
  "newEnemy": {
    "hp": 50,
    "contactDamage": 2,
    "moveSpeed": 100
  }
}
```

3. **Add spawn logic** in `GameScene.ts`
```typescript
if (e.type === 'newEnemy') {
  const enemy = new NewEnemy(this, e.x, e.y, config);
  this.enemies.add(enemy);
}
```

4. **Update imports** in `GameScene.ts`
```typescript
import { NewEnemy } from '../entities/NewEnemy';
```

---

### Adding New Levels

1. **Create JSON file** in `src/game/data/levels/`
2. **Define level configuration** (see LevelConfig interface)
3. **Add to LEVELS object** in `GameScene.ts`
```typescript
import newLevelData from '../data/levels/newLevel.json';

const LEVELS: Record<string, LevelConfig> = {
  // ...
  newLevel: newLevelData as LevelConfig,
};
```

4. **Test level loading**
```typescript
this.scene.restart({ levelId: 'newLevel', spawnId: 'default' });
```

---

### Adding New Charms

1. **Add to charms.json**
```json
{
  "charms": [
    {
      "id": "newCharm",
      "name": "New Charm",
      "description": "Does something cool",
      "effect": {
        "type": "newEffect",
        "value": 10
      },
      "slots": 1,
      "price": 150
    }
  ],
  "shopCharms": ["newCharm"]
}
```

2. **Add effect handler** in `GameState.ts`
```typescript
private applyCharmEffects(): void {
  for (const charmId of this.playerData.equippedCharms) {
    const charm = charmsData.charms.find(c => c.id === charmId);
    if (charm?.effect.type === 'newEffect') {
      // Apply effect
    }
  }
}
```

3. **Add to shop** if purchasable
```json
"shopCharms": ["newCharm"]
```

---

### Debugging

**Debug Overlays**:
- Press F1 - Movement debug overlay
- Press F2 - Combat debug overlay

**Debug Mode** (via console or level data):
```typescript
gameState.setDebugMode(true);
```

**Debug Keys** (when in debug mode):
- 1-5 - Teleport to levels
- B - Enter boss arena
- H - Full heal
- G - Add 100 shells
- I - Toggle instakill mode

**Physics Debug**:
```typescript
this.physics.world.drawDebug = true;
```

---

## Known Issues & Technical Debt

### High Priority

1. **Polling for UI Events** (src/pages/Index.tsx)
   - **Issue**: Polling registry every 50ms is inefficient
   - **Impact**: Performance waste, unnecessary CPU usage
   - **Solution**: Replace with direct Phaser events or state management library
   - **Estimated effort**: 4-6 hours

2. **Large Files Need Refactoring**
   - **GameScene.ts** (~900 lines) - Should be split into multiple modules
   - **Player.ts** (~600 lines) - Should extract controllers
   - **Impact**: Harder to maintain, harder to test
   - **Solution**: Extract into focused modules
   - **Estimated effort**: 8-12 hours

3. **Memory Leak Risk** (src/pages/Index.tsx)
   - **Issue**: useEffect has empty dependency array, won't re-run if container changes
   - **Impact**: Potential memory leaks if component unmounts/remounts
   - **Solution**: Add proper dependency tracking
   - **Estimated effort**: 1-2 hours

### Medium Priority

4. **Magic Numbers**
   - **Issue**: Hardcoded values scattered throughout code
   - **Example**: `const FOCUS_TIME = 1500;` in Player.ts should be in config
   - **Impact**: Harder to tune gameplay
   - **Solution**: Move all to config files
   - **Estimated effort**: 4-6 hours

5. **Missing Error Handling**
   - **Issue**: No try-catch for JSON parsing, no validation
   - **Impact**: Crashes on invalid data
   - **Solution**: Add validation and error boundaries
   - **Estimated effort**: 3-4 hours

6. **Code Duplication**
   - **Issue**: Similar door creation logic repeated
   - **Impact**: Maintenance overhead
   - **Solution**: Create factory function
   - **Estimated effort**: 2-3 hours

### Low Priority

7. **Comments**
   - **Issue**: Some complex logic lacks documentation
   - **Impact**: Harder to understand for new developers
   - **Solution**: Add inline comments
   - **Estimated effort**: 2-3 hours

8. **Type Safety**
   - **Issue**: Some `any` types, loose typing
   - **Impact**: Reduced type safety
   - **Solution**: Add proper types
   - **Estimated effort**: 4-5 hours

---

## Future Enhancements

### Gameplay Features

1. **Save/Load System**
   - Persist game state to localStorage
   - Multiple save slots
   - Continue from last session

2. **More Charm Types**
   - Dash charm variants
   - Healing charms
   - Movement modifiers
   - Special abilities

3. **Additional Levels**
   - More biomes (ice, fire, crystal)
   - More procedural generation algorithms
   - Side areas and secrets

4. **Enemy Variants**
   - More enemy types
   - Elite variants with different attacks
   - Mini-bosses

5. **Combat Improvements**
   - Combo system
   - Special attacks
   - Charge attacks
   - Ranged attacks

### Technical Improvements

1. **Replace Polling with Events**
   - Direct Phaser events to React
   - Or use Redux/Zustand for state
   - Remove 50ms polling interval

2. **Split Large Files**
   - Extract GameScene modules
   - Extract Player controllers
   - Improve testability

3. **Add Unit Tests**
   - Test GameState
   - Test movement logic
   - Test combat calculations
   - Test charm effects

4. **Performance Optimization**
   - Object pooling for particles
   - Reduce garbage collection
   - Optimize collision checks

5. **Improve Asset Management**
   - Asset loading optimization
   - Preloading strategies
   - Asset versioning

### UX Improvements

1. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support
   - Colorblind modes

2. **Localization**
   - Extract strings to i18n
   - Support multiple languages
   - Font support for different scripts

3. **Settings System**
   - Audio volume controls
   - Graphics quality options
   - Key rebinding
   - Difficulty settings

4. **Tutorial System**
   - Guided tutorials
   - Contextual tips
   - Practice areas

---

## Appendix

### Key Constants Summary

**Game Dimensions**:
- Width: 800px
- Height: 600px

**Physics**:
- Gravity: 1200
- Max fall speed: 600

**Player Stats**:
- Width: 24px, Height: 40px
- Base HP: 5
- Move Speed: 180
- Jump Force: 380
- Dash Speed: 350
- Dash Duration: 150ms
- Dash Cooldown: 600ms

**Combat**:
- Attack Damage: 1 (base)
- Attack Active: 80ms
- Attack Recovery: 170ms
- Attack Cooldown: 250ms
- Hitstop: 50ms
- Invulnerability: 1500ms

**Soul System**:
- Max Soul: 100
- Soul per Hit: 15
- Heal Cost: 33
- Heal Time: 1500ms

**Death System**:
- Drop Percentage: 75%
- Min Drop: 10
- Respawn Invuln: 3000ms

---

### State Machine Diagrams

#### Player Movement
```
grounded ──(fall)──→ airborne
airborne ──(land)──→ grounded
airborne ──(wall+fall)──→ wallSlide
wallSlide ──(jump)──→ airborne
wallSlide ──(release wall)──→ airborne
any ──(dash)──→ dash
dash ──(end)──→ airborne/grounded
```

#### Game State
```
menu ──(start game)──→ playing
playing ──(pause)──→ paused
paused ──(resume)──→ playing
playing ──(death)──→ death
death ──(respawn)──→ playing
playing ──(bench)──→ bench
bench ──(close)──→ playing
playing ──(enter boss)──→ boss
boss ──(victory)──→ victory
victory ──(continue)──→ playing
```

---

## Game Design Principles

### Core Gameplay Philosophy

**Challenging but Fair**
- All challenges should be learnable and predictable
- No cheap deaths or unavoidable damage
- Clear telegraphing for enemy attacks and hazards
- Player has tools to overcome any obstacle

**Exploration Reward**
- Players are rewarded for venturing off the beaten path
- Hidden areas contain valuable items (charms, currency, health upgrades)
- Environmental storytelling through level design
- Non-linear progression allows for discovery

**Risk vs Reward**
- Focus healing requires standing still for 1.5 seconds
- Death drops currency that must be recovered
- Challenging areas contain greater rewards
- Charm system allows players to customize their playstyle and risk tolerance

**Player Agency**
- Multiple ways to approach challenges
- Movement options (jump, dash, wall-jump) provide freedom
- Charm system builds allow different strategies
- No forced tutorials - learning through play

### Difficulty Curve

**Gradual Progression**
- Start with basic movement and combat
- Introduce new mechanics one at a time
- Difficulty spikes at biome transitions (boss fights)
- Optional challenges for advanced players

**Layered Complexity**
- Basic mechanics (move, jump, attack) introduced early
- Advanced mechanics (dash, wall-jump, focus) unlocked later
- Enemy complexity increases gradually
- Environmental hazards add layering

**Adaptive Difficulty**
- Charm system allows players to adjust difficulty
- Early areas accessible with basic skills
- Later areas require mastery of mechanics
- Boss fights serve as skill checkpoints

### Combat Philosophy

**Intentional Design**
- Every enemy has a purpose and pattern
- No random damage or unfair attacks
- Player has tools to counter every threat
- Spacing and timing are rewarded

**Flow State Combat**
- Fast-paced but never overwhelming
- Hitstop provides satisfaction on successful hits
- Invulnerability frames prevent damage spam
- Dash provides mobility and brief invulnerability

**Strategic Depth**
- Resource management (soul for healing)
- Charm builds for different playstyles
- Enemy patterns to learn and exploit
- Boss phase progression teaches adaptation

### Narrative Approach

**Environmental Storytelling**
- World tells its story through design
- No forced exposition or dialogue dumps
- Visual cues convey lore and history
- Player pieces together story through exploration

**Atmosphere over Plot**
- Mood and tone are primary
- Subtle narrative elements
- Mystery and ambiguity
- Player interpretation encouraged

---

## User Experience Flow

### Onboarding Experience

**Minimal Tutorial**
- No explicit tutorial required
- Basic controls intuitive (arrow keys, space)
- Advanced mechanics discovered through play
- Visual cues teach through observation

**Progressive Discovery**
- New areas unlock as player gains abilities
- Environmental gates indicate required skills
- Optional shortcuts for experienced players
- Metroidvania backtracking rewarded

**First Experience**
- Start in safe area with basic enemies
- Gradual introduction to mechanics
- Early boss serves as skill check
- Positive reinforcement for exploration

### Core Gameplay Loop

```
Exploration → Combat → Resource Management → Progression → Repeat
```

**Exploration Phase**
- Navigate through interconnected levels
- Discover new areas and secrets
- Find benches (checkpoints)
- Encounter enemies and hazards

**Combat Phase**
- Fight enemies using learned patterns
- Manage soul resource for healing
- Dodge and counter enemy attacks
- Learn enemy behaviors

**Resource Management**
- Collect shells (currency)
- Manage soul for healing
- Recover death markers
- Purchase upgrades and charms

**Progression**
- Unlock new abilities
- Access previously blocked areas
- Defeat bosses
- Customize build with charms

### Death & Recovery Loop

**Death Experience**
- Sudden but not frustrating
- Clear death marker shows where you died
- Drop percentage (75%) feels fair
- Respawn at last bench with brief invulnerability

**Recovery Gameplay**
- Return to death location (may need to refight enemies)
- Collect death marker to recover shells
- Risk/reward: may encounter more danger on return
- Satisfaction of reclaiming lost progress

**Psychological Flow**
- Death feels like a learning opportunity
- Recovery provides motivation to improve
- Short respawn loop maintains engagement
- Multiple deaths create tension without frustration

### Biome Transition Experience

**Visual Transition**
- Fade effect between biomes
- Distinct color palettes
- Particle effects change (dust → leaves)
- Audio atmosphere shifts

**Gameplay Transition**
- New enemy types introduced
- Different environmental hazards
- Unique mechanics per biome
- Progressive difficulty

**Crossroads → Greenway**
- Transition from dark/moody to green/lush
- Acid pools introduced as new hazard
- Flying enemies increase in frequency
- More verticality in level design

**Greenway → Medulla**
- Darker, more oppressive atmosphere
- Bone-themed environment
- New enemy behaviors (Skull enemies)
- More complex platforming challenges

### Boss Battle Flow

**Preparation Phase**
- Approach boss arena through door or gate
- Visual indicator of upcoming challenge
- Player can retreat if unprepared
- Opportunity to heal or change charms

**Battle Phase**
- Multiple phases with distinct patterns
- Telegraphed attacks for readability
- Phase transitions marked by visual cues
- Player learns patterns through repetition

**Victory Phase**
- Satisfying defeat animation
- Reward (new ability or item)
- Narrative progression
- Sense of accomplishment

**Retry Flow**
- Quick respawn at boss arena entrance
- No need to replay entire level
- Maintain progress and currency
- Encourages persistence

### Progression Systems

**Ability Progression**
- New movement options (dash, wall-jump)
- Combat upgrades
- Access to new areas
- Metroidvania gating

**Charm System**
- Strategic choices in build crafting
- 5 charm slots create customization depth
- Different charms for different challenges
- Experimentation encouraged

**Economy System**
- Shells earned from combat and exploration
- Charms purchased in shop
- Risk/reward with death drops
- Resource management adds tactical layer

### Menu & UI Flow

**Main Menu**
- Clean, uncluttered design
- Start, Settings, Quit options
- Atmospheric background
- Immediate game start

**Pause Menu**
- Instant access (Esc/P)
- Resume, Settings, Quit to menu
- No loading interruptions
- Maintain immersion

**HUD Design**
- Minimal and unobtrusive
- HP, Soul, Shells always visible
- Charm slots show equipped items
- Combat feedback integrated into gameplay

**Shop Interface**
- Clear charm descriptions
- Visual charm preview
- Price clearly displayed
- Transaction confirmation

---

## Visual Design System

### Color Palettes by Biome

**Crossroads (Dark/Moody)**
- Primary: #2d2d2d (dark gray)
- Secondary: #3d3d3d (medium gray)
- Accent: #8b7355 (muted brown)
- Highlight: #c9b896 (soft beige)
- Background: #1a1a1a (very dark gray)
- Purpose: Creates atmosphere of decay and ancient ruins

**Greenway (Vibrant/Lush)**
- Primary: #228b22 (forest green)
- Secondary: #32cd32 (lime green)
- Accent: #90ee90 (light green)
- Highlight: #98fb98 (pale green)
- Background: #0a2f0a (dark green)
- Purpose: Evokes overgrowth and nature reclaiming ruins

**Medulla (Bone/Spooky)**
- Primary: #d4c5a9 (bone white)
- Secondary: #c4b59d (darker bone)
- Accent: #8b0000 (dark red)
- Highlight: #ff6b6b (blood red)
- Background: #2a1a1a (dark red-brown)
- Purpose: Creates unsettling, skeletal atmosphere

**UI Elements**
- Health: #ffffff (white with red glow)
- Soul: #3b82f6 (blue energy)
- Shells: #fbbf24 (golden yellow)
- Charms: #a78bfa (purple accent)
- Purpose: Clear contrast from game world

### Lighting & Atmosphere

**Crossroads Lighting**
- Dim, ambient lighting
- Occasional flickering torches
- Dark corners create mystery
- Soft shadows add depth
- Purpose: Eerie, abandoned feeling

**Greenway Lighting**
- Filtered sunlight through canopy
- Bright, dappled lighting
- Glowing particles (pollen/spores)
- Warm, welcoming atmosphere
- Purpose: Life, growth, hope

**Medulla Lighting**
- Harsh, stark lighting
- Long, dramatic shadows
- Faint red glow from magma
- Cold, clinical feel
- Purpose: Unsettling, dangerous

**Lighting Transitions**
- Smooth fade between biomes
- Gradual color shift in background
- Particle effects change density
- Audio atmosphere shifts subtly

### Visual Feedback Systems

**Combat Feedback**
- Hitstop: 50ms freeze on successful hits
- Screen shake on heavy impacts
- Flash effect on player damage
- Particle burst on enemy death
- Damage numbers (optional, for clarity)

**Movement Feedback**
- Dust particles on landing
- Motion blur during dash
- Trail effect during fast movement
- Wall slide particles
- Jump anticipation (squash/stretch)

**Interaction Feedback**
- Glow on interactable objects
- Particle effect on collection
- Visual cue on bench activation
- Door opening animation
- Platform feedback when stepped on

**State Indicators**
- Invulnerability: flashing sprite
- Focus healing: aura/glow effect
- Charm equipped: subtle visual change
- Death marker: distinct color/shape

### UI Design Principles

**Minimalism**
- Only essential information displayed
- Clean, uncluttered interface
- No overwhelming elements
- Focused on gameplay

**Readability**
- High contrast text
- Clear iconography
- Consistent typography
- Scalable for different resolutions

**Consistency**
- Same color usage throughout
- Uniform button styles
- Predictable menu layouts
- Cohesive visual language

**Feedback**
- Button hover states
- Click confirmation
- Visual state changes
- Audio cues for UI actions

### Particle Effects System

**Crossroads Particles**
- Dust motes floating in air
- Ash falling from ceiling
- Occasional ember sparks
- Subtle, unsettling movement

**Greenway Particles**
- Leaves falling gently
- Pollen/spores drifting
- Glow-in-the-dark particles
- Vibrant, organic movement

**Medulla Particles**
- Bone fragments
- Red ash/magma dust
- Spectral wisps
- Eerie, unnatural movement

**Effect Usage**
- Combat impact bursts
- Death explosions
- Healing auras
- Dash trails
- Jump clouds

### Animation Principles

**Player Animation**
- Snappy, responsive (6-8 frames per action)
- Anticipation for jumps (wind-up)
- Follow-through for attacks
- Smooth state transitions
- Hitbox synced to animation frames

**Enemy Animation**
- Clear telegraphing for attacks
- Distinct idle patterns
- Death animations (varied)
- Stagger animations on hit
- Boss phase transition animations

**Environmental Animation**
- Subtle breathing of platforms
- Water/lava flowing
- Particle drift
- Door opening/closing
- Parallax background movement

### Icon & Symbol Design

**Health Icons**
- Hollow circles for empty
- Filled circles for HP
- Glow effect on damage
- Scale animation on heal

**Soul Icon**
- Orb shape
- Blue glow effect
- Pulsing when full
- Drain animation on use

**Charm Icons**
- Distinct shapes for each charm
- Color-coded by effect type
- Glow when equipped
- Size indicates slot cost

**Door/Gate Icons**
- Visual indication of type
- Lock icon for locked doors
- Boss gate with skull motif
- Special gates with unique symbols

### Typography

**Font Style**
- Clean, readable sans-serif
- Consistent weight (medium/semibold)
- Good contrast with backgrounds
- Scalable for UI elements

**Text Hierarchy**
- Headers: Large, bold, prominent
- Body text: Medium size, readable
- Subtitles: Smaller, secondary info
- Tooltips: Compact, detailed

**Color Usage**
- White text on dark backgrounds
- Black text on light backgrounds
- Accent colors for important info
- Consistent color coding (red = danger, blue = info)

---

## Recent Changes & Updates

### Medulla Biome Addition (2026)

**New Biome Characteristics**
- Bone-themed environment with skeletal structures
- Darker, more oppressive atmosphere
- 7 unique rooms with distinct challenges
- Red magma/lava hazards as environmental danger
- Skull-themed enemy family

**New Enemy Types**

**Skull Scuttler**
- Fast-moving ground enemy
- Patrol behavior with rapid movement
- Burst movement when player detected
- Low HP but high contact damage

**Skull Ravager**
- Larger, more aggressive skull enemy
- Chase behavior when player spotted
- Higher HP and damage
- Found in later Medulla rooms

**Adapted Skuller**
- Elite variant with special attacks
- Dual-state behavior (idle/aggro)
- More complex AI patterns
- Boss-like mechanics in regular enemy

**Room Design**

**Room 1: Rib Gate**
- Introduction to Medulla aesthetic
- Basic platforming with rib platforms
- First encounter with Skull Scuttlers
- Teaching room for new enemy type

**Room 2: Skittering Shaft**
- Vertical room with multiple platforms
- Heavy use of Skull Scuttlers
- Requires precise platforming
- Introduction of magma hazards

**Room 3: Marrow Tap**
- Central hub room
- Multiple paths and branches
- Mix of enemy types
- Checkpoint/respawn location

**Room 4: Vertebrae Stepping Stones**
- Precision platforming challenge
- Floating vertebrae platforms
- Magma hazards below
- Timing-based gameplay

**Room 5: Thermal Vent**
- Vertical shaft with rising heat
- Magma projectiles from vents
- Environmental hazard focus
- Dodging and positioning focus

**Room 6: Shattered Femur**
- Large arena room
- Multiple enemy waves
- Combat challenge room
- Introduces Skull Ravagers

**Room 7: Ossuary Gate**
- Final Medulla room
- Lead-up to boss arena
- Combination of all mechanics
- Preparation for boss fight

**Technical Implementation**

**Level Structure**
- Room-based level system (vs. continuous levels)
- Each room is separate JSON file
- Transition triggers between rooms
- Shared biome state (enemies defeated, doors opened)

**Room Loading System**
- Dynamic room loading based on position
- Efficient memory management
- Seamless transitions between rooms
- Room-specific background effects

**Medulla Parallax System**
- Custom parallax background for bone aesthetic
- Multiple depth layers
- Atmospheric fog/mist effects
- Red glow from magma sources

**Boss Arena Integration**
- Boss gate opens after defeating all enemies in final room
- Seamless transition to boss fight
- Boss state persisted across rooms
- Victory sequence returns to game

**Gameplay Changes**

**Difficulty Adjustment**
- Medulla is more challenging than previous biomes
- Enemy patterns are more complex
- Platforming requires more precision
- Environmental hazards are more frequent

**Progression Flow**
- Accessible after completing Greenway
- Requires mastery of basic mechanics
- Prepares player for boss fights
- Rewards with new abilities/charms

**Audio Updates**
- New sound effects for skull enemies
- Ambient audio for Medulla atmosphere
- Magma bubbling and vent sounds
- Footstep sounds on bone surfaces

**Visual Polish**
- Bone texture details on platforms
- Magma particle effects
- Lighting changes based on room
- Red glow effects on hazards

---

## Document Version

**Version**: 1.0  
**Last Updated**: 2025-12-28  
**Author**: Code Analysis Team

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-28 | Initial design document created from code analysis |

---

**Note**: This document should be updated whenever significant changes are made to the codebase. It serves as the reference point for understanding the game's architecture and making informed development decisions.
