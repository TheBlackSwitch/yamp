// Apparently I can make custom importable libraries, time to abuse this :P
// Still incomplete

export class Keyboard {

    // -------------------------------
    //  No more magic strings                            
    // -------------------------------

    static KeyEnter = "Enter";
    static keyEscape = "Escape";
    static KeyTab = "Tab";
    static KeyLShift = "ShiftLeft";
    static KeyRShift = "ShiftRight";
    static KeyLCtrl = "ControlLeft";
    static KeyRCtrl = "ControlRight";
    static KeyAltL = "AltLeft";
    static KeyCapsLock = "CapsLock";

    static KeyUpArrow = "ArrowUp";
    static KeyDownArrow = "ArrowDown";
    static KeyLeftArrow = "ArrowLeft";
    static KeyRightArrow = "ArrowRight";

    static KeyA = "a";
    static KeyB = "b";
    static KeyC = "c";
    static KeyD = "d";
    static KeyE = "e";
    static KeyF = "f";
    static KeyG = "g";
    static KeyH = "h";
    static KeyI = "i";
    static KeyJ = "j";
    static KeyK = "k";
    static KeyL = "l";
    static KeyM = "m";
    static KeyN = "n";
    static KeyO = "o";
    static KeyP = "p";
    static KeyQ = "q";
    static KeyR = "r";
    static KeyS = "s";
    static KeyT = "t";
    static KeyU = "u";
    static KeyV = "v";
    static KeyW = "w";
    static KeyX = "x";
    static KeyY = "y";
    static KeyZ = "z";

    static KeyEventDown = 0; // Runs when a key is pressed down
    static KeyEventUp = 1; // Runs when a key is up
    static KeyEventChange = 2; // Runs when a key changes (so any event)

    // ======= Normal Variables =======

    /**
    * @type {Function}
    */
    #hooks = []
    static #curr_hook_id = 0;
    #cancel = false;

    #lshift = false;
    #rshift = false;
    #lctrl = false;
    #rctrl = false;

    SHIFT_STATE = false;
    CTRL_STATE = false;
    ALT_STATE = false;
    CAPSLOCK_STATE = false;

    constructor() {
        window.addEventListener('keydown', (event) => this.#event__on_key_down(event));
        window.addEventListener('keyup', (event) => this.#event__on_key_up(event));
    }

    #event__on_key_down(event) {
        
        this.#update_key_states();
        this.#cancel = false;
        for(const hook of this.#hooks) {
            if(
                (hook.mode == Keyboard.KeyEventDown || hook.mode == Keyboard.KeyEventChange) && 
                (hook.key == event.key.toLowerCase() || hook.key == event.code) && 
                (hook.alt == this.ALT_STATE || hook.alt == null) &&
                (hook.shift == this.SHIFT_STATE || hook.shift == null) &&
                (hook.ctrl == this.CTRL_STATE || hook.ctrl == null) &&
                (hook.capslock == this.CAPSLOCK_STATE || hook.capslock == null)
            ) {
                try {
                    
                    hook.callable({
                        mode: Keyboard.KeyEventDown,
                        key: hook.key,
                        cancel: () => { // A function to cancel any other key events
                            this.#cancel = true;
                        },
                        preventDefault: () => {
                            event.preventDefault();
                        }
                    });
                    if(this.#cancel) break;
                } catch (err) {
                    console.warn("[Keyboard]: Failed to execute key event handler: " + err.message + "\n " + err.stack);
                }
            }
        }

        switch(event.code) {
            case Keyboard.KeyLShift: this.#lshift = true; break;
            case Keyboard.KeyRShift: this.#rshift = true; break;
            case Keyboard.KeyLCtrl: this.#lctrl = true; break;
            case Keyboard.KeyRCtrl: this.#rctrl = true; break;
            case Keyboard.KeyCapsLock: this.CAPSLOCK_STATE = true; break;
            case Keyboard.KeyAltL: this.ALT_STATE = true; break;
        }
    }

    #event__on_key_up(event) {
        this.#update_key_states();
        this.#cancel = false;
        for(const hook of this.#hooks) {
            if(
                (hook.mode == Keyboard.KeyEventUp || hook.mode == Keyboard.KeyEventChange) && 
                (hook.key == event.code) &&
                (hook.alt == this.ALT_STATE || hook.alt == null) &&
                (hook.shift == this.SHIFT_STATE || hook.shift == null) &&
                (hook.ctrl == this.CTRL_STATE || hook.ctrl == null) &&
                (hook.capslock == this.CAPSLOCK_STATE || hook.capslock == null)
            ) {
                try {
                    hook.callable({
                        mode: Keyboard.KeyEventUp,
                        key: hook.key,
                        cancel: () => { // A function to cancel the current event call
                            this.#cancel = true;
                        }
                    });
                } catch (err) {
                    console.warn("[Keyboard]: Failed to execute key event handler: " + err.message + "\n " + err.stack);
                }
                if(this.#cancel) break;
            }
        }

        switch(event.code) {
            case Keyboard.KeyLShift: this.#lshift = false; break;
            case Keyboard.KeyRShift: this.#rshift = false; break;
            case Keyboard.KeyLCtrl: this.#lctrl = false; break;
            case Keyboard.KeyRCtrl: this.#rctrl = false; break;
            case Keyboard.KeyCapsLock: this.CAPSLOCK_STATE = false; break;
            case Keyboard.KeyAltL: this.ALT_STATE = false; break;
        }
    }

    #update_key_states() {
        this.CTRL_STATE = this.#lctrl || this.#rctrl;
        this.SHIFT_STATE = this.#lshift || this.#rshift;
    }

    addKeyEvent(key, mode, callable, alt = null, ctrl = null, shift = null, capslock = null) {
        this.#hooks.push({
            key: key,
            mode: mode,
            callable: callable,
            alt: alt,
            ctrl: ctrl,
            shift: shift,
            capslock: capslock,
            id: Keyboard.curr_hook_id
        })
        Keyboard.#curr_hook_id++;
        return Keyboard.#curr_hook_id - 1; // Return the index (or ID) of this event
    }

    removeKeyEvent(id) {
        for(const [idx, hook] of this.#hooks.entries()) {
            if(hook.id == id) {
                this.#hooks.splice(idx, 1);
                return true;
            }
        }            
        return false;
    }
}