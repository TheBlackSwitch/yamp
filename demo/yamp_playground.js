import * as Markdown from './lib/yamp.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/+esm';

const input_elem = document.getElementById('markdown_input');
const options_elem = document.getElementById('markdown_options');
const focus_mode_btn = document.getElementById('focus_mode');
const clear_btn = document.getElementById('clear_field');
const start_benchmark_btn = document.getElementById('start_benchmark');
const benchmark_results = document.getElementById('benchmark_results');
const markdown_output = document.getElementById('markdown_output');
const charmap_output = document.getElementById('charmap_output');

if(localStorage.getItem('yamp_playground_options')) options_elem.value = localStorage.getItem('yamp_playground_options');
if(localStorage.getItem('yamp_playground_text')) input_elem.value = localStorage.getItem('yamp_playground_text');

let char_map = [];

update_render()

input_elem.addEventListener('input', () => update_render());
options_elem.addEventListener('input', () => update_options());


input_elem.addEventListener('scroll', () => {
    let scroll_percentage = input_elem.scrollTop / (input_elem.scrollHeight - input_elem.clientHeight);
    console.log(scroll_percentage);
    markdown_output.scrollTo({"top": (markdown_output.scrollHeight - markdown_output.clientHeight) * scroll_percentage});
})

markdown_output.addEventListener('scroll', () => {
    let scroll_percentage = markdown_output.scrollTop / (markdown_output.scrollHeight - markdown_output.clientHeight);
    console.log(scroll_percentage);
    input_elem.scrollTo({"top": (input_elem.scrollHeight - input_elem.clientHeight) * scroll_percentage});
})


function update_options() {
    let options = {};
    try {
        options = JSON.parse(options_elem.value);
    } catch {
        markdown_output.innerHTML = `<span style="color:#FF8888;">Failed to parse options!</span>`
        return;
    }

    let real_options = {
        "disable_paragraph_elements": options.disable_paragraph_elements,
        "literal_mid_word_underscores": options.literal_mid_word_underscores,
        "add_zero_width_space_for_cursor_positions": options.add_zero_width_space_for_cursor_positions,
        "enable_trailing_line_breaks": options.enable_trailing_line_breaks,
        "finalize_spaces": options.finalize_spaces,
        "enabled_features": []
    };

    if(options && options.enabled_features && options.enabled_features.includes('Header')) real_options.enabled_features.push(Markdown.Header);
    if(options && options.enabled_features && options.enabled_features.includes('AlternateHeader')) real_options.enabled_features.push(Markdown.AlternateHeader);
    if(options && options.enabled_features && options.enabled_features.includes('BlockQuote')) real_options.enabled_features.push(Markdown.BlockQuote);
    if(options && options.enabled_features && options.enabled_features.includes('Emphasis')) real_options.enabled_features.push(Markdown.Emphasis);
    if(options && options.enabled_features && options.enabled_features.includes('UnderscoreEmphasis')) real_options.enabled_features.push(Markdown.UnderscoreEmphasis);
    if(options && options.enabled_features && options.enabled_features.includes('Strikethrough')) real_options.enabled_features.push(Markdown.Strikethrough);
    if(options && options.enabled_features && options.enabled_features.includes('List')) real_options.enabled_features.push(Markdown.List);
    if(options && options.enabled_features && options.enabled_features.includes('Code')) real_options.enabled_features.push(Markdown.Code);
    if(options && options.enabled_features && options.enabled_features.includes('CodeBlock')) real_options.enabled_features.push(Markdown.CodeBlock);
    if(options && options.enabled_features && options.enabled_features.includes('Link')) real_options.enabled_features.push(Markdown.Link);
    if(options && options.enabled_features && options.enabled_features.includes('Image')) real_options.enabled_features.push(Markdown.Image);
    if(options && options.enabled_features && options.enabled_features.includes('HorizontalRule')) real_options.enabled_features.push(Markdown.HorizontalRule);
    if(options && options.enabled_features && options.enabled_features.includes('Table')) real_options.enabled_features.push(Markdown.Table);
    if(options && options.enabled_features && options.enabled_features.includes('Color')) real_options.enabled_features.push(Markdown.Color);
    if(options && options.enabled_features && options.enabled_features.includes('Highlight')) real_options.enabled_features.push(Markdown.Highlight);
    if(options && options.enabled_features && options.enabled_features.includes('Underlined')) real_options.enabled_features.push(Markdown.Underlined);
    
    if(options && options.enabled_features && options.enabled_features.includes('EscapeIncompleteHtml')) real_options.enabled_features.push(Markdown.EscapeIncompleteHtml);

    Markdown.set_options(real_options);

    update_render();
}

function update_render() {
    localStorage.setItem('yamp_playground_options', options_elem.value);
    localStorage.setItem('yamp_playground_text', input_elem.value);

    let start = Math.floor(window.performance.now() * 1000);

    let result = Markdown.parse(input_elem.value);

    let end = Math.floor(window.performance.now() * 1000);

    markdown_output.innerHTML = result.html;
    charmap_output.innerHTML = `Width: ${result.char_map.width_map}<br>Absolute: ${result.char_map.absolute_map}`;
    char_map = result.char_map.absolute_map;
    console.log(result.html);

    benchmark_results.textContent = `Parsing took: ${end - start}µs`;
    Prism.highlightAllUnder(markdown_output);
}

let focus_mode = false;
focus_mode_btn.addEventListener('click', () => {
    if(!focus_mode) {
        document.body.classList.add('focus');
        focus_mode = true;
    } else {
        document.body.classList.remove('focus');
        focus_mode = false;
    }
})

clear_btn.addEventListener('click', () => {
    input_elem.value = "";
    update_render();
});


start_benchmark_btn.addEventListener('click', () => {
    start_benchmark_btn.textContent = "Running benchmark, please wait...";
    window.setTimeout(() => benchmark(), 100);
});

function benchmark() {
    
    let start = Math.floor(window.performance.now() * 1000);
    let count = 0;

    while(Math.floor(window.performance.now() * 1000) - start < 10000000) {
        Markdown.parse(input_elem.value).html;
        count += 1;
    }

    let end = Math.floor(window.performance.now() * 1000);

    start_benchmark_btn.textContent = "Benchmark Complete!";
    window.setTimeout(() => start_benchmark_btn.textContent = "Start 10s Benchmark", 5000);
    benchmark_results.textContent = `Benchmark results: parser ran ${count} times with an average of ${Math.round((end - start) / count * 100) / 100}µs`;
}

markdown_output.addEventListener('click', (e) => {
    let carr_pos = get_carret_position_from_point(markdown_output, e.clientX, e.clientY);
    
    if(carr_pos === null) return console.warn('Whoops failed to get carret position!');

    console.log(carr_pos.global);

    let index = char_map[carr_pos.global];

    input_elem.focus()
    input_elem.selectionStart = index;
    input_elem.selectionEnd = index;
    
})
function get_carret_position_from_point(root_element, x, y) {

    let carret_position;

    // get the carret position on a node
    if(document.caretPositionFromPoint) {
        carret_position = document.caretPositionFromPoint(x, y);
    } else if(document.caretRangeFromPoint) {
        carret_position = document.caretPositionFromPoint(x, y);
    } else {
        console.warn("You're using an older browser, selecting in the editor is not supported here!");
        return null;
    }


    const walker = document.createTreeWalker(root_element, NodeFilter.SHOW_ALL); // Create a walker to go through all text nodes

    let offset = 0;
    while(true) { // Go through all text nodes <p></p> <strong></strong> etc.
        let node = walker.nextNode();
        if(!node) return null;
        
        if(node.nodeType === Node.TEXT_NODE) {
            if(carret_position.offsetNode === node) {
                offset += carret_position.offset;
                break;
            }
            offset += node.textContent.length;
        }
        
    }

    return {
        "global": offset,
        "local": carret_position.offset
    };
}
