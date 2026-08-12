// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                          IMPORTS + GLOBALS                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

import {IsTypeOf, StringHelper, type CharMap} from './utils';
import type {ast, ast_node, options, parsers} from "./public_types"
import type {inline_modifier_type, parser_extend, parser_fail} from "./types"
import { Paragraph } from './syntax/standard';

// ==========================================================================================================================================
// ------------------------------------------------------------------------------------------------------------------------------------------
//                                                            SYNTAX PARSING                                                                       
// ------------------------------------------------------------------------------------------------------------------------------------------
// ==========================================================================================================================================

export abstract class Parser {
    static FAIL: parser_fail = 0;     // Failed to parse so go to the next parser
    static EXTEND: parser_extend = 1;   // The previous parser got extended so skip this line

    constructor(...args: any[]) {}

    static init() {} // Runs once before the parsing starts. Can be used to init static variables for example

    static PRIORITY = 10; // Use this modifier to handle the order in which syntax is parsed. Higher numbers get parsed earlier

    line_idx = 0; // Used internally for chaching

    static register_escape_chars(): string | null{ // Return all characters that should be escaped
        return null;
    }

    static escape_text(text: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, parsers: parsers): string { // Escape any characters within text and return the modified text
        if(
            text === undefined || char_map_line === undefined || CHAR_MAP === undefined || char_map_idx === undefined || parsers === undefined
        ) throw Error("[YAMP]: Failed to run function escape_text(), missing arguments to function! Expected 5");

        
        if(parsers.length === 0 || !text.includes('\\')) return text;
        let out = "";

        // Make a list of all characters that should be escaped
        let escape_chars = "";
        for(const parser of parsers) {
            let result = parser.register_escape_chars();
            if(result) {
                escape_chars += result;
            }
        }

        if(escape_chars.length === 0) return text;
        
        for(let i = 0; i < text.length; i++) {
            if(text.charAt(i) === "\\" && escape_chars.includes(text.charAt(i + 1))) {
                CHAR_MAP.discard_immediately(char_map_line, i + char_map_idx, 1);
                out += text.charAt(i + 1);
                i++;
            } else {
                out += text.charAt(i);
            }
        }
        return out;        
    }
}

// -------------------------------
//  Parse inline syntax                 
// -------------------------------

export class InlineParser extends Parser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): Array<InlineModifer> {  // Process a single line and return a list of modifiers
        return [];
    }
}

export class InlineModifer {
    #index: number = 0;
    #data: inline_modifier_type;
    #params: object = {};
    #modify_char_map: boolean = true;

    static new_insert(idx: number, value: string, modify_char_map = false): InlineModifer {
        return new InlineModifer({"type": "insert", "value": value}, idx, modify_char_map);
    }

    static new_delete(idx: number, count: number, modify_char_map = false): InlineModifer {
        return new InlineModifer({"type": "delete", "count": count}, idx, modify_char_map);
    }

    static new_replace(idx: number, count: number, new_value: string, modify_char_map = false): InlineModifer {
        return new InlineModifer({"type": "replace", "value": new_value, "count": count}, idx, modify_char_map);
    }

    get index(): number {
        return this.#index;
    }

    constructor(data: inline_modifier_type, index: number, modify_char_map: boolean) {
        this.#data = data;
        this.#index = index;
        this.#modify_char_map = modify_char_map
    }

    apply(line: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number): string {
        if(this.#data.type === "insert") {
            line = StringHelper.insert_substring(line, this.#index, 0, this.#data.value);

        } else if(this.#data.type === "delete") {

            if(this.#modify_char_map) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + this.#index, this.#data.count);
            line = StringHelper.insert_substring(line, this.#index, this.#data.count, "");

        } else if(this.#data.type === "replace") {

            if(this.#modify_char_map) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + this.#index, this.#data.count);
            line = StringHelper.insert_substring(line, this.#index, this.#data.count, this.#data.value);

        }
        return line;
    }
}

// -------------------------------
//  Parse a single line                            
// -------------------------------

// Parse a single line depending on some special syntax
export class SingleLineParser extends Parser {
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, ast: ast, parsers: parsers, options: options): parser_fail | parser_extend | ast_node | null {
        return null;
    } // return a new ast ast_node for success, return null if the line should be removed, else return undefined

    static parse_inline(text: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, parsers: parsers, options: options): string {
        if(
            text === undefined || char_map_line === undefined || CHAR_MAP === undefined || char_map_idx === undefined || 
            parsers === undefined || options === undefined
        ) throw Error("[YAMP]: Failed to run function parse_inline(), missing arguments to function! Expected 6");
        if(parsers.length > 0) {
            let modifiers = [];

            for(const parser of parsers) {
                if(IsTypeOf.InlineParserClass(parser)) {
                    let result = parser.parse(text, CHAR_MAP, char_map_line, char_map_idx, options);
                    if(result == undefined) throw Error(`[YAMP]: Failed to run function parse_inline(), method parse() of parser ${parser.constructor.name} returned an unexpected value. Expected type Array[InlineParser].`);
                    if(result.length === 0) continue; 
                    for(const res of result) {
                        if(!(res instanceof InlineModifer)) throw Error(`[YAMP]: Failed to run function parse_inline(), method parse() of parser ${parser.constructor.name} returned an unexpected value. Expected type Array[InlineParser].`);
                    }
                    modifiers.push(...result);
                }
            }

            modifiers.sort((a, b) => b.index - a.index);

            for(const modifier of modifiers) {
                text = modifier.apply(text, CHAR_MAP, char_map_line, char_map_idx);
            }
        }
        return text;
    }

    // Render all html from this ast ast_node
    generate(options: options): string | null {
        return null;
    } 
}

// -------------------------------
//  Parse multiple lines                            
// -------------------------------

// Syntax that may be spread out over multiple lines but that can be merged into a single ast ast_node
export class MultilineParser extends SingleLineParser {

    finish() {} // This medthod is called when the next node isn't a the same node and thus this node is closed

    static try_extend(ast: ast, ...parameters: any): boolean { // Try to extend the previous ast with parameters returns true if the ast got extended
        if(ast.length === 0) return false;
        let prev_ast_node = ast[ast.length - 1];
        if(prev_ast_node instanceof this) {
            return prev_ast_node.extend(...parameters);
        }
        return false;
    }

    static parse_ast(lines: Array<string>, CHAR_MAP: CharMap, char_map_line: number, char_map_indices: Array<number>, parsers: parsers, options: options, allow_self = true): Array<ast_node> {
        let ast: Array<ast_node> = [];
        let last_ast_node: ast_node | null = null;
    
        for(let idx = 0; idx < lines.length; idx++) {
            let line = lines[idx];
            if(line === undefined) continue;

            let char_map_idx = char_map_indices[idx];
            if(char_map_idx === undefined) throw Error('[YAMP] Failed to parse AST, provided parameter char_map_indices doesn\'t align with the lines. It\'s to short!');
            const parsed = this.parse_single_line(line, lines, idx, CHAR_MAP, char_map_line + idx, char_map_idx, ast, parsers, options, allow_self);
    
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
                    last_ast_node.finish();
                }

                last_ast_node = parsed;
                ast.push(parsed);
                parsed.line_idx = idx;
            }
        }
        return ast;
    }

    static parse_single_line(line: string, lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, ast: ast, parsers: parsers, options: options, allow_self = false): parser_extend | ast_node {
        if(parsers.length > 0) {
            for(const parser of parsers) {
                if(IsTypeOf.SingleLineParserClass(parser)) {
                    if(!allow_self && (parser.prototype instanceof this)) continue;
                    CHAR_MAP.cancel_que();
                    let parsed = parser.parse(line, lines, line_idx, CHAR_MAP, char_map_line, char_map_idx, ast, parsers, options);
                    if(parsed !== null && parsed !== Parser.FAIL) return parsed;
                }
            }
        }
        return Paragraph.parse(line, lines, line_idx, CHAR_MAP, char_map_line, char_map_idx, ast, parsers, options);
    }

    // Extend this ast object with another line, should return true for success and false when extending failed
    extend(...parameters: any): boolean {
        return false;
    } 
}