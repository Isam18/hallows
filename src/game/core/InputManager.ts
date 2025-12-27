// Input handling for the game
export type InputAction = 
  | 'left'
  | 'right'
  | 'jump'
  | 'dash'
  | 'attack'
  | 'interact'
  | 'pause'
  | 'down'
  | 'focus'; // For focus healing (hold J)

interface KeyBinding {
  action: InputAction;
  keys: string[];
}

const DEFAULT_BINDINGS: KeyBinding[] = [
  { action: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { action: 'right', keys: ['KeyD', 'ArrowRight'] },
  { action: 'jump', keys: ['Space', 'KeyW', 'ArrowUp'] },
  { action: 'dash', keys: ['ShiftLeft', 'ShiftRight'] },
  { action: 'attack', keys: ['KeyK', 'KeyX'] },
  { action: 'interact', keys: ['KeyE', 'KeyF'] },
  { action: 'pause', keys: ['Escape'] },
  { action: 'down', keys: ['KeyS', 'ArrowDown'] },
  { action: 'focus', keys: ['KeyJ'] },
];

class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private keysJustReleased: Set<string> = new Set();
  private bindings: KeyBinding[] = [...DEFAULT_BINDINGS];
  private enabled = true;
  
  constructor() {
    this.setupListeners();
  }
  
  private setupListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    
    const code = e.code;
    if (!this.keysDown.has(code)) {
      this.keysJustPressed.add(code);
    }
    this.keysDown.add(code);
    
    // Prevent default for game keys
    if (this.isGameKey(code)) {
      e.preventDefault();
    }
  };
  
  private handleKeyUp = (e: KeyboardEvent): void => {
    const code = e.code;
    this.keysDown.delete(code);
    this.keysJustReleased.add(code);
  };
  
  private handleBlur = (): void => {
    this.keysDown.clear();
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
  };
  
  private isGameKey(code: string): boolean {
    return this.bindings.some(b => b.keys.includes(code));
  }
  
  // Called each frame to clear just-pressed/released states
  update(): void {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
  }
  
  isDown(action: InputAction): boolean {
    const binding = this.bindings.find(b => b.action === action);
    return binding?.keys.some(key => this.keysDown.has(key)) ?? false;
  }
  
  justPressed(action: InputAction): boolean {
    const binding = this.bindings.find(b => b.action === action);
    return binding?.keys.some(key => this.keysJustPressed.has(key)) ?? false;
  }
  
  justReleased(action: InputAction): boolean {
    const binding = this.bindings.find(b => b.action === action);
    return binding?.keys.some(key => this.keysJustReleased.has(key)) ?? false;
  }
  
  getHorizontal(): number {
    let h = 0;
    if (this.isDown('left')) h -= 1;
    if (this.isDown('right')) h += 1;
    return h;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keysDown.clear();
      this.keysJustPressed.clear();
      this.keysJustReleased.clear();
    }
  }
  
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}

export const inputManager = new InputManager();
export default inputManager;
