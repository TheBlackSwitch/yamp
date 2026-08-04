// Apparently I can make custom importable libraries, time to abuse this :P
// Easily make a dialog popup

export class DialogButton {

    /**
    * @type {string}
    */
    name;

    /**
    * @type {number}
    */
    action;

    /**
    * @type {Function}
    */
    callback;

    static ActionExitFail = 0;       // Exit the dialog and return false
    static ActionCallbackTrue = 1;   // Run the callback with value true and exit if it returns true
    static ActionCallbackFalse = 2;  // Run the callback with value false and exit if it returns true
    static ActionExitSuccess = 3;    // Exit the dialog and return false

    constructor(name, action, callback = () => {}) {
        this.name = name;
        this.action = action;
        this.callback = callback;

        this.elem = document.createElement('a');
        this.elem.classList.add('dialog_button');
        this.elem.textContent = name;
    }


}

let dialogs = [];

export class Dialog {
    
    /**
    * @type {boolean}
    */
    visible = false;

    /**
    * @type {Array[DialogButton]}
    */
    buttons;

    /**
    * @type {Element}
    */
    main;

    /**
    * @type {Element}
    */
    body;

    // -------------------------------
    //  Create a new dialog                            
    // -------------------------------

    constructor(title, buttons, body = null) {
        this.main = document.createElement('div');
        this.main.classList.add('dialog_background');

        let wrapper = document.createElement('div');
        wrapper.classList.add('dialog_wrapper');
        this.main.appendChild(wrapper);

        this.text_container = document.createElement('div');
        this.text_container.classList.add('dialog_text');
        this.text_container.innerHTML = title;
        wrapper.appendChild(this.text_container);

        this.body = document.createElement('div')
        this.body.classList.add('dialog_body');
        this.body.innerHTML = body ? body: "";
        wrapper.appendChild(this.body);


        this.button_container = document.createElement('div');
        this.button_container.classList.add('dialog_button_container');
        wrapper.appendChild(this.button_container);

        this.buttons = buttons;
        for(const button of buttons) {
            this.button_container.appendChild(button.elem);
            button.elem.onclick = () => this.event__on_click(button);
        }

        dialogs.push(this);
    }

    async await() {
        this.visible = true;
        document.body.appendChild(this.main);

        return new Promise((resolve) => {
            for(const button of this.buttons) {
                button.elem.onclick = () => this.event__on_click(button, resolve);
            }
        });
    }

    // -------------------------------
    //  Static methods                            
    // -------------------------------

    static close_all() {
        for(const dialog of dialogs.slice()) {
            dialog.close(false);
        }
    }

    static open_next() {
        if(dialogs.length > 0) dialogs[0].open();
    }

    // -------------------------------
    //  Display handlers                            
    // -------------------------------

    close(open_next = true) {
        this.visible = false;
        this.main.remove();

        let idx = dialogs.indexOf(this);
        if(idx >= 0) {
            dialogs.splice(idx, 1);
        }
        if(open_next) Dialog.open_next();
    }

    open() {
        this.visible = true;
        document.body.appendChild(this.main);
    }

    // -------------------------------
    //  events                            
    // -------------------------------

    event__on_click(button, resolve = () => {}) {
        switch(button.action) {
            case DialogButton.ActionExitFail:
                this.close();
                resolve(false);
                break;

            case DialogButton.ActionCallbackFalse:
                try {
                    if(button.callback(false)) {
                        this.close();
                    }
                } catch (err) {
                    console.warn("[DIALOG]: Failed to handle dialog callback: " + err.message + "\n " + err.stack);
                }
                break;

            case DialogButton.ActionCallbackTrue:
                try {
                    if(button.callback(true)) {
                        this.close();
                    }
                } catch (err) {
                    console.warn("[DIALOG]: Failed to handle dialog callback: " + err.message + "\n " + err.stack);
                }
                break;

            case DialogButton.ActionExitSuccess:
                this.close();
                resolve(true);
                break;
        }
    }

    // -------------------------------
    //  Modify the dialog                            
    // -------------------------------

    set_title(new_title) {
        this.text_container.innerHTML = new_title;
    }
}

