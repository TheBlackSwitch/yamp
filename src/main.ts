// -------------------------------
//  Yap I had to write my own
//  markdown parser for questbook
// -------------------------------

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                             LICENSE                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================
/*

Yet Another Markdown Parser (YAMP) © 2026 by theblackswitch is licensed under GNU LESSER GENERAL PUBLIC LICENSE v3.0

Additional condition to the license: The content of this work, as a whole or in parts, may not be used for training, fine-tuning,
or enhancement of artificial intelligence systems, machine learning models or any other type of program where computers use data and 
algorithms to learn patterns and make predictions without being explicitly programmed. This includes, not only and all, for commercial,
non-commercial, educational, research, or personal projects.

This software is provided as is, without any warranty.

*/
// ------------------------------------------------------------------------------------------------------------------------------------------

// call tree:
// Parse multiline -> parse single line / parse multiline -> parse inline

// Possible Optimizations
// - Images (fix the mess)
// - Links (fix the mess)
// - Underscore emphasis, emphasis => First build a list of all underscores and then do the lookahead on that list
// - the #wrap_idx method in the char map class. This currently runs FOR EVERY CHAR that get's discarded

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                           IMPORTS + TYPES                                                                     
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

import { Header, Emphasis, BlockQuote, AlternateHeader, UnderscoreEmphasis, List, Code, Link, Image, HorizontalRule, Paragraph } from "./syntax/standard"
import { Strikethrough, CodeBlock, Table } from "./syntax/extended"
import { EscapeIncompleteHtml } from "./syntax/finalize"
import { MultilineParser, Parser } from "./parser"
import type { ast, ast_node, options, parsers, width_map } from "./public_types"
import { CharMap, IsTypeOf } from "./utils"
import type { cache_entry, cached, parser_extend } from "./types"

export * from "./parser"
export * from "./utils"
export * from './syntax/standard'
export * from './syntax/extended'
export * from './syntax/finalize'
export * from './syntax/infill'


// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                           MAIN PIPELINE                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

export const default_options: options = {
    "enabled_features": [ // All enabled syntax features
        Header,
        AlternateHeader,
        BlockQuote,
        Emphasis,
        UnderscoreEmphasis,
        Strikethrough,
        List,
        Code,
        CodeBlock,
        Link,
        Image,
        HorizontalRule,
        Table,
        EscapeIncompleteHtml // Tbh you shouldn't really disable this one since that will f*ck up your charmap when the md contains html
    ],
    "disable_paragraph_elements": false, // Parse paragraphs without adding the <p> elements
    "literal_mid_word_underscores": true, // Make sure words like hello_world_stuff stay literal and don't become italic
    "add_zero_width_space_for_cursor_positions": true, // Insert zero-width-spaces to differenciate between before and after styling. Useful for carret positions
    "enable_trailing_linebreaks": true, // Put a linebreak at the end of every line, even <h1>text<br></h1>. This is also useful for carret position
    "finalize_spaces": true, // Determines wheter spaces will be replaced with &nbsp; so they always show a difference
    "debug": false // Enable any debug logging to the console
}

let final_options: options;
let parsers_sorted: parsers;

export function set_options(options: options) {
    final_options = {};

    // Fill any unspecified options with their defaults
    for(const [option, value] of Object.entries(default_options)) {
        if(options[option] !== undefined) {
            final_options[option] = options[option];
        } else {
            final_options[option] = default_options[option];
        }
    }
    verify_options(final_options);

    if(!final_options.enabled_features) return;

    // Handle priority
    parsers_sorted = final_options.enabled_features.sort((a, b) => b.PRIORITY - a.PRIORITY);

    clear_cache();
}

export function parse(text: string) {
    if(final_options?.debug) console.log('CACHE', structuredClone(cache));

    if(!final_options) set_options(default_options)
    if(final_options?.debug) console.log('CACHE', structuredClone(cache));

    let lines = parse_to_lines(text);
    if(final_options?.debug) console.log('CACHE', structuredClone(cache));

    
    // check if we can cache any lines
    let cached = parse_cache(lines, final_options);
    if(final_options?.debug) console.log("CACHED:", cached);

    if(final_options?.debug) console.log('CACHE BEFORE CHARMAP', structuredClone(cache));
    let CHAR_MAP = CharMap.from_cache(lines, cached);
    
    if(final_options?.debug) console.log('CACHE', structuredClone(cache));
    const ast = gen_ast(lines, cached, CHAR_MAP, parsers_sorted, final_options);
    if(final_options?.debug) console.log('CACHE', structuredClone(cache));
    const html = process_ast(ast, cached, CHAR_MAP, parsers_sorted, final_options);
    if(final_options?.debug) console.log("AST:", ast);

    cache_char_map(CHAR_MAP);

    if(final_options?.debug) console.log('CACHE', structuredClone(cache));

    return {
        "html": html,
        "char_map": CHAR_MAP.absolute_map()
    };
}

// -------------------------------
//  Parse the text into lines                            
// -------------------------------

// Parse text into single lines whilst keeping the \n at the end
function parse_to_lines(text: string) {
    const lines = [];
    let start = 0;

    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 10) { // '\n'
            lines.push(text.slice(start, i + 1));
            start = i + 1;
        }
    }

    if (start < text.length) {
        lines.push(text.slice(start));
    }

    lines[lines.length - 1] += "\n";

    return lines;
}

// -------------------------------
//  Ast generation                            
// -------------------------------

function gen_ast(lines: Array<string>, cached: cached, CHAR_MAP: CharMap, parsers: parsers, options: options) {

    // Run init functions before parsing
    for(const parser of parsers) {
        parser.init();
    }

    let ast: ast = [];
    let last_ast_node: ast_node | null = null;

    for(let idx = 0; idx < lines.length; idx++) {
        let line = lines[idx];
        let curr_entry = cached.entries[idx];

        if(!curr_entry || !line) continue;

        if(curr_entry.type === "node") {
            if(!curr_entry.output) throw Error('[YAMP]: Cached AST node doesn\'t have a valid output!')
            ast.push({"type": "cached", "output": curr_entry.output, "line_idx": idx});
            if(curr_entry.line_count) idx += curr_entry.line_count - 1;
            continue;
        }
        const parsed = parse_single_line(line, CHAR_MAP, lines, idx, ast, parsers, options);

        // Check if the last node should be finished
        
        if(idx === lines.length - 1) {
            if(parsed instanceof MultilineParser) {
                parsed.finish();
            } else if(parsed === Parser.EXTEND && last_ast_node instanceof MultilineParser) {
                last_ast_node.finish();
            }
        }

        if(parsed !== Parser.EXTEND) {
            if(last_ast_node !== null && last_ast_node instanceof MultilineParser && last_ast_node.constructor !== parsed.constructor) {
                if(final_options?.debug) console.log(last_ast_node);
                if(final_options?.debug) console.log(parsed);
                last_ast_node.finish();
            }

            last_ast_node = parsed;
            ast.push(parsed);
            parsed.line_idx = idx;
        }
        cache_ast_node(idx, line, parsed);
    }
    return ast;
}

function parse_single_line(line: string, CHAR_MAP: CharMap, lines: Array<string>, idx: number, ast: ast, parsers: parsers, options: options) {
    if(parsers.length > 0) {
        for(const parser of parsers) {
            if(IsTypeOf.SingleLineParserClass(parser) || IsTypeOf.MultilineParserClass(parser)) {
                CHAR_MAP.cancel_que();
                let parsed = parser.parse(line, lines, idx, CHAR_MAP, idx, 0, ast, parsers, options);
                if(parsed === null) throw new Error(`[YAMP]: Failed to build ast, parser ${parser} doesn't implement required method parse()!`);
                if(parsed !== Parser.FAIL) return parsed;
            }
        }
    }
    return Paragraph.parse(line, lines, idx, CHAR_MAP, idx, 0, ast, parsers, options);
}

// -------------------------------
//  Html generation                            
// -------------------------------

function process_ast(ast: ast, cached: cached, CHAR_MAP: CharMap, parsers: parsers, options: options) {

    let out = "";

    // Generate html segments from each ast node
    for(let i = 0; i < ast.length; i++) {


        let node = ast[i];
        let segment;

        if(!node) continue;

        if(IsTypeOf.cachedAstNode(node)) {
            segment = node.output;
        } else {
            segment = node.generate(options);
            if(!segment) continue;
            if(options.finalize_spaces !== false) segment = finalize_spaces(segment);
            cache_output(node.line_idx, segment);
        }
        
        if(segment == null) throw new Error(`[YAMP]: Failed to generate output, parser ${node.constructor.name} doesn't implement required method generate()!`);
        out += segment;
    }

    return out;
}

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                           CACHING                                                                      
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

let cache: {entries: Array<cache_entry>, char_map: width_map} = {
    "entries": [],
    "char_map": []
};

function clear_cache() {
    cache = {
        "entries": [],
        "char_map": []
    };
}

// Re-use any lines from the previous run
function parse_cache(lines: Array<string>, options: options): cached {

    let output: Array<cache_entry> = cache.entries.slice(0, lines.length);
    let char_map: Array<Array<number> | null> = cache.char_map.slice(0, lines.length);

    let prev_node_idx = -1;

    for(let i = 0; i < lines.length; i++) {
        if(cache.entries.length <= i)  {
            output[i] = {"type": "parse_again"};
            char_map[i] = null;
        }

        let entry = cache.entries[i];

        // Check if the line changed
        if(!(entry && entry.type !== "parse_again" && entry.input && lines[i] === entry.input)) {
            if(!entry || entry.type !== "extend") {
                output[i] = {"type": "parse_again"};
                char_map[i] = null;
            }

            // Reparse all lines that are part of the multiline or the previous node
            // Multilines are considered a single node so all lines should be parsed again
            // The previous node might be able to extend this line due to the change so we should also reparse that
            if(prev_node_idx >= 0) {
                let line_idx = prev_node_idx;

                if(final_options?.debug) console.log(line_idx, i);
                
                while(entry && entry.type === "extend" || line_idx < i) {
                    output[line_idx] = {"type": "parse_again"};
                    char_map[line_idx] = null;

                    line_idx++;
                    entry = cache.entries[line_idx];
                }
                entry = cache.entries[i];
                if(final_options?.debug) console.log(line_idx, i);
            }

        }

        if(entry && entry.type === "node") prev_node_idx = i;
    }

    // OMFG this line took me soo long to fix you don't want to know
    // Why is caching so difficult to debug :(
    while(cache.entries.length < lines.length) {
        cache.entries.push({"type": "parse_again"});
    }
    // It's only like 4AM rn. :fire: :fire: *this is fine* :fire: :fire:
    // Did you get that? I tried to recreate that meme

    return {
        "entries": output,
        "char_map": char_map
    }
}

let last_node_idx = 0;

// Cache a node in the hope that we'll be able to use it later
function cache_ast_node(line_idx: number, input: string, parsed: parser_extend | ast_node) {
    if(final_options?.debug) console.log("APPLY", line_idx, input, parsed);
    if(parsed === Parser.EXTEND && cache && cache.entries.length > 0) {
        let last_node = cache.entries[last_node_idx];
        if(last_node && last_node.type === "node") last_node.line_count = last_node.line_count ? last_node.line_count + 1 : 1;
        cache.entries[line_idx] = {
            "type": "extend",
            "input": input
        };
    } else {
        last_node_idx = line_idx;
        cache.entries[line_idx] = {
            "type": "node",
            "input": input,
            "line_count": 1
        };
    }
}

// Cache the output of a node in the hope that we'll be able to use it later
function cache_output(line_idx: number, output: string) {
    let entry = cache.entries[line_idx];
    if(!entry || entry.type !== "node") return console.warn('[YAMP]: Whoops an extend line somehow got a corresponding output. Please report this as an issue.')
    entry.output = output;  
}

function cache_char_map(char_map: CharMap) {
    cache.char_map = char_map.get_copy();
}

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                         HANDLE SPACES                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

function finalize_spaces(input: string) {
    let inside_html = false;
    let out = "";

    for(let i = 0; i < input.length; i++) {
        let char = input.charAt(i);

        if(char === "<") {
            for(let si = i; si < input.length; si++) {
                if(input.charAt(si) === ">") {
                    out += input.slice(i, si);
                    i = si - 1;
                    break;
                }
            }
        } else if(char === " ") {
            out += "&nbsp;";
        } else {
            out += char;
        }
    }

    return out;
}


// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                        VERIFY OPTIONS                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

function verify_options(options: options) {

    // ======= Parsers =======
    if(!(options.enabled_features instanceof Array)) {
        throw new Error("[YAMP]: failed to parse, invalid options! Field \'enabled_features\' must be of type array");
    }
    for(const parser of options.enabled_features) {
        if(!(parser.prototype instanceof Parser)) throw Error(`[YAMP]: Parser entries must be instance of Parser but found: ${parser}`);
    }

    // ======= Paragrpahs =======
    if(options.disable_paragraph_elements !== true && options.disable_paragraph_elements !== false) {
        throw new Error("[YAMP]: failed to parse, invalid options! Field \'disable_paragraph_elements\' must be of type boolean");
    }

    // ======= General =======

    if(options.add_zero_width_space_for_cursor_positions !== true && options.add_zero_width_space_for_cursor_positions !== false) {
        throw new Error("[YAMP]: failed to parse, invalid options! Field \'add_zero_width_space_for_cursor_positions\' must be of type boolean");
    }

    if(options.enable_trailing_linebreaks !== true && options.enable_trailing_linebreaks !== false) {
        throw new Error("[YAMP]: failed to parse, invalid options! Field \'enable_trailing_linebreaks\' must be of type boolean");
    }

    if(options.finalize_spaces !== true && options.finalize_spaces !== false) {
        throw new Error("[YAMP]: failed to parse, invalid options! Field \'finalize_spaces\' must be of type boolean");
    }

    if(options.debug !== true && options.debug !== false) {
        throw new Error("[YAMP]: failed to parse, invalid options! Field \'debug\' must be of type boolean");
    }
}