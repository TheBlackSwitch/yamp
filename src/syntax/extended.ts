// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                             IMPORTS + TYPES                                                                 
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

import { InlineModifer, InlineParser, MultilineParser, Parser } from "../parser";
import type { ast, options, parsers } from "../public_types";
import { StringHelper, type CharMap } from "../utils";

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                           EXTENDED SYNTAX                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================


// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Tables :O                            
// -------------------------------

interface cell {
    text: string
}

type row = Array<cell>

interface column {
    heading: string,
    align: "left" | "center" | "right"
}

export class Table extends MultilineParser {
    #aligned = false;
    #rows: Array<row> = [];
    #colums: Array<column> = [];

    get is_aligned() {
        return this.#aligned;
    }

    get column_count() {
        return this.#colums.length;
    }

    constructor(columns: Array<column>) {
        super();
        this.#colums = columns;
    }

    extend(align: boolean, row: row = []): boolean {
        if(align) {
            this.#aligned = true;
        } else {
            this.#rows.push(row);
        }
        return true;
    }

    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options) {

        let start_idx = 0;
        while(line.charAt(start_idx) === " ") {
            start_idx++;
        }

        if(line.charAt(start_idx) !== '|') return Parser.FAIL;

        let next_line = all_lines[line_idx + 1] ? all_lines[line_idx + 1] : "";
        let prev_node = ast[ast.length - 1];
        let text = "";

        // ======= PARSE NEW ROWS =======

        if(prev_node instanceof Table) {
            if(prev_node.is_aligned) {
                let curr_row = [];
                let cell_count = 0;

                

                for(let idx = start_idx + 1; idx < line.length - 1; idx++) {
                    let char = line.charAt(idx);
                    let prev_char = line.charAt(idx - 1);
                    if(char === "|" && prev_char !== '\\') {

                        let new_charmap_idx = charmap_idx + 1;

                        text = this.parse_inline(text, CHAR_MAP, char_map_line, charmap_idx + idx + 1, parsers, options);

                        curr_row.push({
                            "text": text
                        });

                        text = "";
                        cell_count++;
                        
                    } else {
                        text += char;
                    }
                }

                if(cell_count != prev_node.column_count) return Parser.FAIL;
                
                CHAR_MAP.discard_immediately(char_map_line, charmap_idx + start_idx, 1);
                CHAR_MAP.discard_immediately(char_map_line, line.length - 1, 1);
                prev_node.extend(false, curr_row);
                return Parser.EXTEND;
            } else {
                prev_node.extend(true);
                return Parser.EXTEND;
            }
        }

        if(!next_line || !next_line.includes('|')) return Parser.FAIL;
        
        let columns: Array<column> = [];
        let column_idx = 0;

        // ======= HEADING ======

        for(let idx = start_idx + 1; idx < line.length; idx++) {
            let char = line.charAt(idx);
            let prev_char = line.charAt(idx - 1);
            if(char === "|" && prev_char !== "\\") {

                text = this.parse_inline(text, CHAR_MAP, char_map_line, charmap_idx + idx + 1, parsers, options);

                columns.push({
                    "heading": text,
                    "align": "left"
                });

                text = "";

            } else {
                text += char;
                
            }
        }
        if(columns.length === 0 || !next_line.includes('-') || !next_line.startsWith('|')) return Parser.FAIL;

        // ======= COLUMN ALIGNMENT =======
        text = "";
        for(let idx = 1; idx < next_line.length - 1; idx++) {
            let char = next_line.charAt(idx);
            let prev_char = next_line.charAt(idx - 1);

            if(char === "|" && prev_char !== "\\") {
                if(column_idx >= columns.length) return Parser.FAIL;

                let curr_column = columns[column_idx];
                if(!curr_column) continue;

                if(text.startsWith(':-') && text.endsWith('-:')) {
                    curr_column.align = "center";

                } else if(text.startsWith(':-')) { // Left align
                    curr_column.align = "left";

                } else if(text.endsWith('-:')) { // Right align
                    curr_column.align = "right";

                }
                column_idx++;
                text = "";
            } else if(!StringHelper.is_valid_char(char)) {
                return Parser.FAIL;
            } else {
                text += char;
            }
        }

        if(column_idx !== columns.length) return Parser.FAIL;

        CHAR_MAP.discard_immediately(char_map_line, charmap_idx + start_idx, 1);
        CHAR_MAP.discard_immediately(char_map_line, line.length - 1, 1);
        CHAR_MAP.discard_immediately(char_map_line + 1, 0, next_line.length);

        return new Table(columns);  
    }

    static register_escape_chars() {
        return "|";
    }

    generate(options: options) {
        let out = "<table>";

        out += "<thead><tr>";
        for(const column of this.#colums) {
            out += `<td style="text-align: ${column.align}">${column.heading}${options.enable_trailing_linebreaks ? "<br> " : ""}</td>`;
        }
        out += "</tr></thead>";

        out += "<tbody>";
        for(const row of this.#rows) {
            out += "<tr>";
            for(const [idx, cell] of row.entries()) {
                let align = this.#colums[idx]?.align;
                out += `<td style="text-align: ${align}">${cell.text}${options.enable_trailing_linebreaks ? "<br> " : ""}</td>`;
            }
            out += "</tr>";
        }
        out += "</tbody></table>";

        return out;
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Github Style Code blocks                            
// -------------------------------

export class CodeBlock extends MultilineParser {
    #lines: Array<string> = [];
    #language;
    #ended = false;

    constructor(language: string) {
        super();
        this.#language = language;
    }

    get is_ended() {
        return this.#ended;
    }

    extend(text: string, end_block = false): boolean {
        this.#lines.push(text);
        if(end_block) this.#ended = true;
        return true; // Always successfully extend
    }

    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options) {
        let prev_node = ast[ast.length - 1];


        if(prev_node instanceof CodeBlock && !prev_node.is_ended) {
            if(line.startsWith("```")) {
                CHAR_MAP.discard_immediately(char_map_line, charmap_idx, line.length);
                prev_node.extend("", true);

            } else {
                let text = "";
                for(let i = 0; i < line.length - 1; i++) {
                    let char = line.charAt(i);
                    if(char === '&') {text += "&amp"; continue;}
                    if(char === '<') {text += "&lt;"; continue;}
                    if(char === '>') {text += "&gt;"; continue;}
                    if(char === '\"') {text += "&quot;"; continue;}
                    if(char === '\'') {text += "&#39;"; continue;}
                    text += char;
                }

                prev_node.extend(text);
            }    
            return Parser.EXTEND;
        }

        if(line.startsWith("```")) {


            let success = false;
            for(let i = line_idx + 1; i < all_lines.length; i++) {
                if(all_lines[i]?.startsWith("```")) {
                    success = true;
                    break;
                }
            }

            if(!success) return Parser.FAIL;

            let language = line.slice(3);

            for(let i = 0; i < language.length - 1; i++) {
                if(!StringHelper.is_text_char(language.charAt(i))) return Parser.FAIL;
            }

            CHAR_MAP.discard_immediately(char_map_line, charmap_idx, line.length);
            return new CodeBlock(language);
        }

        return Parser.FAIL;
    }

    static register_escape_chars() {
        return '`';
    }

    generate(options: options) {
        let out = `<pre><code class=\"language-${this.#language}\">`;
        for(const [idx, line] of this.#lines.entries()) {
            if(idx !== 0) {
                out += "\n";
            }
            out += line;
        }
        out += `</code></pre>`;
        return out;
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// -------------------------------
//  Strikethrough                            
// -------------------------------

export class Strikethrough extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options) {
        if(!input.includes("~")) return [];

        let squiggles = [];
        let count = 0;

        let modifiers = [];


        // Make a list of all squiggles and their length
        for(let i = 0; i < input.length; i++) {
            if(input.charAt(i) === "~") {

                let start = i;
                i++;
                count=1;

                // Count the number of squiggles
                while(input.charAt(i) === "~") {
                    count++;
                    i++;
                    if(count >= 3) continue; // Any squiggles that are larger than 2 are not useful to us os discard them
                }

                if(count !== 2) continue; // Well basically only just store squiggles with a length of 2

                squiggles.push({
                    "count": count,
                    "start": start
                })
            }
        } 

        // Nothing to do when no squiggles are found
        if(squiggles.length === 0) return [];

        // Try to make closed off sections within all found squiggles and apply the modifiers
        for(let i = 0; i < squiggles.length; i++) {
            let squiggle = squiggles[i];
            if(!squiggle) continue;

            // Check if this one can be closed
            let success = false;
            for(let si = i + 1; si < squiggles.length; si++) { // si stands for search index
                let ending = squiggles[si];

                if(!ending) continue;

                // Yay it can be closed so replace the string
                if(ending.count === squiggle.count) {

                    modifiers.push(InlineModifer.new_replace(ending.start, squiggle.count, "</s>", true));
                    modifiers.push(InlineModifer.new_replace(squiggle.start, squiggle.count, "<s>", true));

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
        return '~';
    }
}
