// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                               IMPORTS                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

import type {cached, char_map_que_entry} from "./types"
import type {absolute_map, ast_node, cached_ast_node, line_map, width_map} from "./public_types"
import { InlineParser, MultilineParser, SingleLineParser, type Parser } from "./parser";


// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                               HELPERS                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

export class StringHelper {

    static CHAR_CODE = {
        "newline": 10
    }

    static is_whitespace(c: string): boolean { 
        switch (c) {
            case ' ':
            case '\t':
            case '\n':
            case '\r':
            case '\v':
            case '\f':
            case '\u00A0':
                return true;
            default:
                return false;
        }
    }

    static is_valid_char(c: string): boolean {
        if(c.length !== 1) return false;
        const code = c.codePointAt(0);

        if(!code) return false;

        return (
            code >= 0x20 &&      // No control chars
            code !== 0x7F &&     // DEL
            !this.is_whitespace(c) &&
            !((code >= 0xE000 && code <= 0xF8FF) || // No private use area
            (code >= 0xF0000 && code <= 0xFFFFD) ||
            (code >= 0x100000 && code <= 0x10FFFD))
        );
    }

    static is_text_char(c: string): boolean {
        if (c.length !== 1) return false;

        const code = c.charCodeAt(0);

        return (
            (code >= 48 && code <= 57) || // 0-9
            (code >= 65 && code <= 90) || // A-Z
            (code >= 97 && code <= 122)   // a-z
        );
    }

    static is_number(c: string): boolean {
        if(c.length !== 1) return false;

        switch(c) {
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
                return true;
            default:
                return false;
        }
    }

    static insert_substring(string: string, start_pos: number, length: number, insert: string): string {
        return string.slice(0, start_pos) + insert + string.slice(start_pos + length);
    }

    static turn_into_ascii(input: string): string {
        let out = "";
        for(let i = 0; i < input.length; i++) {
            let c = input.charAt(i);
            if(this.is_text_char(c)) {
                out += c;
            } else if(c === " ") {
                out += "-"
            }
        }
        return out.toLowerCase();
    }
}

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                               CHAR MAPS                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

export class CharMap {
    width_map;
    que: Array<char_map_que_entry> = [];

    // -------------------------------
    //  Constructors                            
    // -------------------------------

    constructor(width_map: Array<Array<number>>) {
        this.width_map = width_map;
    }
    
    static from_cache(lines: Array<string>, cached: cached): CharMap {
        let width_map = new Array(lines.length);

        for(let line_idx = 0; line_idx < lines.length; line_idx++) {

            let curr_map;
            if(!cached.char_map[line_idx]) {
                const len = lines[line_idx]?.length;

                curr_map = new Array(len);
                curr_map.fill(0);
            } else {
                curr_map = cached.char_map[line_idx];
            }

            width_map[line_idx] = curr_map;
        }
        return new CharMap(width_map);
    }

    // -------------------------------
    //  Que handlers                            
    // -------------------------------
    
    // Append a discard to the que
    que_discard_event(line_idx: number, start: number, count: number): void {
        if(count < 1) return;
        this.que.push({
            "type": "discard",
            "line_idx": line_idx,
            "start": start,
            "count": count
        })
    }

    que_extend_event(line_idx: number, target_idx: number, amount: number): void {
        if(amount === 0) return;
        this.que.push({
            "type": "extend",
            "line_idx": line_idx,
            "target_idx": target_idx,
            "amount": amount
        });
    }

    // cancel the discard que
    cancel_que(): void {
        this.que = [];
    }

    // Apply all changes from the que
    apply_que(): void {
        for(const event of this.que) {
            if(event.type === "discard") {
                this.discard_immediately(event.line_idx, event.start, event.count);
            } else if(event.type === "extend") {
                this.extend_immediately(event.line_idx, event.target_idx, event.amount);
            }
        }
    }

    // -------------------------------
    //  Instant modifiers                            
    // -------------------------------

    // Set a character to have a width of 0
    discard_immediately(line_idx: number, start: number, count: number): void {
        for(let i = 0; i < count; i++) {
            const result = this.#wrap_idx(i + start, line_idx);
            if(result.curr_map !== undefined) result.curr_map[result.idx] = 255;
        }
    }

    // Increase the width of a character
    extend_immediately(line_idx: number, target_idx: number, amount: number): void {
        const result = this.#wrap_idx(target_idx, line_idx);
        const final_idx = result.idx;
                
        if(result.curr_map[final_idx] !== undefined && result.curr_map[final_idx] + amount >= 255) {
            throw Error('Failed to extend charmap, trying to extend width map beyond 254-width limit!');
        }

        if(result.curr_map[final_idx] !== undefined /* This will absolutely never happen (I love typescript :wilted_rose:) */ ) result.curr_map[final_idx] += amount;
    }

    // When an index is out of range of the current line, wrap to the next line
    #wrap_idx(idx: number, line: number) {
        let final_idx = idx;
        let final_line_idx = line;

        let curr_map = this.width_map[final_line_idx];
        while(curr_map !== undefined && final_idx > curr_map.length - 1) {
            final_idx -= curr_map.length;
            final_line_idx++;
            curr_map = this.width_map[final_line_idx];
        }

        if(curr_map === undefined) throw Error('Failed to discard charmap char. Array index out of range!')

        return {"idx": final_idx, "line": final_line_idx, "curr_map": curr_map};
    }

    // -------------------------------
    //  Getters                            
    // -------------------------------

    get_copy(): width_map {
        return structuredClone(this.width_map);
    }

    absolute_map(): absolute_map {
        let absolute_map = [];
        let line_map: line_map = [];
        let line_idx_map: Array<number> = [];
        let offset = 0;
        
        for(let line_idx = 0; line_idx < this.width_map.length; line_idx++) {
            let curr_line = this.width_map[line_idx];
            if(curr_line === undefined) continue;

            let curr_map: Array<number> = [];

            for(let i = 0; i < curr_line.length; i++) {
                let curr_width = curr_line[i];

                if(curr_width !== undefined && curr_width >= 0 && curr_width < 255) {
                    for(let ai = 0; ai <= curr_width; ai++) {
                        line_idx_map.push(line_idx);
                        absolute_map.push(offset);
                        curr_map.push(offset);
                    }
                }

                offset++;
            }

            line_map.push(curr_map);
        }
        return {"absolute_map": absolute_map, "width_map": this.width_map, "line_map": line_map, "line_idx_map": line_idx_map};
    }
}

export class IsTypeOf {

    static SingleLineParserClass(parser: typeof Parser): parser is typeof SingleLineParser {
        return parser.prototype instanceof SingleLineParser;
    }

    static MultilineParserClass(parser: typeof Parser): parser is typeof MultilineParser {
        return parser.prototype instanceof MultilineParser;
    }

    static InlineParserClass(parser: typeof Parser): parser is typeof InlineParser {
        return parser.prototype instanceof InlineParser;
    }

    static cachedAstNode(node: ast_node | cached_ast_node): node is cached_ast_node {
        return "type" in node && node.type === "cached";
    }

}