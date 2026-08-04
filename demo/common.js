import { AnimationHandler } from "./lib/animation.js"; // Holy moly apparently this is possible :)
import { Requester } from "./lib/request.js";

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                                  GLOBALS                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

const request = new Requester();

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//get my age (used in my bio)

function getAge() {
    let ageDifMs = Date.now() - new Date(1220140800000);
    let ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

if(document.getElementById('age')) {
    document.getElementById('age').innerHTML = getAge();
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Calculate the current year (used in my copyright)

if(document.getElementById('curr_year')) {
    document.getElementById('curr_year').innerHTML = getYear();
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//show a scroll to top button when the page has been scrolled atleast 300px

let scrollButton = document.getElementById("scroll_to_top");
window.setInterval(function () {
    if (window.scrollY > 300) {
        scrollButton.classList.add("visible");
    } else {
        scrollButton.classList.remove("visible");
    }
}, 1);

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Smoothly scroll all the way to the top

function scrollToTop(id) {
    let element = document.getElementById(id);
    if (!element || !element.classList.contains("hide")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

for(const elem of document.querySelectorAll('.action-scroll_to_top')) {
    elem.addEventListener('click', () => scrollToTop(elem));
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//hide loader if page is fully loaded or loading is taking very long so the page can lazy load

const start_time = getMillis(); // Get the time at which the page starts loading

window.addEventListener('load', function () {
    window.scrollTo({ top: 0, behavior: "instant" });

    const curr_time = getMillis();
    let load_time = curr_time - start_time;
    let delay = 800 - load_time;

    setTimeout(function () {
        document.getElementById("loader").style.display = "none";
        document.getElementById("loader").classList.add('done');
    }, delay); // add a delay if the loading didn't take long enough for user accessability
})


window.setTimeout(function () {
    document.getElementById("loader").style.display = "none";
    document.getElementById("loader").classList.add('done');
}, 10000); // 10s

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Background logo parralax

let logo_top = document.getElementsByClassName('logo-top')[0];
let logo_bottom = document.getElementsByClassName('logo-bottom')[0];
new AnimationHandler(() => {
    let scroll = document.documentElement['scrollTop'];
    let max_scroll = document.documentElement['scrollHeight'];
    let clientHeight = document.documentElement.clientHeight;
    if(window.innerWidth < 680) {
        logo_top.style.transform = `translate(0,calc(${scroll * -0.40 + 50}px - 10%))`;
        logo_bottom.style.transform = `translate(0,calc(${(max_scroll - scroll - clientHeight) * 0.40 - 50}px + 50%))`;
    } else {
        logo_top.style.transform = `translate(0,${scroll * -0.40}px)`;
        logo_bottom.style.transform = `translate(0,calc(${(max_scroll - scroll - clientHeight) * 0.40}px + 50%))`;
    }
});


//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Update the page visit count

request.api_get_async("visits.php", () => {});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Menu toggle when clicking if touch screen

document.getElementById('sidebar_icon').addEventListener('click', () => sidebarIconOnClick());

function sidebarIconOnClick() {
    if(window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(pointer: none)').matches) {
        console.log("ih");
        let sidebar = document.getElementById("sidebar");
        if(sidebar.classList.contains("sidebar_expand")) {
            sidebar.classList.remove("sidebar_expand");
            collapseSidebar();
        } else {
            sidebar.classList.add("sidebar_expand");
            expandSidebar();
        }
    }
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// expand sidebar with animation to it's contents when hovering

const sidebar_container = document.getElementById('sidebar');
const sidebar = document.querySelector('.sidebar_container > .sidebar');
const sidebar_contents = document.querySelector('.sidebar_container > .sidebar > .sidebar_contents');

function expandSidebar() {
    if(window.innerWidth < 771) {
        let target_height = sidebar_contents.offsetHeight;
        sidebar.style.height = `${target_height}px`;
    } else {
        sidebar.style.height = null;
    }
}

function collapseSidebar() {
    if(window.innerWidth < 771) {
        sidebar.style.height = null;
    } else {
        sidebar.style.height = null;
    }
}

sidebar_container.addEventListener('mouseenter', () => {
    if(window.matchMedia('(pointer: fine)').matches) {
        expandSidebar();
    }
});

sidebar_container.addEventListener('mouseleave', () => {
    if(window.matchMedia('(pointer: fine)').matches) {
        collapseSidebar();
    }
});

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Collapse sidebar when scrolling on small screens

window.setInterval(() => {
    let sidebar = document.getElementById("sidebar");
    if (window.scrollY > 60) {
        sidebar.classList.add('sidebar_collapse');
    } else {
        sidebar.classList.remove('sidebar_collapse');
    }
}, 10);



//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Change background logo when screen is to small

let image_horizontal = false;

window.setInterval(() => {

    if (window.innerWidth < 680) {
        if(!image_horizontal) {
            logo_bottom.setAttribute('src', request.relative_path("assets/images/theblackswitch-simple-horizontal.jpg"));
            logo_top.setAttribute('src', request.relative_path("assets/images/theblackswitch-simple-horizontal.jpg"));
            image_horizontal = true;
        }
    } else {
        if(image_horizontal) {
            logo_bottom.setAttribute('src', request.relative_path("assets/images/theblackswitch-long.jpg"));
            logo_top.setAttribute('src', request.relative_path("assets/images/theblackswitch-long.jpg"));
            image_horizontal = false;
        }
    }

}, 10);


//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// show a custom warning dialog

let dialog_return = null;

function show_dialog(text, buttons, body = null) {
    close_all_dialogs();

    return new Promise((resolve) => {
        

        for(const button of buttons) {
            let text = button.text;       

            let btn_elem = document.createElement('a');
            btn_elem.classList.add('dialog_button');
            btn_elem.textContent = text;

            btn_elem.addEventListener('click', () => {
                if(button.action == "exit") {
                    close_all_dialogs();
                    resolve(false);

                } else if (button.action == "callback_true") {
                    if (button.callback) {
                        let ret = button.callback(true);
                        console.log('Result: ' + ret)
                        if(ret === true) {
                            close_all_dialogs();
                        }
                    } else {
                        close_all_dialogs();
                        console.warn('Invalid callback for dialog button...');
                    }

                } else if (button.action == "callback_false") {
                    if (button.callback) {
                        let ret = button.callback(false);
                        if(ret) {
                            close_all_dialogs();
                        }
                    } else {
                        close_all_dialogs();
                        console.warn('Invalid callback for dialog button...');
                    }
                } else if (button.action == "success") {
                    close_all_dialogs();
                    resolve(true);

                }
            });

            button_container.appendChild(btn_elem);
        }

    });
}

function close_all_dialogs() {
    let dialogs = document.querySelectorAll('.dialog_background');
    if(dialogs.length == 0) return;
    dialogs.forEach((bg_elem) => {
        bg_elem.parentElement.removeChild(bg_elem);
    });
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Special event hooks to keep track of some statistics

let april_fools_btn_elem = document.querySelector('.april_fools_26')
if(april_fools_btn_elem) {
    april_fools_btn_elem.addEventListener('click', () => {
        request.api_get_async("april_fools_downloads.php", () => {});
    });
}