// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                             IMPORTS + TYPES                                                                 
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

import { InlineModifer, InlineParser, MultilineParser, Parser, SingleLineParser } from "../parser";
import type { ast, ast_node, options, parsers } from "../public_types";
import type { parser_extend, parser_fail } from "../types";
import { IsTypeOf, StringHelper, type CharMap } from "../utils";


// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                     STANDARD MARKDOWN SYNTAX                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

// -------------------------------
//  Paragraphs                            
// -------------------------------

export class Paragraph extends MultilineParser {
    #text: string;

    constructor(text: string) {
        super();
        this.#text = `${text}<br>`;
    }

    extend(text: string) {
        this.#text += `${text}<br>`;
        return true;
    }

    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): ast_node | parser_extend {
        line = this.parse_inline(line, CHAR_MAP, char_map_line, charmap_idx, parsers, options);
        line = this.escape_text(line, CHAR_MAP, char_map_line, charmap_idx, parsers);

        if(line.length <= 1 && options.add_zero_width_space_for_cursor_positions !== false) {
            line = "\u200B" + line;
            CHAR_MAP.extend_immediately(char_map_line, charmap_idx, 1); // Extend the newline to also include the zero width space
        }

        if(!this.try_extend(ast, line)) {
            return new Paragraph(line);
        }
        return Parser.EXTEND;
    }

    generate(options: options) {
        if(options.disable_paragraph_elements) {
            return this.#text;
        } else {
            return `<p>${this.#text}</p>`;
        }
    }
}


// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Headers                            
// -------------------------------

export class Header extends SingleLineParser {
    #text = "";
    #level = 0;
    #id;

    constructor(text: string, id: string, level: number) {
        super();
        this.#text = text;
        this.#level = level;
        this.#id = id;
    }

    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options) {
        if(line.length === 1 || !line.includes('#')) return Parser.FAIL; // no parsing

        let start_idx = 0;
        while(line.charAt(start_idx) === " ") {
            CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx, 1); // Discard spaces
            start_idx++;
        }

        if(line.charAt(start_idx) !== "#") return Parser.FAIL;
        CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx, 1); // Discard the first #

        let heading_level = 1;
        let char = line.charAt(1 + start_idx);

        // count the heading level
        while(char === '#') {
            CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx + heading_level, 1); // Discard the #
            heading_level++;
            char = line.charAt(heading_level + start_idx);
        }

        if(heading_level === 0) return Parser.FAIL;

        let text = line.slice(heading_level + start_idx + 1);
        let new_charmap_idx = heading_level + start_idx + 1 + charmap_idx;
        
        if(char !== " " || text.length === 0) return Parser.FAIL; // no parsing
        CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx + heading_level, 1); // Discard another space

        let id = text; // The id is generated before parsing inline

        text = this.parse_inline(text, CHAR_MAP, char_map_line, new_charmap_idx, parsers, options);
        text = this.escape_text(text, CHAR_MAP, char_map_line, new_charmap_idx, parsers);

        CHAR_MAP.apply_que();
        return new Header(text, StringHelper.turn_into_ascii(id), heading_level);
    }

    static register_escape_chars() {
        return "#";
    }

    generate(options: options) {
        return `<h${this.#level} id="header-${this.#id}">${this.#text}${options.enable_trailing_linebreaks ? "<br>" : ""}</h${this.#level}>`;
    }

}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Alternate Headers                            
// -------------------------------


export class AlternateHeader extends MultilineParser {
    #text;
    #id;
    #level;
    #complete = false;

    static PRIORITY = 15;

    get is_complete() {
        return this.#complete
    }

    constructor(text: string, id: string, level: number) {
        super();
        this.#text = text;
        this.#level = level;
        this.#id = id;
    }

    extend(): boolean {
        this.#complete = true;
        return true; // Always succeed extending
    }

    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): parser_extend | parser_fail | ast_node {
        let prev_ast_node = line_idx > 0 ? ast[ast.length - 1] : null;

        if(line.length <= 1) return Parser.FAIL;

        if(prev_ast_node instanceof AlternateHeader && !prev_ast_node.is_complete) {
            CHAR_MAP.discard_immediately(char_map_line, charmap_idx, line.length);
            prev_ast_node.extend();
            return Parser.EXTEND;
        }

        let next_line = line_idx < all_lines.length - 1 ? all_lines[line_idx + 1]?.trim() : "";
        if(next_line === undefined) return Parser.FAIL;
        let first_char = next_line.charAt(0);
        let last_char = next_line.charAt(0);
        if(!(first_char === "=" || first_char === "-") || !(last_char === "=" || last_char === "-") || next_line.length < 2) return Parser.FAIL;

        let success = true;
        let level = -1;

        // Verify if the next line is only the same header character
        for(let i = 0; i < next_line.length; i++) {
            let char = next_line.charAt(i);
            if(char === "=" && level === -1) {
                level = 1;

            } else if(char === "-" && level === -1) {
                level = 2;
            } else if(level === 1 && char !== "=" || level === 2 && char !== "-") {
                success = false;
                return Parser.FAIL;
            } 
        }


        line = this.parse_inline(line, CHAR_MAP, char_map_line, charmap_idx, parsers, options);
        line = this.escape_text(line, CHAR_MAP, char_map_line, charmap_idx, parsers);
        
        if(success && level > 0) {
            return new AlternateHeader(line, StringHelper.turn_into_ascii(line), level);
        }
        return Parser.FAIL
    }

    register_escape_chars(): string {
        return "-=";
    }

    generate(options: options) {
        return `<h${this.#level} id="header-${this.#id}">${this.#text}<br></h${this.#level}>`;
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Block quotes                            
// -------------------------------

export class BlockQuote extends MultilineParser {
    #lines: Array<string> = [];
    #parsers: parsers = [];
    #options: options;
    #ast: ast = [];
    CHAR_MAP: CharMap;
    char_map_idx: number;
    char_map_line: number;

    constructor(text: string, next_line: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, parsers: parsers, options: options) {
        super();
        this.#lines.push(text);
        this.#parsers = parsers;
        this.#options = options;
        this.CHAR_MAP = CHAR_MAP;
        this.char_map_idx = char_map_idx;
        this.char_map_line = char_map_line;
        if(next_line === null) this.parse_ast();
    }

    extend(text: string, next_line: string): boolean {
        this.#lines.push(text);
        if(next_line === null) this.parse_ast();
        return true; // Always succeed extending
    }

    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options) {
        if(line.length === 0 || !line.includes('>')) {
            this.check_ast_parsing(ast);
            return Parser.FAIL; // no parsing
        }

        let start_idx = 0;
        while(line.charAt(start_idx) === " ") {
            start_idx++;
        }

        if(line.charAt(start_idx) !== ">") {
            this.check_ast_parsing(ast);
            return Parser.FAIL;
        }

        let blockquote_depth = 1;
        let char = line.charAt(1 + start_idx);

        while(char === ">") {
            blockquote_depth++;
            char = line.charAt(blockquote_depth + start_idx);
        }

        if(blockquote_depth === 0 || char !== " ") {
            this.check_ast_parsing(ast);
            return Parser.FAIL;
        }

        let new_charmap_idx = start_idx + 1 + charmap_idx;
        CHAR_MAP.que_discard_event(char_map_line, start_idx + charmap_idx, 1);

        let text = line.slice(start_idx + blockquote_depth === 1 ? 2 : 1); // remove only a single > for nesting

        if(blockquote_depth === 1) {
            CHAR_MAP.que_discard_event(char_map_line, start_idx + charmap_idx + blockquote_depth, 1);
            new_charmap_idx++;
        }

        if(text.length === 0) {
            this.check_ast_parsing(ast);
            return Parser.FAIL;
        }

        let next_line = all_lines[line_idx + 1] ? all_lines[line_idx + 1] : null;
        if(next_line === null || next_line === undefined) return Parser.FAIL;

        CHAR_MAP.apply_que();
        if(!this.try_extend(ast, text, next_line)) {
            return new BlockQuote(text, next_line, CHAR_MAP, char_map_line, new_charmap_idx, parsers, options);
        }
        return Parser.EXTEND;
    }

    // Check if the previous ast_node is a block quote and start parsing it's ast because this is their last line
    static check_ast_parsing(ast: ast) {
        let prev_ast_node = ast[ast.length - 1];
        if(prev_ast_node instanceof BlockQuote) {
            prev_ast_node.parse_ast();
        }
    }

    // Handle ast generation here since we might not have all lines available whilst parsing a single line
    parse_ast() {
        this.#ast = [];
        for(const [idx, line] of this.#lines.entries()) {
            let ast_ast_node = BlockQuote.parse_single_line(line, this.#lines, idx, this.CHAR_MAP, this.char_map_line + idx, this.char_map_idx, this.#ast, this.#parsers, this.#options, true);
            if(ast_ast_node !== Parser.EXTEND) {
                this.#ast.push(ast_ast_node);
            }
        }
    }

    static register_escape_chars(): string {
        return '>';
    }

    generate(options: options) {
        let out = "<blockquote>";
        for(const ast_ast_node of this.#ast) {
            if(IsTypeOf.cachedAstNode(ast_ast_node)) continue;
            out+=`${ast_ast_node.generate(options)}`;
        }
        out += "</blockquote>";
        return out;
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Emphasis (bold / italic)                  
// -------------------------------

export class Emphasis extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes('*')) return [];

        let modifiers = [];

        let start = 0;
        let opening_count = 0;
        let closing_count = 0;

        // Search for any bold / italic text
        for(let i = 0; i < input.length; i++) {
            let char = input.charAt(i);
            let prev_char = input.charAt(i - 1);

            // Count opening and closing
            if(char === "*") {
                if(prev_char === "\\" /* escaping */) {
                    opening_count = 0;
                    start = 0;
                    closing_count = 0;
                    continue;
                }

                if(prev_char === "*" && closing_count === 0 || opening_count === 0) {
                    if(opening_count === 0) start = i;
                    opening_count++;
                } else if(opening_count > 0 && closing_count < 3) {
                    closing_count++;
                }
            }

            // Handle closing
            if(closing_count > 0 && (char !== "*" || i === input.length - 1) || opening_count === closing_count && opening_count > 0 || closing_count >= 3) {
                let final_count = Math.min(opening_count, closing_count, 3);
                let start_pos = start + Math.max(0, opening_count - final_count);
                let end_pos = i - Math.max(0, closing_count - final_count);

                if(char !== "*") end_pos -= 1; // look at the condition above. The indexing of i is different there

                if(final_count === 1) {
                    modifiers.push(InlineModifer.new_replace(start_pos, final_count, '<em>', true));
                    modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, '</em>', true));

                } else if(final_count === 2) {
                    
                    modifiers.push(InlineModifer.new_replace(start_pos, final_count, '<strong>', true));
                    modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, '</strong>', true));

                } else if(final_count >= 3) {
                    
                    modifiers.push(InlineModifer.new_replace(start_pos, final_count, '<em><strong>', true));
                    modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, '</strong></em>', true));

                }

                opening_count = 0;
                closing_count = 0;
            }
        }

        return modifiers;
    }

    static register_escape_chars() {
        return '*';
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Underscore Emphasis                            
// -------------------------------

export class UnderscoreEmphasis extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes('_')) return [];

        let modifiers = [];

        let out = input;

        let start = 0;
        let opening_count = 0;
        let closing_count = 0;
        let after_word = false; // if this opening / closing is after a word

        // Search for any bold / italic text
        for(let i = 0; i < input.length; i++) {
            let char = input.charAt(i);
            let prev_char = input.charAt(i - 1);
            let next_char = input.charAt(i + 1);

            // Count opening and closing
            if(char === "_" && prev_char !== "\\" /* escaping */) {
                if(prev_char === "_" && closing_count === 0 || opening_count === 0) {
                    if(opening_count === 0) {
                        start = i;
                        if(StringHelper.is_text_char(prev_char) && options.literal_mid_word_underscores) after_word = true;
                    }
                    if(after_word && StringHelper.is_text_char(next_char)) {
                        opening_count = 0;
                        after_word = false;
                    } else {
                        opening_count++;
                    }
                } else if(opening_count > 0) {
                    if(closing_count === 0 && StringHelper.is_text_char(prev_char) && options.literal_mid_word_underscores) after_word = true;
                    if(after_word && StringHelper.is_text_char(next_char)) {
                        opening_count = 0;
                        closing_count = 0;
                        after_word = false;
                    }
                    closing_count++;
                }
            }

            if(closing_count > 0 && (char !== "_" /* Yes good boy this condition */ || i === input.length - 1) || opening_count === closing_count && opening_count > 0 || closing_count >= 3) {

                let lookahead = i + 1;
                while(input.charAt(lookahead) === "_" && lookahead < input.length) {
                    lookahead++;
                }

                // No a little higher actually
                if(!after_word || !StringHelper.is_text_char(input.charAt(lookahead))) {
                    let final_count = Math.min(opening_count, closing_count, 3);
                    let start_pos = start + Math.max(0, opening_count - final_count);
                    let end_pos = i - Math.max(0, closing_count - final_count);

                    if(char !== "_") end_pos -= 1; // look at the condition above. The indexing of i is different there
                    
                    if(final_count === 1) {

                        // Charmap is handled in the modifier so no need for that
                        modifiers.push(InlineModifer.new_replace(start_pos, final_count, '<em>', true));
                        modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, '</em>', true));

                    } else if(final_count === 2) {
                        
                        // Charmap is handled in the modifier so no need for that
                        modifiers.push(InlineModifer.new_replace(start_pos, final_count, '<strong>', true));
                        modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, '</strong>', true));

                    } else if(final_count >= 3) {
                                                
                        // Charmap is handled in the modifier so no need for that
                        modifiers.push(InlineModifer.new_replace(start_pos, final_count, '<em><strong>', true));
                        modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, '</strong></em>', true));

                    }

                    opening_count = 0;
                    closing_count = 0;
                } else {
                    closing_count = 0;
                    i = lookahead;
                }
            }
        }

        return modifiers;
    }

    static register_escape_chars() {
        return "_";
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Lists    
// -------------------------------

interface list_item {
    text?: string,
    intend: number,
    is_ordered: boolean | null,
    number?: number
}

export class List extends MultilineParser {
    #items: Array<list_item> = [];
    #stack: Array<list_item> = []; // Used during generation

    constructor(text: string, intend_count: number, number: number, is_ordered: boolean) {
        super();
        this.#items.push({
            "text": text,
            "intend": intend_count,
            "is_ordered": is_ordered,
            "number": number
        });
    }

    extend(text: string, intend_count: number, number: number, is_ordered: boolean) {
        let last_item = this.#items[this.#items.length - 1];
        if(!last_item) return false;

        if(intend_count !== 0 || last_item.is_ordered === is_ordered) {
            this.#items.push({
                "text": text,
                "intend": intend_count,
                "is_ordered": is_ordered,
                "number": number
            });
            return true;
        } else {
            return false;
        }
    }

    static is_list_char(c: string) {
        if(c.length !== 1) return false;
        switch(c) {
            case "*":
            case "-":
            case "+":
                return true;
            default:
                return false;
        }
    }

    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options) {
        let intend_count = 0;

        // Count whitespace intendation
        while(StringHelper.is_whitespace(line.charAt(intend_count))) {
            CHAR_MAP.que_discard_event(char_map_line, intend_count + charmap_idx, 1);
            intend_count++;
        }

        let is_ordered = StringHelper.is_number(line.charAt(intend_count));

        // Count the number of numbers for ordered lists
        let number_count = 0;
        if(is_ordered) {
            while(StringHelper.is_number(line.charAt(number_count + intend_count))) {
                CHAR_MAP.que_discard_event(char_map_line, intend_count + number_count + charmap_idx, 1);
                number_count++;
            }

            if(number_count === 0 || line.charAt(intend_count + number_count) !== ".") return Parser.FAIL;
        
        } else if(!this.is_list_char(line.charAt(intend_count))) {
            return Parser.FAIL;
        }

        CHAR_MAP.que_discard_event(char_map_line, intend_count + number_count + charmap_idx, 1);

        // Check correct whitespace
        if(
            !StringHelper.is_whitespace(line.charAt(intend_count + number_count + 1))
        ) return Parser.FAIL;

        CHAR_MAP.que_discard_event(char_map_line, intend_count + number_count + 1 + charmap_idx, 1);

        // Get the number
        let number = Number(line.slice(intend_count, intend_count + number_count));

        // Get the text
        let text = line.slice(intend_count + number_count + 2);

        if(text.length === 0) return Parser.FAIL;

        let new_charmap_idx = intend_count + number_count + 2 + charmap_idx;

        // Parse text
        text = this.parse_inline(text, CHAR_MAP, char_map_line, new_charmap_idx, parsers, options);

        CHAR_MAP.apply_que();

        if(!this.try_extend(ast, text, intend_count, number, is_ordered)) {
            return new List(text, intend_count, number, is_ordered);
        }
        return Parser.EXTEND;
    }

    static register_escape_chars() {
        return "*-+.";
    }

    get prev_item(): list_item {
        if(this.#stack.length === 0) return {"intend": -1, "is_ordered": null};
        let last_item = this.#stack[this.#stack.length - 1];
        if(!last_item) return {"intend": -1, "is_ordered": null};
        return last_item;
    }

    generate(options: options) {
        let out = "";

        let normalized_intend: Array<number> = [];
        for(const item of this.#items) {
            if(!normalized_intend.includes(item.intend)) {
                normalized_intend.push(item.intend);
            }
        }
        normalized_intend.sort();

        this.#stack = [];

        // Add list items
        for(const item of this.#items) {
            let intend = normalized_intend.indexOf(item.intend);
            let prev_item = this.prev_item;

            // If the intend decreased, close the list(s)
            while(prev_item && prev_item.intend > intend) {
                if(prev_item.is_ordered === null) throw Error('Failed to find ordering whilst closing list.');
                if(prev_item.is_ordered) {
                    out += "</ol>";
                } else {
                    out += "</ul>";
                }
                this.#stack.pop();
                prev_item = this.prev_item;
            }


            // If the intend increased, start (a) list(s)
            if(prev_item && prev_item.intend < intend) {
                for(let i = prev_item.intend + 1; i <= intend; i++) {
                    if(item.is_ordered) {
                        let list_start = item.number ? ` start="${item.number}"` : "";
                        out += `<ol${list_start}>`;
                    } else {
                        out += `<ul>`;
                    }
                    prev_item = {
                        "intend": i,
                        "is_ordered": item.is_ordered
                    };
                    this.#stack.push(prev_item);
                }
            }

            // If the ordering is different, start a new list type
            if(prev_item.is_ordered !== null && prev_item.is_ordered !== item.is_ordered) {
                if(prev_item.is_ordered) {
                    out += "</ol>";
                } else {
                    out += "</ul>";
                }
                if(item.is_ordered) {
                    out += "<ol>";
                } else {
                    out += "<ul>";
                }
                let last_item = this.#stack[this.#stack.length - 1];
                if(last_item) last_item.is_ordered = item.is_ordered;
            }

            // Create a new list item
            if(item.text && item.text.length > 0) out += `<li>${item.text}${options.enable_trailing_linebreaks ? "<br>" : ""}</li>`
        }

        // Close any remaining open lists
        for(let i = this.prev_item.intend; i >= 0; i--) {
            let is_ordered = this.#stack[i]?.is_ordered;
            if(is_ordered === null) throw Error('Failed to close list, stack is too short');
            if(is_ordered) {
                out += "</ol>";
            } else {
                out += "</ul>";
            }
        }

        return out;
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Code                            
// -------------------------------

// Damn this was a lot more difficult that you'd think :P
export class Code extends InlineParser {

    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes("`")) return [];

        let backticks = [];
        let count = 0;
        let modifiers = [];

        for(let i = 0; i < input.length; i++) {
            if(input.charAt(i) === "`" && input.charAt(i - 1) !== "\\") {

                let start = i;
                i++;
                count=1;

                // Count the number of backticks
                while(input.charAt(i) === "`") {
                    count++;
                    i++;
                    if(count >= 3) continue;
                }

                backticks.push({
                    "count": count,
                    "start": start
                })
            }
        } 

        if(backticks.length === 0) return [];

        for(let i = 0; i < backticks.length; i++) {
            let backtick = backticks[i];
            if(!backtick) continue;

            // Check if this one can be closed
            let success = false;
            for(let si = i + 1; si < backticks.length; si++) { // si stands for search index
                let ending = backticks[si];
                if(!ending) continue;

                // Yay it can be closed so replace the string
                if(ending.count === backtick.count) {

                    // Decided to handle some custom charmap handling for this one
                    if(backtick.count > 1) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + ending.start + 1, backtick.count - 1);
                    if(backtick.count > 1) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + backtick.start + backtick.count - 1, backtick.count - 1);

                    modifiers.push(InlineModifer.new_replace(ending.start, backtick.count, "</code>\u200B"));
                    modifiers.push(InlineModifer.new_replace(backtick.start, backtick.count, "<code>\u200B"));

                    i = si;
                    success = true;
                    break;
                }
            }
            if(success) continue;
        }


        return modifiers;
    }

    static register_escape_chars() {
        return "`";
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Links                            
// -------------------------------

// TODO: Optimize / clean this abomination
export class Link extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes('<') && !input.includes('[')) return [];

        let modifiers = [];

        let link_part_open = 0;
        let link_part_done = 0;
        let text_part_open = 0;
        let link_part = "";
        let text_part = "";

        for(let i = input.length - 1; i >= 0; i--) {
            let char = input.charAt(i);
            let next_char = input.charAt(i - 1);


            // ======= [<text>](<link>) SYNTAX =======

            if(char === ")" && next_char !== '\\') {
                link_part_open += 1;
                link_part = "";

            } else if(char == "(" && next_char !== '\\' && link_part_open > 0) {
                if(link_part_open > 1) {
                    link_part_open-=1;
                    continue;
                }

                link_part_open = 0;
                link_part_done = 1;

            } else if(char === ']' && next_char !== '\\' && link_part_done) {
                text_part_open += 1;
                text_part = "";

            } else if(char === '[' && next_char !== '\\' && link_part_done && text_part_open > 0) {
                if(text_part_open > 1) {
                    text_part_open-=1;
                    continue;
                }

                if(next_char === "!") {
                    link_part_done = 0;
                    link_part_open = 0;
                    text_part_open = 0;
                    continue;
                }

                text_part_open = 0;
                link_part_done = 0;

                let title_start = -1;
                if(link_part.charAt(link_part.length - 1) === "\"") {
                    for(let idx = link_part.length - 2; idx >= 0; idx--) {
                        if(link_part.charAt(idx) === "\"") {
                            title_start = idx;
                        }
                    }
                } else {
                    title_start = link_part.length + 1;
                }

                let title = link_part.slice(title_start + 1, link_part.length - 1);
                let link_ = link_part.slice(0, title_start - 1);
                
                modifiers.push(InlineModifer.new_replace(i, 1, `<a href="${link_}" class="link" title="${title}">`, true));
                modifiers.push(InlineModifer.new_replace(i + text_part.length + 1, 3 + link_part.length, '</a>', true));

            } else if(
                link_part_done && !text_part_open || 
                (link_part_open || text_part_open) && 
                !(StringHelper.is_valid_char(char) || StringHelper.is_whitespace(char))
            ) {
                link_part_done = 0;
                link_part_open = 0;
                text_part_open = 0;

            } else if(link_part_open) {
                link_part = char + link_part;

            } else if(text_part_open) {
                text_part = char + text_part;   
            }
        }

        return modifiers;

    }

    static register_escape_chars() {
        return "[]()<>";
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Images                            
// -------------------------------

// TODO: Optimize / clean this abomination
export class Image extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes('!')) return [];
        let modifiers = [];

        let link_open = false;
        let link = "";
        let end = 0;

        let image_part_open = false;
        let image_part_done = false;
        let text_part_open = false;
        let image_part = "";
        let text_part = "";
        let link_end = 0;

        for(let i = input.length - 1; i >= 0; i--) {
            let char = input.charAt(i);
            let next_char = input.charAt(i - 1);

            // ======= [<text>](<link>) SYNTAX =======

            if(char === ")" && next_char !== '\\') {
                image_part_open = true;
                link_end = i;
                image_part = "";

            } else if(char == "(" && next_char !== '\\' && image_part_open) {
                image_part_open = false;
                image_part_done = true;

            } else if(char === ']' && next_char !== '\\' && image_part_done) {
                text_part_open = true;
                text_part = "";

            } else if(char === '[' && next_char === '!' && image_part_done && text_part_open) {
                text_part_open = false;
                image_part_done = false;

                // Search through for the image part for the title

                let title_start = 0;
                if(image_part.charAt(image_part.length - 1) === "\"") {
                    for(let idx = image_part.length - 2; idx >= 0; idx--) {
                        if(image_part.charAt(idx) === "\"") {
                            title_start = idx;
                        }
                    }
                } else {
                    title_start = image_part.length + 1;
                }
                
                let title = image_part.slice(title_start + 1, image_part.length - 1);
                let image_source = image_part.slice(0, title_start - 1);

                modifiers.push(InlineModifer.new_replace(i - 1, text_part.length + image_part.length + 5, `<img src="${image_source}" title="${title}" alt="${text_part}">`, true));
            
            } else if(
                image_part_done && !text_part_open || 
                (image_part_open || text_part_open) && 
                !(StringHelper.is_valid_char(char) || StringHelper.is_whitespace(char))
            ) {
                image_part_done = false;
                image_part_open = false;
                text_part_open = false;

            } else if(image_part_open) {
                image_part = char + image_part;

            } else if(text_part_open) {
                text_part = char + text_part;   
            }
        }

        return modifiers;

    }

    static register_escape_chars() {
        return "[]()!";
    }

    static PRIORITY = 15;
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//   Horizontal Rules            
// -------------------------------

export class HorizontalRule extends SingleLineParser {
    constructor() {
        super();
    }

    static is_horizontal_rule_char(c: string) {
        if(c.length === 0) return false;
        switch(c) {
            case "*":
            case "-":
            case "_":
                return true;
            default:
                return false;
        }
    }
    
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options) {
        if(line.length <= 3) return Parser.FAIL

        let selected_char = line.charAt(0);

        if(!this.is_horizontal_rule_char(selected_char)) return Parser.FAIL;

        for(let i = 1; i < line.length - 1 /* Don't include the newline at the end */; i++) {
            let char = line.charAt(i);
            if(!this.is_horizontal_rule_char(char) || char !== selected_char) {
                return Parser.FAIL;
            }
        }
        CHAR_MAP.discard_immediately(line_idx, charmap_idx, line.length);
        return new HorizontalRule();
    }

    generate(options: options) {
        return `<hr>`;
    }
}