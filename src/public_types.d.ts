// -------------------------------
//  Imports                            
// -------------------------------

import type { MultilineParser, Parser, SingleLineParser } from "./parser";

// -------------------------------
//  Types                            
// -------------------------------

// ======= CHAR MAP =======

// a 2 dimensional array that's used to represent the width of each character in the file input
export type width_map = Array<Array<number>>

export interface absolute_map {
    absolute_map: Array<number>,
    width_map: width_map
}

// ======= PARSING =======

// parsers
export type any_parser = Omit<typeof Parser, "prototype">;
export type parsers = Array<typeof Parser>;

// ast
export type ast_node = SingleLineParser | MultilineParser;

export interface cached_ast_node {
    type: "cached",
    output: string,
    line_idx: number
}

export type ast = Array<ast_node | cached_ast_node>;



// options
export interface options {
    enabled_features?: parsers,
    disable_paragraph_elements?: boolean,
    enable_trailing_linebreaks?: boolean,
    literal_mid_word_underscores?: boolean,
    add_zero_width_space_for_cursor_positions?: boolean,
    finalize_spaces?: boolean,

    [key: string]: any;
}