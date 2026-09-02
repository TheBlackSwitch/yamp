// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                             IMPORTS + TYPES                                                                 
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

import { InlineModifer, InlineParser } from "../parser";
import { StringHelper, type CharMap } from "../utils";

interface stack_entry {
    full_text: string,
    start_location: number,
    got_closing_bracket: number,
    html_tag: string,
    invalid_attributes?: boolean
}


// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                                 SYNTAX                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

// Escape any incomplete HTML whilst also keeping the charmap aligned with HTML parsing
export class EscapeIncompleteHtml extends InlineParser {

    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number): Array<InlineModifer> {

        let modifiers: Array<InlineModifer> = [];

        let stack: Array<stack_entry | undefined> = [];
        let is_closing = false;
        let is_inside_tag = false;
        let is_html_attributes = false;
        let invalid_attributes = false;
        let attributes_double_quotes_open = false;
        let attributes_single_quotes_open = false;

        // -------------------------------
        //  Escape any incomplete html                            
        // -------------------------------

        for(let i = 0; i < input.length; i++) {
            let curr_char = input.charAt(i);
            let prev_char = input.charAt(i - 1);

            // Open the tag
            
            if(curr_char === "<" && prev_char !== "\\") {

                // move very faulty html all the way to the beginning of the stack so we don't have to worry about it anymore
                if(is_inside_tag) {
                    let last = stack[stack.length - 1];

                    if(last !== undefined) stack.unshift(last);
                    stack.splice(stack.length - 1, 1);
                    is_closing = false;
                }
                
                stack.push({
                    "full_text": "",
                    "start_location": i,
                    "got_closing_bracket": 0,
                    "html_tag": ""
                });
                is_inside_tag = true;

            // Mark that this is a closing tag
            } else if(is_inside_tag && curr_char === "/" && prev_char === '<') {
                let last = stack[stack.length - 1];
                is_closing = true;
                if(last !== undefined) last.full_text += "/";
                
            // The attributes of the tag are starting
            } else if(is_inside_tag && curr_char === " ") {
                let last = stack[stack.length - 1];
                if(last !== undefined) last.full_text += " ";
                is_html_attributes = true;

            // Close the tag
            } else if(is_inside_tag && curr_char === ">" && prev_char !== "\\") {
                let last = stack[stack.length - 1];
                if(last === undefined) continue;

                last.got_closing_bracket = 1;
                last.invalid_attributes = invalid_attributes || attributes_double_quotes_open || attributes_single_quotes_open;

                // Closing tags can close the last (equal) stack entry
                if(is_closing) {
                    // Might be a faulty close tag
                    if(stack.length < 2 || stack[stack.length - 2]?.html_tag !== stack[stack.length - 1]?.html_tag) {

                        let found_idx = null;
                        
                        // go back until we've found our opening tag
                        for(let idx = stack.length - 3; idx >= 0; idx--) {
                            if(stack[idx]?.html_tag === stack[stack.length - 1]?.html_tag) {
                                found_idx = idx;
                                break;
                            }
                        }

                        // Faulty close tag so remove this one
                        if(found_idx === null) {
                            let curr_tag = stack[stack.length - 1];
                            if(!curr_tag) continue;
                            modifiers.push(InlineModifer.new_replace(curr_tag.start_location, 1, '&lt;'));
                            modifiers.push(InlineModifer.new_replace(curr_tag.start_location + curr_tag.full_text.length + 1, 1, '&gt;'));
                            stack.splice(stack.length - 1, 1);

                        // Ok it isn't a faulty close tag, there's just a random tag in between
                        } else {
                            const mods = this.close_html_tags(stack[found_idx], stack[stack.length - 1], stack, input, CHAR_MAP, char_map_line);
                            if(mods !== null) modifiers.push(...mods);
                        }

                    // Yay the tags align perfectly
                    } else {
                        const mods = this.close_html_tags(stack[stack.length - 2], stack[stack.length - 1], stack, input, CHAR_MAP, char_map_line);
                        if(mods !== null) modifiers.push(...mods);
                    }

                // html void tags shouldn't be added to the stack
                } else {
                    switch(stack[stack.length - 1]?.html_tag) { 
                        case "br":
                        case "hr":
                        case "img":
                        case "wbr":
                        case "source":
                        case "track":
                            let tag = stack[stack.length - 1];
                            if(!tag) break;
                            CHAR_MAP.discard_immediately(char_map_line, tag.start_location, tag.full_text.length + 2);
                            stack.splice(stack.length - 1, 1);
                        default:
                            break;
                    }
                }

                is_closing = false;
                is_inside_tag = false;
                is_html_attributes = false;
                attributes_double_quotes_open = false;
                attributes_single_quotes_open = false;

            } else if(is_inside_tag) {
                let last = stack[stack.length - 1];

                // Verify if the html attributes are correct
                if(is_html_attributes) {
                    if(!StringHelper.is_whitespace(curr_char) && !StringHelper.is_valid_char(curr_char)) {
                        invalid_attributes = true;
                    }

                    if(curr_char === "\"" && !attributes_single_quotes_open) {
                        if(attributes_double_quotes_open) {
                            attributes_double_quotes_open = false;
                        } else {
                            attributes_double_quotes_open = true;
                        }
                    }

                    if(curr_char === "\'" && !attributes_double_quotes_open) {
                        if(attributes_single_quotes_open) {
                            attributes_single_quotes_open = false;
                        } else {
                            attributes_single_quotes_open = true;
                        }
                    }

                // Construct the html tag name
                } else {
                    if(last !== undefined) last.html_tag += curr_char;
                }
                
                if(last !== undefined) last.full_text += curr_char;
            }
        }

        stack.sort((a, b) => (a !== undefined && b !== undefined) ? b.start_location - a.start_location : 0);

        // Finally, turn any non closed html tags into text
        for(const entry of stack) {
            if(entry) modifiers.push(InlineModifer.new_replace(entry.start_location, 1, '&lt;'));
            if(entry && entry.got_closing_bracket) modifiers.push(InlineModifer.new_replace(entry.start_location + entry.full_text.length + 1, 1, '&gt;'));
        }


        // -------------------------------
        //  Escape HTML entities                            
        // -------------------------------
        for(let i = 0; i < input.length; i++) {
            let char = input.charAt(i);

            if(char === "&") {

                let success = false;
                for(let si = i + 1; si < input.length; si++) {
                    let search_char = input.charAt(si);
                    let prev_search_char = input.charAt(si);
                    if(search_char === ";" && prev_search_char !== "\\") {
                        success = true;
                        if(this.verify_html_entity(input.slice(i, si + 1))) {
                            CHAR_MAP.discard_immediately(char_map_line, char_map_idx + i + 1, si - i);
                        }
                        break;
                    }
                }
                
                if(!success) {
                    modifiers.push(InlineModifer.new_replace(i, 1, "&amp;"));
                }

            }
        }

        // -------------------------------
        //  Manual backslash escaping                            
        // -------------------------------

        for(let i = 0; i < input.length; i++) {
            let prev_char = input.charAt(i - 1);
            if(prev_char === "\\") {
                switch(input.charAt(i)) {
                    case "<":
                        CHAR_MAP.discard_immediately(char_map_line, char_map_idx + i - 1, 1);
                        modifiers.push(InlineModifer.new_replace(i - 1, 2, "&lt;"));
                        break;
                    case ">":
                        CHAR_MAP.discard_immediately(char_map_line, char_map_idx + i - 1, 1);
                        modifiers.push(InlineModifer.new_replace(i - 1, 2, "&gt;"));
                        break;
                    case "&":
                        CHAR_MAP.discard_immediately(char_map_line, char_map_idx + i - 1, 1);
                        modifiers.push(InlineModifer.new_replace(i - 1, 2, "&amp;"));
                        break;
                }
            }
        }

        return modifiers;
    }

    static close_html_tags(opening: stack_entry | undefined, closing: stack_entry | undefined, stack: Array<stack_entry | undefined>, input: string, CHAR_MAP: CharMap, char_map_line: number): Array<InlineModifer> | null {
        let modifiers: Array<InlineModifer> = [];
        
        if(opening === undefined || closing === undefined) throw Error('[YAMP]: Failed to close html tags, opening and or closing tag is undefined!')
        if(opening?.invalid_attributes) { // Invalid html atributes so don't close and 
            stack.unshift(closing);      // move all the way to the front of the stack
            stack.unshift(opening);
            stack.splice(stack.length - 2, 2);

        // Ok the tags work out perfectly
        } else {
            CHAR_MAP.discard_immediately(char_map_line, opening.start_location, opening.full_text.length + 2);
            CHAR_MAP.discard_immediately(char_map_line, closing.start_location, closing.full_text.length + 2);

            stack.splice(stack.length - 2, 2); // remove the opening and closing tag

            // Remove any trailing newline after the opening tag
            let next_char = input.charAt(opening.start_location + opening.full_text.length + 2);
            if(next_char === "\n") {
                modifiers.push(InlineModifer.new_delete(opening.start_location + opening.full_text.length + 2, 1, true));
            }

            // Remove any trailing newline after the closing tag
            next_char = input.charAt(closing.start_location + closing.full_text.length + 2);
            if(next_char === "\n") {
                modifiers.push(InlineModifer.new_delete(closing.start_location + closing.full_text.length + 2, 1, true));
            }
            
            return modifiers;
        }
        return null;
    }

    // Ehh I think this is a cool solution I came up with
    static verify_html_entity(html_entity: string): boolean {
        let elem = document.createElement('textarea');
        elem.innerHTML = html_entity;
        return elem.value !== html_entity;
    }

    static register_escape_chars(): string {
        return ";";
    }

}