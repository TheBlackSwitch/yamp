// -------------------------------
//  IMPORTS                            
// -------------------------------

import type{ width_map } from "./public_types";

// -------------------------------
//  TYPES                            
// -------------------------------

// Entries within the cached.entries array. Each entry corresponds to a single line
export type cache_entry = cache_entry_node | cache_entry_extend | cache_entry_parse_again

export interface cache_entry_node {
    type: "node"
    input: string,
    output?: string,
    line_count?: number
}

export interface cache_entry_extend {
    type: "extend",
    input: string
}

export interface cache_entry_parse_again {
    type: "parse_again"
}


// The cached compound
export interface cached {
    entries: Array<cache_entry | undefined>,
    char_map: Array<Array<number> | null>
}

// ======= CHAR MAP =======

// entries within the charmap que
export type char_map_que_entry = char_map_entry_discard | char_map_entry_extend;

interface char_map_entry_discard {
    type: "discard",
    line_idx: number,
    start: number,
    count: number,
}

interface char_map_entry_extend {
    type: "extend",
    line_idx: number,
    target_idx: number,
    amount: number
}


// ======= PARSER =======

export type parser_fail = 0;
export type parser_extend = 1;

// ======= INLINE MODIFIERS =======

export type inline_modifier_type_insert = {
    "type": "insert",
    "value": string
}
export type inline_modifier_type_delete = {
    "type": "delete",
    "count": number
}
export type inline_modifier_type_replace = {
    "type": "replace",
    "value": string,
    "count": number
}
export type inline_modifier_type = inline_modifier_type_delete | inline_modifier_type_insert | inline_modifier_type_replace;


