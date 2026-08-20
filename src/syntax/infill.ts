// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                               IMPORTS                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

import { InlineModifer, InlineParser } from "../parser";
import type { options } from "../public_types";
import { StringHelper, type CharMap } from "../utils";

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                        INFILL SPECIFIC SYNTAX                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Colored text                            
// -------------------------------

export class Color extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes("]") || !input.includes("[") || !input.includes("|")) return [];

        let modifiers: Array<InlineModifer> = [];

        let color_start = 0;
        let color_opened = false;
        let color_done = false;
        let color_end = 0;

        for(let i = 0; i < input.length; i++) {
            let char = input.charAt(i);
            if(char === "[") {
                color_start = i;
                color_opened = true;
            } else if(char === "|" && color_opened) {
                color_end = i;
                color_done = true;
            } else if(char === "]" && color_done && color_opened) {
                let color_part = input.slice(color_start + 1, color_end);

                if(color_part.length === 0 || color_end + 1 === i) {
                    color_opened = false;
                    color_done = false;
                    continue;
                }

                modifiers.push(InlineModifer.new_replace(color_start, color_end - color_start + 1, `<span style="color: ${color_part};">`, true));
                modifiers.push(InlineModifer.new_replace(i, 1, '</span>', true));
                
            } else if(color_opened && !color_done && !StringHelper.is_text_char(char) && char !== "#") {
                color_opened = false;
            }
        }

        return modifiers;
    }

    static register_escape_chars(): string {
        return "[|]";
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Highlighted text                            
// -------------------------------

export class Highlight extends InlineParser {

    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes("^")) return [];

        let backticks = [];
        let count = 0;
        let modifiers = [];

        for(let i = 0; i < input.length; i++) {
            if(input.charAt(i) === "^" && input.charAt(i - 1) !== "\\") {

                let start = i;
                i++;
                count=1;

                // Count the number of backticks
                while(input.charAt(i) === "^") {
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

                    modifiers.push(InlineModifer.new_replace(ending.start, backtick.count, "</mark>\u200B"));
                    modifiers.push(InlineModifer.new_replace(backtick.start, backtick.count, "<mark>\u200B"));

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
        return "^";
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Underlined text                            
// -------------------------------

export class Underlined extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes("=")) return [];

        let equal_signs = [];
        let count = 0;

        let modifiers = [];


        // Make a list of all equal_signs and their length
        for(let i = 0; i < input.length; i++) {
            if(input.charAt(i) === "=") {

                let start = i;
                i++;
                count=1;

                // Count the number of equal_signs
                while(input.charAt(i) === "=") {
                    count++;
                    i++;
                    if(count >= 3) continue; // Any equal_signs that are larger than 2 are not useful to us os discard them
                }

                if(count !== 2) continue; // Well basically only just store equal_signs with a length of 2

                equal_signs.push({
                    "count": count,
                    "start": start
                })
            }
        } 

        // Nothing to do when no equal_signs are found
        if(equal_signs.length === 0) return [];

        // Try to make closed off sections within all found equal_signs and apply the modifiers
        for(let i = 0; i < equal_signs.length; i++) {
            let squiggle = equal_signs[i];
            if(!squiggle) continue;

            // Check if this one can be closed
            let success = false;
            for(let si = i + 1; si < equal_signs.length; si++) { // si stands for search index
                let ending = equal_signs[si];

                if(!ending) continue;

                // Yay it can be closed so replace the string
                if(ending.count === squiggle.count) {

                    modifiers.push(InlineModifer.new_replace(ending.start, squiggle.count, "</u>", true));
                    modifiers.push(InlineModifer.new_replace(squiggle.start, squiggle.count, "<u>", true));

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
        return '=';
    }
}
