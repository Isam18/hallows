# Workspace Rules for Hallows Game Development

## Table of Contents
1. [8-Step Development Workflow](#8-step-development-workflow)
2. [Coding Standards](#coding-standards)
3. [Git Workflow Rules](#git-workflow-rules)

---

## 8-Step Development Workflow

This is the mandatory workflow for all development tasks in this workspace. Every task must follow these steps in order.

### Step 1: Confirm Understanding of the Ask
Before making any changes, confirm that you understand what's being asked:
- Read the task requirements carefully
- Ask clarifying questions if anything is unclear
- Verify you have all necessary information
- Reference `design/DESIGN.md` for context about the game architecture

### Step 2: Share Design Changes Based on design.md and Get Confirmation
Before writing code:
- Review the relevant sections of `design/DESIGN.md`
- Identify which systems will be affected
- Propose the design changes you plan to make
- Wait for user confirmation before proceeding
- Do not skip this step - always get approval first

### Step 3: Only Make Code Changes Requested
- Implement exactly what was requested
- No additional features or "nice to haves"
- No refactoring unless explicitly requested
- No optimization unless part of the task
- Keep changes minimal and focused

### Step 4: If You Need to Make Any Other Code Changes, Let User Know and Wait for Approval
- If you discover issues that need fixing
- If you need to refactor to make the requested changes
- If you notice better ways to implement something
- Always ask for permission before making any changes beyond the original request
- Wait for explicit approval before proceeding

### Step 5: At the End, Confirm the Changes
- Summarize what was changed
- List all files that were modified
- Explain how the changes address the original request
- Verify the changes work as expected
- Get confirmation that the user is satisfied

### Step 6: Test the Code to See If There Are Any Compilation Issues
- Run `npm run build` or `npm run dev` to check for compilation errors
- Check TypeScript errors in the IDE
- Verify the game runs without crashes
- Test the specific functionality that was changed
- Report any issues found

### Step 7: Create a Commit Before the Changes
- Always create a pre-change commit before starting work
- Use descriptive commit message: "Pre-change commit: [description of what will change]"
- This provides a rollback point if changes don't work out
- User should always have an option to roll back if they don't like the changes

### Step 8: Update the design.md File
- After completing the task and confirming it works
- Update `design/DESIGN.md` with any new systems, patterns, or architecture changes
- Document new features added
- Update relevant sections (e.g., "Core Systems", "Development Guidelines")
- Keep the design document current with the codebase

---

## Coding Standards

### TypeScript Specific Standards

#### Type Safety
```typescript
// ALWAYS use explicit types
const enemy: Enemy = new Enemy(...);
const damage: number = calculateDamage();

// NEVER use 'any' unless absolutely necessary
const enemy: any = new Enemy(...); // ❌ Avoid this

// Use type guards for runtime checks
if (entity instanceof Enemy) {
  entity.takeDamage(5); // Type-safe
}
```

#### Interface Definitions
```typescript
// Define interfaces for all data structures
export interface PlayerData {
  hp: number;
  maxHp: number;
  shells: number;
  soul: number;
  equippedCharms: string[];
}

export interface LevelConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  platforms: PlatformConfig[];
  // ...
}
```

#### Enums for Constants
```typescript
// Use enums for related string constants
type MovementState = 'grounded' | 'airborne' | 'wallSlide' | 'dash' | 'hitstun';
type GameEventType = 'hpChange' | 'shellsChange' | 'playerDied';

// Never use magic strings
this.movementState = 'grounded'; // ✅ Good
this.movementState = 'ground'; // ❌ Type error
```

### File Naming Conventions

```
components/
  game/
    GameHUD.tsx        # PascalCase for components
    PauseMenu.tsx
  ui/
    button.tsx         # lowercase for shadcn/ui

game/
  entities/
    Player.ts          # PascalCase for classes
    Enemy.ts
    Boss.ts
  core/
    GameState.ts       # PascalCase for classes
    InputManager.ts
  scenes/
    GameScene.ts
    MenuScene.ts

data/
  levels/
    crossroads.json    # lowercase for data files
    greenway.json
  enemies.json
  charms.json
```

### Code Organization Standards

#### File Structure Template
```typescript
// 1. Imports (organized by type)
import Phaser from 'phaser';
import { GameState } from './GameState';
import type { PlayerData } from '../types';

// 2. Type definitions
type MovementState = 'grounded' | 'airborne';
interface LocalConfig {
  jumpForce: number;
  gravity: number;
}

// 3. Constants
const JUMP_FORCE = 380;
const GRAVITY = 1200;

// 4. Class/interface definitions
export class Player extends Phaser.Physics.Arcade.Sprite {
  // 5. Properties (public first, then private)
  public hp: number;
  private movementState: MovementState;
  private readonly config: LocalConfig;

  // 6. Constructor
  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'player');
    // initialization
  }

  // 7. Lifecycle methods
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
  }

  // 8. Public methods
  public update(): void {
    this.handleInput();
    this.applyPhysics();
  }

  public jump(): void {
    // implementation
  }

  // 9. Private methods (grouped by functionality)
  // Movement methods
  private handleInput(): void { }
  private applyPhysics(): void { }

  // Combat methods
  private attack(): void { }
  private takeDamage(): void { }
}
```

#### Method Organization
```typescript
// Group related methods together with clear section headers

// ===== MOVEMENT =====
private moveLeft(): void { }
private moveRight(): void { }
private jump(): void { }

// ===== COMBAT =====
private attack(): void { }
private takeDamage(): void { }
private checkHitCollisions(): void { }

// ===== STATE MANAGEMENT =====
private setMovementState(state: MovementState): void { }
private handleStateTransition(): void { }
```

### Commenting Standards

#### JSDoc for Public APIs
```typescript
/**
 * Deal damage to player with knockback
 * @param amount - Damage amount (positive integer)
 * @param fromX - X position of damage source for knockback direction
 * @throws Error if amount is negative
 * @example
 * player.takeDamage(2, 100);
 */
public takeDamage(amount: number, fromX: number): void {
  if (amount < 0) {
    throw new Error('Damage amount must be positive');
  }
  // implementation
}
```

#### Inline Comments for Complex Logic
```typescript
// Apply wall slide movement with reduced fall speed
// Wall slide reduces gravity to 30% of normal, allowing player to
// control descent while touching a wall
private applyWallSlideMovement(body: Body, horizontal: number): void {
  body.setVelocityY(body.velocity.y * 0.3);
  body.setVelocityX(horizontal * this.wallSlideSpeed);
}
```

#### State Machine Comments
```typescript
// Transition to wall slide if:
// 1. Player is falling (velocity.y > 0)
// 2. Player is touching a wall
// 3. Input is toward the wall OR wall stick timer is active
if (this.body.velocity.y > 0 && this.isTouchingWall) {
  if (this.inputTowardWall || this.wallStickTimer > 0) {
    this.movementState = 'wallSlide';
  }
}
```

### Error Handling Standards

#### Validate Input Parameters
```typescript
public heal(amount: number): void {
  // Validate input
  if (amount <= 0) {
    console.error('Heal amount must be positive:', amount);
    return;
  }
  if (amount > this.maxSoul) {
    console.warn('Heal amount exceeds max soul, capping:', amount);
    amount = this.maxSoul;
  }
  
  // Safe to proceed
  this.soul = Math.min(this.soul + amount, this.maxSoul);
  this.emit('soulChange', this.soul);
}
```

#### Handle Missing Data Gracefully
```typescript
private loadLevel(levelId: string): void {
  const level = LEVELS[levelId];
  
  if (!level) {
    console.error(`Level not found: ${levelId}`);
    this.scene.restart({ levelId: 'crossroads', spawnId: 'default' });
    return;
  }
  
  // Safe to use level
  this.createLevel(level);
}
```

#### Try-Catch for JSON Parsing
```typescript
private loadEnemyConfig(enemyType: string): EnemyCombatConfig | null {
  try {
    const data = enemiesData[enemyType];
    if (!data) {
      throw new Error(`Enemy type not found: ${enemyType}`);
    }
    return data as EnemyCombatConfig;
  } catch (error) {
    console.error('Failed to load enemy config:', error);
    return null;
  }
}
```

### Code Style Rules

#### Avoid Magic Numbers
```typescript
// ❌ Bad
this.body.setVelocityY(-380);
setTimeout(() => { }, 1500);

// ✅ Good
const JUMP_FORCE = 380;
const FOCUS_TIME = 1500;
this.body.setVelocityY(-JUMP_FORCE);
setTimeout(() => { }, FOCUS_TIME);
```

#### Extract Complex Logic into Methods
```typescript
// ❌ Bad - complex inline logic
if (this.body.velocity.y > 0 && 
    this.isTouchingWall && 
    (this.inputTowardWall || this.wallStickTimer > 0)) {
  this.body.setVelocityY(this.body.velocity.y * 0.3);
  this.body.setVelocityX(horizontal * this.wallSlideSpeed);
  this.movementState = 'wallSlide';
}

// ✅ Good - extracted methods
if (this.canWallSlide()) {
  this.applyWallSlideMovement(horizontal);
  this.movementState = 'wallSlide';
}

private canWallSlide(): boolean {
  return this.body.velocity.y > 0 && 
         this.isTouchingWall && 
         (this.inputTowardWall || this.wallStickTimer > 0);
}

private applyWallSlideMovement(horizontal: number): void {
  this.body.setVelocityY(this.body.velocity.y * 0.3);
  this.body.setVelocityX(horizontal * this.wallSlideSpeed);
}
```

#### Use Const for Values That Don't Change
```typescript
// ❌ Bad
let damage = this.calculateDamage();
let knockback = this.calculateKnockback();

// ✅ Good
const damage = this.calculateDamage();
const knockback = this.calculateKnockback();
```

---

## Git Workflow Rules

### Branch Naming Conventions

```
feature/add-new-enemy-type
feature/medulla-biome-rooms
fix/boss-gate-not-opening
fix/player-dash-invincibility
refactor/gamestate-patterns
docs/update-design-document
```

### Commit Message Format

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring without feature change
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**

```
feat(enemies): add Skull Scuttler enemy type

- Implemented fast patrol behavior
- Added burst movement on player detection
- Configured in enemies.json
- Added spawn logic in GameScene

Closes #123

```

```
fix(combat): correct dash invulnerability timing

- Changed dash duration from 150ms to 200ms
- Updated invulnerability window to match
- Fixes player getting hit during dash
```

```
docs(design): update game design principles section

- Added challenging but fair section
- Documented exploration reward system
- Updated risk vs reward philosophy
```

### Pre-Change Commits

Before making any significant changes:

```bash
# Stage current state
git add -A

# Commit with descriptive message
git commit -m "Pre-change commit: Before adding Medulla biome rooms"

# Verify commit
git log -1 --oneline
# Output: abc123 Pre-change commit: Before adding Medulla biome rooms
```

**Why Pre-Change Commits Matter:**
- Provides rollback point if changes don't work
- Allows easy comparison before/after
- Enables cherry-picking if needed
- Documents what state was before changes

### Rollback Procedures

If you need to rollback to a pre-change commit:

```bash
# View recent commits
git log --oneline -10

# Rollback to specific commit (soft reset - keeps changes)
git reset --soft <commit-hash>

# OR hard reset (discards all changes after commit)
git reset --hard <commit-hash>

# OR rollback to previous commit
git reset --hard HEAD~1

# OR rollback to specific commit hash
git reset --hard d69b31a177afdaaac313bf35f7262e845108b6a7
```

### Merge Guidelines

#### Feature Branch Merge
```bash
# Ensure main branch is up to date
git checkout main
git pull origin main

# Merge feature branch
git checkout feature/add-new-enemy
git merge main

# Resolve conflicts if any
# ...

# Merge back to main
git checkout main
git merge feature/add-new-enemy --no-ff

# Delete feature branch
git branch -d feature/add-new-enemy
```

#### Resolve Conflicts
```bash
# When conflicts occur:
1. Edit files with conflicts (marked with <<<<<<<)
2. Choose correct version or merge manually
3. Remove conflict markers
4. Mark as resolved: git add <file>
5. Complete merge: git commit
```

### Commit Frequency

- **Pre-change commits:** Always before starting work
- **Feature commits:** After completing logical units of work
- **Fix commits:** Immediately after fixing bugs
- **Refactor commits:** After completing refactoring
- **Documentation commits:** After updating docs

**Avoid:**
- Committing half-baked features
- Large commits with unrelated changes
- Commits that break the build
- Commits with personal/irrelevant messages

### Git Ignore Rules

The `.gitignore` should exclude:
```
# Dependencies
node_modules/
bower_components/

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
```

### Code Review Checklist

Before pushing or merging:

- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] All tests pass (if applicable)
- [ ] Follows coding standards
- [ ] Documentation is updated (DESIGN.md if needed)
- [ ] Commit messages follow format
- [ ] No debugging code left in
- [ ] No console.log statements (except intentional)
- [ ] Changes are minimal and focused
- [ ] No unrelated changes included

---

## Additional Guidelines

### When to Ask for Help

Ask the user for clarification or approval when:
- Task requirements are unclear
- You need to make changes beyond the original request
- You notice a better approach to implement something
- You need to refactor to make changes work
- You're unsure about design decisions

### Testing Requirements

After every change:
1. Run the game and verify it works
2. Test the specific feature that was changed
3. Check for compilation errors
4. Verify no regressions in existing functionality
5. Test edge cases if applicable

### Documentation Updates

Always update `design/DESIGN.md` when:
- Adding new game systems
- Changing architecture patterns
- Adding new enemy types
- Adding new biome or level features
- Changing core mechanics
- Adding configuration options

### Communication

- Be clear and direct in responses
- Explain what you're doing and why
- Ask questions when uncertain
- Provide examples when helpful
- Summarize changes after completion

---

## Document Version

**Version**: 1.0  
**Last Updated**: 2026-01-02  
**Purpose**: Establish clear development workflow and coding standards for the Hallows game project

---

**Note**: This document should be referenced for all development work. Following these standards ensures code quality, maintainability, and smooth collaboration.
