// Apparently I can make custom importable libraries, time to abuse this :P
// Easily hook into the frame update of the web browser

export class AnimationHandler {
    /**
    * @type {boolean}
    */
    is_playing = false;
    
    /**
    * @type {Function}
    */
    #callback;

    /**
    * @type {number}
    */
    #last_time = null;

    constructor(callable, auto_start = true) {
        this.#callback = callable;
        if(auto_start) this.start();
    }

    #frame_update(curr_time) {
        // Calculate the time in ms between this and the last frame
        if (!this.#last_time) this.#last_time = curr_time;
        const delta_frame = curr_time - this.#last_time;
        this.#last_time = curr_time;

        this.run(delta_frame);
        if(this.is_playing) {
            window.requestAnimationFrame((curr_time) => this.#frame_update(curr_time));
        }
    }

    run(delta_frame) {
        this.#callback(delta_frame);
    }

    stop() {
        this.is_playing = false;
    }

    start() {
        if(!this.is_playing) {
            this.is_playing = true;
            window.requestAnimationFrame((curr_time) => this.#frame_update(curr_time));
        }
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------

export class CountingAnimation extends AnimationHandler {
    /**
    * @type {number}
    */
    #curr_frame = 0;

    /**
    * @type {Element}
    */
    #elem;

    /**
    * @type {number}
    */
    #target_count;

    /**
    * @type {number}
    */  
    #animation_time;

    constructor(elem, target_count, animation_time, auto_start = true) {
        super(() => {}, auto_start);
        this.#elem = elem;
        this.#target_count = target_count;
        this.#animation_time = animation_time;
    }

    run(delta_frame) {
        
        if(document.getElementById("loader").style.display == "none") { // Don't run when the loader is visible
            if(this.#curr_frame <= this.#animation_time) {
                this.#curr_frame+=delta_frame;

                if(this.#target_count >= 1000000) {
                    this.#elem.innerHTML = this.#interpolateCounting(Math.round(this.#target_count / 1000000), this.#curr_frame, this.#animation_time) + "M"
                } else if(this.#target_count >= 2000) {
                    this.#elem.innerHTML = this.#interpolateCounting(Math.round(this.#target_count / 1000), this.#curr_frame, this.#animation_time) + "K"
                } else {
                    this.#elem.innerHTML = this.#interpolateCounting(this.#target_count, this.#curr_frame, this.#animation_time);
                }
            } else {
                this.stop();   
            }
        }

    }

    // Info about the calculations used: https://www.geogebra.org/calculator/hbhekqem
    #interpolateCounting(target, curr_frame, animation_time) {
        return Math.round(Math.sqrt(target) * 3 * Math.pow((curr_frame / animation_time) - 1, 3) + target - 1);
    }
}