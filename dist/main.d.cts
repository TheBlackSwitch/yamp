type cache_entry = cache_entry_node | cache_entry_extend | cache_entry_parse_again;
interface cache_entry_node {
    type: "node";
    input: string;
    output?: string;
    line_count?: number;
}
interface cache_entry_extend {
    type: "extend";
    input: string;
}
interface cache_entry_parse_again {
    type: "parse_again";
}
interface cached {
    entries: Array<cache_entry | undefined>;
    char_map: Array<Array<number> | null>;
}
type char_map_que_entry = char_map_entry_discard | char_map_entry_extend;
interface char_map_entry_discard {
    type: "discard";
    line_idx: number;
    start: number;
    count: number;
}
interface char_map_entry_extend {
    type: "extend";
    line_idx: number;
    target_idx: number;
    amount: number;
}
type parser_fail = 0;
type parser_extend = 1;
type inline_modifier_type_insert = {
    "type": "insert";
    "value": string;
};
type inline_modifier_type_delete = {
    "type": "delete";
    "count": number;
};
type inline_modifier_type_replace = {
    "type": "replace";
    "value": string;
    "count": number;
};
type inline_modifier_type = inline_modifier_type_delete | inline_modifier_type_insert | inline_modifier_type_replace;

declare class StringHelper {
    static CHAR_CODE: {
        newline: number;
    };
    static is_whitespace(c: string): boolean;
    static is_valid_char(c: string): boolean;
    static is_text_char(c: string): boolean;
    static is_number(c: string): boolean;
    static insert_substring(string: string, start_pos: number, length: number, insert: string): string;
    static turn_into_acii(input: string): string;
}
declare class CharMap {
    width_map: number[][];
    que: Array<char_map_que_entry>;
    constructor(width_map: Array<Array<number>>);
    static from_cache(lines: Array<string>, cached: cached): CharMap;
    que_discard_event(line_idx: number, start: number, count: number): void;
    que_extend_event(line_idx: number, target_idx: number, amount: number): void;
    cancel_que(): void;
    apply_que(): void;
    discard_immediately(line_idx: number, start: number, count: number): void;
    extend_immediately(line_idx: number, target_idx: number, amount: number): void;
    get_copy(): width_map;
    absolute_map(): absolute_map;
}
declare class IsTypeOf {
    static SingleLineParserClass(parser: typeof Parser): parser is typeof SingleLineParser;
    static InlineParserClass(parser: typeof Parser): parser is typeof InlineParser;
    static cachedAstNode(node: ast_node | cached_ast_node): node is cached_ast_node;
}

declare abstract class Parser {
    static FAIL: parser_fail;
    static EXTEND: parser_extend;
    constructor(...args: any[]);
    static init(): void;
    static PRIORITY: number;
    line_idx: number;
    static register_escape_chars(): string | null;
    static escape_text(text: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, parsers: parsers): string;
}
declare class InlineParser extends Parser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): Array<InlineModifer>;
    apply(input: string): string;
}
declare class InlineModifer {
    #private;
    static new_insert(idx: number, value: string, modify_char_map?: boolean): InlineModifer;
    static new_delete(idx: number, count: number, modify_char_map?: boolean): InlineModifer;
    static new_replace(idx: number, count: number, new_value: string, modify_char_map?: boolean): InlineModifer;
    get index(): number;
    constructor(data: inline_modifier_type, index: number, modify_char_map: boolean);
    apply(line: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number): string;
}
declare class SingleLineParser extends Parser {
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, ast: ast, parsers: parsers, options: options): parser_fail | parser_extend | ast_node | null;
    static parse_inline(text: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, parsers: parsers, options: options): string;
    generate(options: options): string | null;
}
declare class MultilineParser extends SingleLineParser {
    static try_extend(ast: ast, ...parameters: any): boolean;
    static parse_single_line(line: string, lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, ast: ast, parsers: parsers, options: options, allow_self?: boolean): parser_extend | ast_node;
    extend(...parameters: any): boolean;
}

// -------------------------------
//  Imports                            
// -------------------------------



// -------------------------------
//  Types                            
// -------------------------------

// ======= CHAR MAP =======

// a 2 dimensional array that's used to represent the width of each character in the file input
type width_map = Array<Array<number>>

interface absolute_map {
    absolute_map: Array<number>,
    width_map: width_map
}
type parsers = Array<typeof Parser>;

// ast
type ast_node = SingleLineParser | MultilineParser;

interface cached_ast_node {
    type: "cached",
    output: string,
    line_idx: number
}

type ast = Array<ast_node | cached_ast_node>;



// options
interface options {
    enabled_features?: parsers,
    disable_paragraph_elements?: boolean,
    enable_trailing_linebreaks?: boolean,
    literal_mid_word_underscores?: boolean,
    add_zero_width_space_for_cursor_positions?: boolean,
    finalize_spaces?: boolean,

    [key: string]: any;
}

declare class Paragraph extends MultilineParser {
    #private;
    constructor(text: string);
    extend(text: string): boolean;
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): ast_node | parser_extend;
    generate(options: options): string;
}
declare class Header extends SingleLineParser {
    #private;
    constructor(text: string, id: string, level: number);
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): 0 | Header;
    static register_escape_chars(): string;
    generate(options: options): string;
}
declare class AlternateHeader extends MultilineParser {
    #private;
    static PRIORITY: number;
    get is_complete(): boolean;
    constructor(text: string, id: string, level: number);
    extend(): boolean;
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): parser_extend | parser_fail | ast_node;
    register_escape_chars(): string;
    generate(options: options): string;
}
declare class BlockQuote extends MultilineParser {
    #private;
    CHAR_MAP: CharMap;
    char_map_idx: number;
    char_map_line: number;
    constructor(text: string, next_line: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, parsers: parsers, options: options);
    extend(text: string, next_line: string): boolean;
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): 0 | BlockQuote | 1;
    static check_ast_parsing(ast: ast): void;
    parse_ast(): void;
    static register_escape_chars(): string;
    generate(options: options): string;
}
declare class Emphasis extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): InlineModifer[];
    static register_escape_chars(): string;
}
declare class UnderscoreEmphasis extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): InlineModifer[];
    static register_escape_chars(): string;
}
interface list_item {
    text?: string;
    intend: number;
    is_ordered: boolean | null;
    number?: number;
}
declare class List extends MultilineParser {
    #private;
    constructor(text: string, intend_count: number, number: number, is_ordered: boolean);
    extend(text: string, intend_count: number, number: number, is_ordered: boolean): boolean;
    static is_list_char(c: string): boolean;
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): 0 | List | 1;
    static register_escape_chars(): string;
    get prev_item(): list_item;
    generate(options: options): string;
}
declare class Code extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): InlineModifer[];
    static register_escape_chars(): string;
}
declare class Link extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): InlineModifer[];
    static register_escape_chars(): string;
}
declare class Image extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): InlineModifer[];
    static register_escape_chars(): string;
    static PRIORITY: number;
}
declare class HorizontalRule extends SingleLineParser {
    constructor();
    static is_horizontal_rule_char(c: string): boolean;
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): 0 | HorizontalRule;
    generate(options: options): string;
}

interface cell {
    text: string;
}
type row = Array<cell>;
interface column {
    heading: string;
    align: "left" | "center" | "right";
}
declare class Table extends MultilineParser {
    #private;
    get is_aligned(): boolean;
    get column_count(): number;
    constructor(columns: Array<column>);
    extend(align: boolean, row?: row): boolean;
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): 0 | Table | 1;
    static register_escape_chars(): string;
    generate(options: options): string;
}
declare class CodeBlock extends MultilineParser {
    #private;
    constructor(language: string);
    get is_ended(): boolean;
    extend(text: string, end_block?: boolean): boolean;
    static parse(line: string, all_lines: Array<string>, line_idx: number, CHAR_MAP: CharMap, char_map_line: number, charmap_idx: number, ast: ast, parsers: parsers, options: options): 0 | CodeBlock | 1;
    static register_escape_chars(): string;
    generate(options: options): string;
}
declare class Strikethrough extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number, options: options): InlineModifer[];
    static register_escape_chars(): string;
}

declare class EscapeIncompleteHtml extends InlineParser {
    static parse(input: string, CHAR_MAP: CharMap, char_map_line: number, char_map_idx: number): Array<InlineModifer>;
    static verify_html_entity(html_entity: string): boolean;
    static register_escape_chars(): string;
}

declare const default_options: options;
declare function set_options(options: options): void;
declare function parse(text: string): {
    html: string;
    char_map: absolute_map;
};

export { AlternateHeader, BlockQuote, CharMap, Code, CodeBlock, Emphasis, EscapeIncompleteHtml, Header, HorizontalRule, Image, InlineModifer, InlineParser, IsTypeOf, Link, List, MultilineParser, Paragraph, Parser, SingleLineParser, Strikethrough, StringHelper, Table, UnderscoreEmphasis, default_options, parse, set_options };
