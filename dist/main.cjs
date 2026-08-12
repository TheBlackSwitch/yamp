"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  AlternateHeader: () => AlternateHeader,
  BlockQuote: () => BlockQuote,
  CharMap: () => CharMap,
  Code: () => Code,
  CodeBlock: () => CodeBlock,
  Color: () => Color,
  Emphasis: () => Emphasis,
  EscapeIncompleteHtml: () => EscapeIncompleteHtml,
  Header: () => Header,
  Highlight: () => Highlight,
  HorizontalRule: () => HorizontalRule,
  Image: () => Image,
  InlineModifer: () => InlineModifer,
  InlineParser: () => InlineParser,
  IsTypeOf: () => IsTypeOf,
  Link: () => Link,
  List: () => List,
  MultilineParser: () => MultilineParser,
  Paragraph: () => Paragraph,
  Parser: () => Parser,
  SingleLineParser: () => SingleLineParser,
  Strikethrough: () => Strikethrough,
  StringHelper: () => StringHelper,
  Table: () => Table,
  Underlined: () => Underlined,
  UnderscoreEmphasis: () => UnderscoreEmphasis,
  default_options: () => default_options,
  parse: () => parse,
  set_options: () => set_options
});
module.exports = __toCommonJS(main_exports);

// src/utils.ts
var StringHelper = class {
  static CHAR_CODE = {
    "newline": 10
  };
  static is_whitespace(c) {
    switch (c) {
      case " ":
      case "	":
      case "\n":
      case "\r":
      case "\v":
      case "\f":
      case "\xA0":
        return true;
      default:
        return false;
    }
  }
  static is_valid_char(c) {
    if (c.length !== 1) return false;
    const code = c.codePointAt(0);
    if (!code) return false;
    return code >= 32 && // No control chars
    code !== 127 && // DEL
    !this.is_whitespace(c) && !(code >= 57344 && code <= 63743 || // No private use area
    code >= 983040 && code <= 1048573 || code >= 1048576 && code <= 1114109);
  }
  static is_text_char(c) {
    if (c.length !== 1) return false;
    const code = c.charCodeAt(0);
    return code >= 48 && code <= 57 || // 0-9
    code >= 65 && code <= 90 || // A-Z
    code >= 97 && code <= 122;
  }
  static is_number(c) {
    if (c.length !== 1) return false;
    switch (c) {
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
  static insert_substring(string, start_pos, length, insert) {
    return string.slice(0, start_pos) + insert + string.slice(start_pos + length);
  }
  static turn_into_ascii(input) {
    let out = "";
    for (let i = 0; i < input.length; i++) {
      let c = input.charAt(i);
      if (this.is_text_char(c)) {
        out += c;
      } else if (c === " ") {
        out += "-";
      }
    }
    return out.toLowerCase();
  }
};
var CharMap = class _CharMap {
  width_map;
  que = [];
  constructor(width_map) {
    this.width_map = width_map;
  }
  static from_cache(lines, cached) {
    let width_map = new Array(lines.length);
    for (let line_idx = 0; line_idx < lines.length; line_idx++) {
      let curr_map;
      if (!cached.char_map[line_idx]) {
        const len = lines[line_idx]?.length;
        curr_map = new Array(len);
        curr_map.fill(0);
      } else {
        curr_map = cached.char_map[line_idx];
      }
      width_map[line_idx] = curr_map;
    }
    return new _CharMap(width_map);
  }
  // Append a discard to the que
  que_discard_event(line_idx, start, count) {
    if (count < 1) return;
    this.que.push({
      "type": "discard",
      "line_idx": line_idx,
      "start": start,
      "count": count
    });
  }
  que_extend_event(line_idx, target_idx, amount) {
    if (amount === 0) return;
    this.que.push({
      "type": "extend",
      "line_idx": line_idx,
      "target_idx": target_idx,
      "amount": amount
    });
  }
  // cancel the discard que
  cancel_que() {
    this.que = [];
  }
  // Apply all changes from the que
  apply_que() {
    for (const event of this.que) {
      if (event.type === "discard") {
        this.discard_immediately(event.line_idx, event.start, event.count);
      } else if (event.type === "extend") {
        this.extend_immediately(event.line_idx, event.target_idx, event.amount);
      }
    }
  }
  // Set a character to have a width of 0
  discard_immediately(line_idx, start, count) {
    for (let i = 0; i < count; i++) {
      if (this.width_map[line_idx]) this.width_map[line_idx][i + start] = 255;
    }
  }
  // Increase the width of a character
  extend_immediately(line_idx, target_idx, amount) {
    if (this.width_map[line_idx] === void 0 || this.width_map[line_idx][target_idx] === void 0 || target_idx >= this.width_map[line_idx].length) {
      return;
    }
    if (this.width_map[line_idx][target_idx] + amount >= 255) {
      throw Error("Failed to extend charmap, trying to extend width map beyond 254-width limit!");
    }
    this.width_map[line_idx][target_idx] += amount;
  }
  get_copy() {
    return structuredClone(this.width_map);
  }
  absolute_map() {
    let absolute_map = [];
    let offset = 0;
    for (let line_idx = 0; line_idx < this.width_map.length; line_idx++) {
      let curr_line = this.width_map[line_idx];
      if (curr_line === void 0) continue;
      for (let i = 0; i < curr_line.length; i++) {
        let curr_width = curr_line[i];
        if (curr_width !== void 0 && curr_width >= 0 && curr_width < 255) {
          for (let ai = 0; ai <= curr_width; ai++) {
            absolute_map.push(offset);
          }
        }
        offset++;
      }
    }
    return { "absolute_map": absolute_map, "width_map": this.width_map };
  }
};
var IsTypeOf = class {
  static SingleLineParserClass(parser) {
    return parser.prototype instanceof SingleLineParser;
  }
  static MultilineParserClass(parser) {
    return parser.prototype instanceof MultilineParser;
  }
  static InlineParserClass(parser) {
    return parser.prototype instanceof InlineParser;
  }
  static cachedAstNode(node) {
    return "type" in node && node.type === "cached";
  }
};

// src/parser.ts
var Parser = class {
  static FAIL = 0;
  // Failed to parse so go to the next parser
  static EXTEND = 1;
  // The previous parser got extended so skip this line
  constructor(...args) {
  }
  static init() {
  }
  // Runs once before the parsing starts. Can be used to init static variables for example
  static PRIORITY = 10;
  // Use this modifier to handle the order in which syntax is parsed. Higher numbers get parsed earlier
  line_idx = 0;
  // Used internally for chaching
  static register_escape_chars() {
    return null;
  }
  static escape_text(text, CHAR_MAP, char_map_line, char_map_idx, parsers) {
    if (text === void 0 || char_map_line === void 0 || CHAR_MAP === void 0 || char_map_idx === void 0 || parsers === void 0) throw Error("[YAMP]: Failed to run function escape_text(), missing arguments to function! Expected 5");
    if (parsers.length === 0 || !text.includes("\\")) return text;
    let out = "";
    let escape_chars = "";
    for (const parser of parsers) {
      let result = parser.register_escape_chars();
      if (result) {
        escape_chars += result;
      }
    }
    if (escape_chars.length === 0) return text;
    for (let i = 0; i < text.length; i++) {
      if (text.charAt(i) === "\\" && escape_chars.includes(text.charAt(i + 1))) {
        CHAR_MAP.discard_immediately(char_map_line, i + char_map_idx, 1);
        out += text.charAt(i + 1);
        i++;
      } else {
        out += text.charAt(i);
      }
    }
    return out;
  }
};
var InlineParser = class extends Parser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    return [];
  }
};
var InlineModifer = class _InlineModifer {
  #index = 0;
  #data;
  #params = {};
  #modify_char_map = true;
  static new_insert(idx, value, modify_char_map = false) {
    return new _InlineModifer({ "type": "insert", "value": value }, idx, modify_char_map);
  }
  static new_delete(idx, count, modify_char_map = false) {
    return new _InlineModifer({ "type": "delete", "count": count }, idx, modify_char_map);
  }
  static new_replace(idx, count, new_value, modify_char_map = false) {
    return new _InlineModifer({ "type": "replace", "value": new_value, "count": count }, idx, modify_char_map);
  }
  get index() {
    return this.#index;
  }
  constructor(data, index, modify_char_map) {
    this.#data = data;
    this.#index = index;
    this.#modify_char_map = modify_char_map;
  }
  apply(line, CHAR_MAP, char_map_line, char_map_idx) {
    if (this.#data.type === "insert") {
      line = StringHelper.insert_substring(line, this.#index, 0, this.#data.value);
    } else if (this.#data.type === "delete") {
      if (this.#modify_char_map) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + this.#index, this.#data.count);
      line = StringHelper.insert_substring(line, this.#index, this.#data.count, "");
    } else if (this.#data.type === "replace") {
      if (this.#modify_char_map) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + this.#index, this.#data.count);
      line = StringHelper.insert_substring(line, this.#index, this.#data.count, this.#data.value);
    }
    return line;
  }
};
var SingleLineParser = class extends Parser {
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, char_map_idx, ast, parsers, options) {
    return null;
  }
  // return a new ast ast_node for success, return null if the line should be removed, else return undefined
  static parse_inline(text, CHAR_MAP, char_map_line, char_map_idx, parsers, options) {
    if (text === void 0 || char_map_line === void 0 || CHAR_MAP === void 0 || char_map_idx === void 0 || parsers === void 0 || options === void 0) throw Error("[YAMP]: Failed to run function parse_inline(), missing arguments to function! Expected 6");
    if (parsers.length > 0) {
      let modifiers = [];
      for (const parser of parsers) {
        if (IsTypeOf.InlineParserClass(parser)) {
          let result = parser.parse(text, CHAR_MAP, char_map_line, char_map_idx, options);
          if (result == void 0) throw Error(`[YAMP]: Failed to run function parse_inline(), method parse() of parser ${parser.constructor.name} returned an unexpected value. Expected type Array[InlineParser].`);
          if (result.length === 0) continue;
          for (const res of result) {
            if (!(res instanceof InlineModifer)) throw Error(`[YAMP]: Failed to run function parse_inline(), method parse() of parser ${parser.constructor.name} returned an unexpected value. Expected type Array[InlineParser].`);
          }
          modifiers.push(...result);
        }
      }
      modifiers.sort((a, b) => b.index - a.index);
      for (const modifier of modifiers) {
        text = modifier.apply(text, CHAR_MAP, char_map_line, char_map_idx);
      }
    }
    return text;
  }
  // Render all html from this ast ast_node
  generate(options) {
    return null;
  }
};
var MultilineParser = class _MultilineParser extends SingleLineParser {
  finish() {
  }
  // This medthod is called when the next node isn't a the same node and thus this node is closed
  static try_extend(ast, ...parameters) {
    if (ast.length === 0) return false;
    let prev_ast_node = ast[ast.length - 1];
    if (prev_ast_node instanceof this) {
      return prev_ast_node.extend(...parameters);
    }
    return false;
  }
  static parse_ast(lines, CHAR_MAP, char_map_line, char_map_indices, parsers, options, allow_self = true) {
    let ast = [];
    let last_ast_node = null;
    for (let idx = 0; idx < lines.length; idx++) {
      let line = lines[idx];
      if (line === void 0) continue;
      let char_map_idx = char_map_indices[idx];
      if (char_map_idx === void 0) throw Error("[YAMP] Failed to parse AST, provided parameter char_map_indices doesn't align with the lines. It's to short!");
      const parsed = this.parse_single_line(line, lines, idx, CHAR_MAP, char_map_line + idx, char_map_idx, ast, parsers, options, allow_self);
      if (idx === lines.length - 1) {
        if (parsed instanceof _MultilineParser) {
          parsed.finish();
        } else if (parsed === Parser.EXTEND && last_ast_node instanceof _MultilineParser) {
          last_ast_node.finish();
        }
      }
      if (parsed !== Parser.EXTEND) {
        if (last_ast_node !== null && last_ast_node instanceof _MultilineParser && last_ast_node.constructor !== parsed.constructor) {
          last_ast_node.finish();
        }
        last_ast_node = parsed;
        ast.push(parsed);
        parsed.line_idx = idx;
      }
    }
    return ast;
  }
  static parse_single_line(line, lines, line_idx, CHAR_MAP, char_map_line, char_map_idx, ast, parsers, options, allow_self = false) {
    if (parsers.length > 0) {
      for (const parser of parsers) {
        if (IsTypeOf.SingleLineParserClass(parser)) {
          if (!allow_self && parser.prototype instanceof this) continue;
          CHAR_MAP.cancel_que();
          let parsed = parser.parse(line, lines, line_idx, CHAR_MAP, char_map_line, char_map_idx, ast, parsers, options);
          if (parsed !== null && parsed !== Parser.FAIL) return parsed;
        }
      }
    }
    return Paragraph.parse(line, lines, line_idx, CHAR_MAP, char_map_line, char_map_idx, ast, parsers, options);
  }
  // Extend this ast object with another line, should return true for success and false when extending failed
  extend(...parameters) {
    return false;
  }
};

// src/syntax/standard.ts
var Paragraph = class _Paragraph extends MultilineParser {
  #text;
  constructor(text) {
    super();
    this.#text = `${text}<br>`;
  }
  extend(text) {
    this.#text += `${text}<br>`;
    return true;
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    line = this.parse_inline(line, CHAR_MAP, char_map_line, charmap_idx, parsers, options);
    line = this.escape_text(line, CHAR_MAP, char_map_line, charmap_idx, parsers);
    if (line.length <= 1 && options.add_zero_width_space_for_cursor_positions !== false) {
      line = "\u200B" + line;
      CHAR_MAP.extend_immediately(char_map_line, charmap_idx, 1);
    }
    if (!this.try_extend(ast, line)) {
      return new _Paragraph(line);
    }
    return Parser.EXTEND;
  }
  generate(options) {
    if (options.disable_paragraph_elements) {
      return this.#text;
    } else {
      return `<p>${this.#text}</p>`;
    }
  }
};
var Header = class _Header extends SingleLineParser {
  #text = "";
  #level = 0;
  #id;
  constructor(text, id, level) {
    super();
    this.#text = text;
    this.#level = level;
    this.#id = id;
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    if (line.length === 1 || !line.includes("#")) return Parser.FAIL;
    let start_idx = 0;
    while (line.charAt(start_idx) === " ") {
      CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx, 1);
      start_idx++;
    }
    if (line.charAt(start_idx) !== "#") return Parser.FAIL;
    CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx, 1);
    let heading_level = 1;
    let char = line.charAt(1 + start_idx);
    while (char === "#") {
      CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx + heading_level, 1);
      heading_level++;
      char = line.charAt(heading_level + start_idx);
    }
    if (heading_level === 0) return Parser.FAIL;
    let text = line.slice(heading_level + start_idx + 1);
    let new_charmap_idx = heading_level + start_idx + 1 + charmap_idx;
    if (char !== " " || text.length === 0) return Parser.FAIL;
    CHAR_MAP.que_discard_event(char_map_line, charmap_idx + start_idx + heading_level, 1);
    let id = text;
    text = this.parse_inline(text, CHAR_MAP, char_map_line, new_charmap_idx, parsers, options);
    text = this.escape_text(text, CHAR_MAP, char_map_line, new_charmap_idx, parsers);
    CHAR_MAP.apply_que();
    return new _Header(text, StringHelper.turn_into_ascii(id), heading_level);
  }
  static register_escape_chars() {
    return "#";
  }
  generate(options) {
    return `<h${this.#level} id="header-${this.#id}">${this.#text}${options.enable_trailing_linebreaks ? "<br>" : ""}</h${this.#level}>`;
  }
};
var AlternateHeader = class _AlternateHeader extends MultilineParser {
  #text;
  #id;
  #level;
  #complete = false;
  static PRIORITY = 15;
  get is_complete() {
    return this.#complete;
  }
  constructor(text, id, level) {
    super();
    this.#text = text;
    this.#level = level;
    this.#id = id;
  }
  extend() {
    this.#complete = true;
    return true;
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    let prev_ast_node = line_idx > 0 ? ast[ast.length - 1] : null;
    if (line.length <= 1) return Parser.FAIL;
    if (prev_ast_node instanceof _AlternateHeader && !prev_ast_node.is_complete) {
      CHAR_MAP.discard_immediately(char_map_line, charmap_idx, line.length);
      prev_ast_node.extend();
      return Parser.EXTEND;
    }
    let next_line = line_idx < all_lines.length - 1 ? all_lines[line_idx + 1]?.trim() : "";
    if (next_line === void 0) return Parser.FAIL;
    let first_char = next_line.charAt(0);
    let last_char = next_line.charAt(0);
    if (!(first_char === "=" || first_char === "-") || !(last_char === "=" || last_char === "-") || next_line.length < 2) return Parser.FAIL;
    let success = true;
    let level = -1;
    for (let i = 0; i < next_line.length; i++) {
      let char = next_line.charAt(i);
      if (char === "=" && level === -1) {
        level = 1;
      } else if (char === "-" && level === -1) {
        level = 2;
      } else if (level === 1 && char !== "=" || level === 2 && char !== "-") {
        success = false;
        return Parser.FAIL;
      }
    }
    line = this.parse_inline(line, CHAR_MAP, char_map_line, charmap_idx, parsers, options);
    line = this.escape_text(line, CHAR_MAP, char_map_line, charmap_idx, parsers);
    if (success && level > 0) {
      return new _AlternateHeader(line, StringHelper.turn_into_ascii(line), level);
    }
    return Parser.FAIL;
  }
  register_escape_chars() {
    return "-=";
  }
  generate(options) {
    return `<h${this.#level} id="header-${this.#id}">${this.#text}<br></h${this.#level}>`;
  }
};
var BlockQuote = class _BlockQuote extends MultilineParser {
  #lines = [];
  #parsers = [];
  #options;
  #ast = [];
  CHAR_MAP;
  char_map_indices = [];
  char_map_line;
  constructor(text, CHAR_MAP, char_map_line, char_map_idx, parsers, options) {
    super();
    this.#lines.push(text);
    this.#parsers = parsers;
    this.#options = options;
    this.CHAR_MAP = CHAR_MAP;
    this.char_map_indices.push(char_map_idx);
    this.char_map_line = char_map_line;
  }
  extend(text, char_map_idx) {
    this.#lines.push(text);
    this.char_map_indices.push(char_map_idx);
    return true;
  }
  finish() {
    this.#ast = _BlockQuote.parse_ast(this.#lines, this.CHAR_MAP, this.char_map_line, this.char_map_indices, this.#parsers, this.#options);
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    if (line.length === 0 || !line.includes(">")) {
      return Parser.FAIL;
    }
    let start_idx = 0;
    while (line.charAt(start_idx) === " ") {
      start_idx++;
    }
    if (line.charAt(start_idx) !== ">") {
      return Parser.FAIL;
    }
    let blockquote_depth = 1;
    let char = line.charAt(1 + start_idx);
    while (char === ">") {
      blockquote_depth++;
      char = line.charAt(blockquote_depth + start_idx);
    }
    if (blockquote_depth === 0 || char !== " ") {
      return Parser.FAIL;
    }
    let new_charmap_idx = start_idx + 1 + charmap_idx;
    CHAR_MAP.que_discard_event(char_map_line, start_idx + charmap_idx, 1);
    let text = line.slice(start_idx + blockquote_depth === 1 ? 2 : 1);
    if (blockquote_depth === 1) {
      CHAR_MAP.que_discard_event(char_map_line, start_idx + charmap_idx + blockquote_depth, 1);
      new_charmap_idx++;
    }
    if (text.length === 0) {
      return Parser.FAIL;
    }
    CHAR_MAP.apply_que();
    if (!this.try_extend(ast, text, new_charmap_idx)) {
      return new _BlockQuote(text, CHAR_MAP, char_map_line, new_charmap_idx, parsers, options);
    }
    return Parser.EXTEND;
  }
  static register_escape_chars() {
    return ">";
  }
  generate(options) {
    console.log("BLOCK QUOTE AST:", this.#ast);
    let out = "<blockquote>";
    for (const ast_ast_node of this.#ast) {
      out += `${ast_ast_node.generate(options)}`;
    }
    out += "</blockquote>";
    return out;
  }
};
var Emphasis = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("*")) return [];
    let modifiers = [];
    let start = 0;
    let opening_count = 0;
    let closing_count = 0;
    for (let i = 0; i < input.length; i++) {
      let char = input.charAt(i);
      let prev_char = input.charAt(i - 1);
      if (char === "*") {
        if (prev_char === "\\") {
          opening_count = 0;
          start = 0;
          closing_count = 0;
          continue;
        }
        if (prev_char === "*" && closing_count === 0 || opening_count === 0) {
          if (opening_count === 0) start = i;
          opening_count++;
        } else if (opening_count > 0 && closing_count < 3) {
          closing_count++;
        }
      }
      if (closing_count > 0 && (char !== "*" || i === input.length - 1) || opening_count === closing_count && opening_count > 0 || closing_count >= 3) {
        let final_count = Math.min(opening_count, closing_count, 3);
        let start_pos = start + Math.max(0, opening_count - final_count);
        let end_pos = i - Math.max(0, closing_count - final_count);
        if (char !== "*") end_pos -= 1;
        if (final_count === 1) {
          modifiers.push(InlineModifer.new_replace(start_pos, final_count, "<em>", true));
          modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, "</em>", true));
        } else if (final_count === 2) {
          modifiers.push(InlineModifer.new_replace(start_pos, final_count, "<strong>", true));
          modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, "</strong>", true));
        } else if (final_count >= 3) {
          modifiers.push(InlineModifer.new_replace(start_pos, final_count, "<em><strong>", true));
          modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, "</strong></em>", true));
        }
        opening_count = 0;
        closing_count = 0;
      }
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "*";
  }
};
var UnderscoreEmphasis = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("_")) return [];
    let modifiers = [];
    let out = input;
    let start = 0;
    let opening_count = 0;
    let closing_count = 0;
    let after_word = false;
    for (let i = 0; i < input.length; i++) {
      let char = input.charAt(i);
      let prev_char = input.charAt(i - 1);
      let next_char = input.charAt(i + 1);
      if (char === "_" && prev_char !== "\\") {
        if (prev_char === "_" && closing_count === 0 || opening_count === 0) {
          if (opening_count === 0) {
            start = i;
            if (StringHelper.is_text_char(prev_char) && options.literal_mid_word_underscores) after_word = true;
          }
          if (after_word && StringHelper.is_text_char(next_char)) {
            opening_count = 0;
            after_word = false;
          } else {
            opening_count++;
          }
        } else if (opening_count > 0) {
          if (closing_count === 0 && StringHelper.is_text_char(prev_char) && options.literal_mid_word_underscores) after_word = true;
          if (after_word && StringHelper.is_text_char(next_char)) {
            opening_count = 0;
            closing_count = 0;
            after_word = false;
          }
          closing_count++;
        }
      }
      if (closing_count > 0 && (char !== "_" || i === input.length - 1) || opening_count === closing_count && opening_count > 0 || closing_count >= 3) {
        let lookahead = i + 1;
        while (input.charAt(lookahead) === "_" && lookahead < input.length) {
          lookahead++;
        }
        if (!after_word || !StringHelper.is_text_char(input.charAt(lookahead))) {
          let final_count = Math.min(opening_count, closing_count, 3);
          let start_pos = start + Math.max(0, opening_count - final_count);
          let end_pos = i - Math.max(0, closing_count - final_count);
          if (char !== "_") end_pos -= 1;
          if (final_count === 1) {
            modifiers.push(InlineModifer.new_replace(start_pos, final_count, "<em>", true));
            modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, "</em>", true));
          } else if (final_count === 2) {
            modifiers.push(InlineModifer.new_replace(start_pos, final_count, "<strong>", true));
            modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, "</strong>", true));
          } else if (final_count >= 3) {
            modifiers.push(InlineModifer.new_replace(start_pos, final_count, "<em><strong>", true));
            modifiers.push(InlineModifer.new_replace(end_pos - final_count + 1, final_count, "</strong></em>", true));
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
};
var List = class _List extends MultilineParser {
  #items = [];
  #stack = [];
  // Used during generation
  constructor(text, intend_count, number, is_ordered) {
    super();
    this.#items.push({
      "text": text,
      "intend": intend_count,
      "is_ordered": is_ordered,
      "number": number
    });
  }
  extend(text, intend_count, number, is_ordered) {
    let last_item = this.#items[this.#items.length - 1];
    if (!last_item) return false;
    if (intend_count !== 0 || last_item.is_ordered === is_ordered) {
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
  static is_list_char(c) {
    if (c.length !== 1) return false;
    switch (c) {
      case "*":
      case "-":
      case "+":
        return true;
      default:
        return false;
    }
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    let intend_count = 0;
    while (StringHelper.is_whitespace(line.charAt(intend_count))) {
      CHAR_MAP.que_discard_event(char_map_line, intend_count + charmap_idx, 1);
      intend_count++;
    }
    let is_ordered = StringHelper.is_number(line.charAt(intend_count));
    let number_count = 0;
    if (is_ordered) {
      while (StringHelper.is_number(line.charAt(number_count + intend_count))) {
        CHAR_MAP.que_discard_event(char_map_line, intend_count + number_count + charmap_idx, 1);
        number_count++;
      }
      if (number_count === 0 || line.charAt(intend_count + number_count) !== ".") return Parser.FAIL;
    } else if (!this.is_list_char(line.charAt(intend_count))) {
      return Parser.FAIL;
    }
    CHAR_MAP.que_discard_event(char_map_line, intend_count + number_count + charmap_idx, 1);
    if (!StringHelper.is_whitespace(line.charAt(intend_count + number_count + 1))) return Parser.FAIL;
    CHAR_MAP.que_discard_event(char_map_line, intend_count + number_count + 1 + charmap_idx, 1);
    let number = Number(line.slice(intend_count, intend_count + number_count));
    let text = line.slice(intend_count + number_count + 2);
    if (text.length === 0) return Parser.FAIL;
    let new_charmap_idx = intend_count + number_count + 2 + charmap_idx;
    text = this.parse_inline(text, CHAR_MAP, char_map_line, new_charmap_idx, parsers, options);
    CHAR_MAP.apply_que();
    if (!this.try_extend(ast, text, intend_count, number, is_ordered)) {
      return new _List(text, intend_count, number, is_ordered);
    }
    return Parser.EXTEND;
  }
  static register_escape_chars() {
    return "*-+.";
  }
  get prev_item() {
    if (this.#stack.length === 0) return { "intend": -1, "is_ordered": null };
    let last_item = this.#stack[this.#stack.length - 1];
    if (!last_item) return { "intend": -1, "is_ordered": null };
    return last_item;
  }
  generate(options) {
    let out = "";
    let normalized_intend = [];
    for (const item of this.#items) {
      if (!normalized_intend.includes(item.intend)) {
        normalized_intend.push(item.intend);
      }
    }
    normalized_intend.sort();
    this.#stack = [];
    for (const item of this.#items) {
      let intend = normalized_intend.indexOf(item.intend);
      let prev_item = this.prev_item;
      while (prev_item && prev_item.intend > intend) {
        if (prev_item.is_ordered === null) throw Error("Failed to find ordering whilst closing list.");
        if (prev_item.is_ordered) {
          out += "</ol>";
        } else {
          out += "</ul>";
        }
        this.#stack.pop();
        prev_item = this.prev_item;
      }
      if (prev_item && prev_item.intend < intend) {
        for (let i = prev_item.intend + 1; i <= intend; i++) {
          if (item.is_ordered) {
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
      if (prev_item.is_ordered !== null && prev_item.is_ordered !== item.is_ordered) {
        if (prev_item.is_ordered) {
          out += "</ol>";
        } else {
          out += "</ul>";
        }
        if (item.is_ordered) {
          out += "<ol>";
        } else {
          out += "<ul>";
        }
        let last_item = this.#stack[this.#stack.length - 1];
        if (last_item) last_item.is_ordered = item.is_ordered;
      }
      if (item.text && item.text.length > 0) out += `<li>${item.text}${options.enable_trailing_linebreaks ? "<br>" : ""}</li>`;
    }
    for (let i = this.prev_item.intend; i >= 0; i--) {
      let is_ordered = this.#stack[i]?.is_ordered;
      if (is_ordered === null) throw Error("Failed to close list, stack is too short");
      if (is_ordered) {
        out += "</ol>";
      } else {
        out += "</ul>";
      }
    }
    return out;
  }
};
var Code = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("`")) return [];
    let backticks = [];
    let count = 0;
    let modifiers = [];
    for (let i = 0; i < input.length; i++) {
      if (input.charAt(i) === "`" && input.charAt(i - 1) !== "\\") {
        let start = i;
        i++;
        count = 1;
        while (input.charAt(i) === "`") {
          count++;
          i++;
          if (count >= 3) continue;
        }
        backticks.push({
          "count": count,
          "start": start
        });
      }
    }
    if (backticks.length === 0) return [];
    for (let i = 0; i < backticks.length; i++) {
      let backtick = backticks[i];
      if (!backtick) continue;
      let success = false;
      for (let si = i + 1; si < backticks.length; si++) {
        let ending = backticks[si];
        if (!ending) continue;
        if (ending.count === backtick.count) {
          if (backtick.count > 1) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + ending.start + 1, backtick.count - 1);
          if (backtick.count > 1) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + backtick.start + backtick.count - 1, backtick.count - 1);
          modifiers.push(InlineModifer.new_replace(ending.start, backtick.count, "</code>\u200B"));
          modifiers.push(InlineModifer.new_replace(backtick.start, backtick.count, "<code>\u200B"));
          i = si;
          success = true;
          break;
        }
      }
      if (success) continue;
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "`";
  }
};
var Link = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("<") && !input.includes("[")) return [];
    let modifiers = [];
    let link_part_open = 0;
    let link_part_done = 0;
    let text_part_open = 0;
    let link_part = "";
    let text_part = "";
    for (let i = input.length - 1; i >= 0; i--) {
      let char = input.charAt(i);
      let next_char = input.charAt(i - 1);
      if (char === ")" && next_char !== "\\") {
        link_part_open += 1;
        link_part = "";
      } else if (char == "(" && next_char !== "\\" && link_part_open > 0) {
        if (link_part_open > 1) {
          link_part_open -= 1;
          continue;
        }
        link_part_open = 0;
        link_part_done = 1;
      } else if (char === "]" && next_char !== "\\" && link_part_done) {
        text_part_open += 1;
        text_part = "";
      } else if (char === "[" && next_char !== "\\" && link_part_done && text_part_open > 0) {
        if (text_part_open > 1) {
          text_part_open -= 1;
          continue;
        }
        if (next_char === "!") {
          link_part_done = 0;
          link_part_open = 0;
          text_part_open = 0;
          continue;
        }
        text_part_open = 0;
        link_part_done = 0;
        let title_start = -1;
        if (link_part.charAt(link_part.length - 1) === '"') {
          for (let idx = link_part.length - 2; idx >= 0; idx--) {
            if (link_part.charAt(idx) === '"') {
              title_start = idx;
            }
          }
        } else {
          title_start = link_part.length + 1;
        }
        let title = link_part.slice(title_start + 1, link_part.length - 1);
        let link_ = link_part.slice(0, title_start - 1);
        modifiers.push(InlineModifer.new_replace(i, 1, `<a href="${link_}" class="link" title="${title}">`, true));
        modifiers.push(InlineModifer.new_replace(i + text_part.length + 1, 3 + link_part.length, "</a>", true));
      } else if (link_part_done && !text_part_open || (link_part_open || text_part_open) && !(StringHelper.is_valid_char(char) || StringHelper.is_whitespace(char))) {
        link_part_done = 0;
        link_part_open = 0;
        text_part_open = 0;
      } else if (link_part_open) {
        link_part = char + link_part;
      } else if (text_part_open) {
        text_part = char + text_part;
      }
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "[]()<>";
  }
};
var Image = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("!")) return [];
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
    for (let i = input.length - 1; i >= 0; i--) {
      let char = input.charAt(i);
      let next_char = input.charAt(i - 1);
      if (char === ")" && next_char !== "\\") {
        image_part_open = true;
        link_end = i;
        image_part = "";
      } else if (char == "(" && next_char !== "\\" && image_part_open) {
        image_part_open = false;
        image_part_done = true;
      } else if (char === "]" && next_char !== "\\" && image_part_done) {
        text_part_open = true;
        text_part = "";
      } else if (char === "[" && next_char === "!" && image_part_done && text_part_open) {
        text_part_open = false;
        image_part_done = false;
        let title_start = 0;
        if (image_part.charAt(image_part.length - 1) === '"') {
          for (let idx = image_part.length - 2; idx >= 0; idx--) {
            if (image_part.charAt(idx) === '"') {
              title_start = idx;
            }
          }
        } else {
          title_start = image_part.length + 1;
        }
        let title = image_part.slice(title_start + 1, image_part.length - 1);
        let image_source = image_part.slice(0, title_start - 1);
        modifiers.push(InlineModifer.new_replace(i - 1, text_part.length + image_part.length + 5, `<img src="${image_source}" title="${title}" alt="${text_part}">`, true));
      } else if (image_part_done && !text_part_open || (image_part_open || text_part_open) && !(StringHelper.is_valid_char(char) || StringHelper.is_whitespace(char))) {
        image_part_done = false;
        image_part_open = false;
        text_part_open = false;
      } else if (image_part_open) {
        image_part = char + image_part;
      } else if (text_part_open) {
        text_part = char + text_part;
      }
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "[]()!";
  }
  static PRIORITY = 15;
};
var HorizontalRule = class _HorizontalRule extends SingleLineParser {
  constructor() {
    super();
  }
  static is_horizontal_rule_char(c) {
    if (c.length === 0) return false;
    switch (c) {
      case "*":
      case "-":
      case "_":
        return true;
      default:
        return false;
    }
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    if (line.length <= 3) return Parser.FAIL;
    let selected_char = line.charAt(0);
    if (!this.is_horizontal_rule_char(selected_char)) return Parser.FAIL;
    for (let i = 1; i < line.length - 1; i++) {
      let char = line.charAt(i);
      if (!this.is_horizontal_rule_char(char) || char !== selected_char) {
        return Parser.FAIL;
      }
    }
    CHAR_MAP.discard_immediately(line_idx, charmap_idx, line.length);
    return new _HorizontalRule();
  }
  generate(options) {
    return `<hr>`;
  }
};

// src/syntax/extended.ts
var Table = class _Table extends MultilineParser {
  #aligned = false;
  #rows = [];
  #colums = [];
  get is_aligned() {
    return this.#aligned;
  }
  get column_count() {
    return this.#colums.length;
  }
  constructor(columns) {
    super();
    this.#colums = columns;
  }
  extend(align, row = []) {
    if (align) {
      this.#aligned = true;
    } else {
      this.#rows.push(row);
    }
    return true;
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    let start_idx = 0;
    while (line.charAt(start_idx) === " ") {
      start_idx++;
    }
    if (line.charAt(start_idx) !== "|") return Parser.FAIL;
    let next_line = all_lines[line_idx + 1] ? all_lines[line_idx + 1] : "";
    let prev_node = ast[ast.length - 1];
    let text = "";
    if (prev_node instanceof _Table) {
      if (prev_node.is_aligned) {
        let curr_row = [];
        let cell_count = 0;
        for (let idx = start_idx + 1; idx < line.length - 1; idx++) {
          let char = line.charAt(idx);
          let prev_char = line.charAt(idx - 1);
          if (char === "|" && prev_char !== "\\") {
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
        if (cell_count != prev_node.column_count) return Parser.FAIL;
        CHAR_MAP.discard_immediately(char_map_line, charmap_idx + start_idx, 1);
        CHAR_MAP.discard_immediately(char_map_line, line.length - 1, 1);
        prev_node.extend(false, curr_row);
        return Parser.EXTEND;
      } else {
        prev_node.extend(true);
        return Parser.EXTEND;
      }
    }
    if (!next_line || !next_line.includes("|")) return Parser.FAIL;
    let columns = [];
    let column_idx = 0;
    for (let idx = start_idx + 1; idx < line.length; idx++) {
      let char = line.charAt(idx);
      let prev_char = line.charAt(idx - 1);
      if (char === "|" && prev_char !== "\\") {
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
    if (columns.length === 0 || !next_line.includes("-") || !next_line.startsWith("|")) return Parser.FAIL;
    text = "";
    for (let idx = 1; idx < next_line.length - 1; idx++) {
      let char = next_line.charAt(idx);
      let prev_char = next_line.charAt(idx - 1);
      if (char === "|" && prev_char !== "\\") {
        if (column_idx >= columns.length) return Parser.FAIL;
        let curr_column = columns[column_idx];
        if (!curr_column) continue;
        if (text.startsWith(":-") && text.endsWith("-:")) {
          curr_column.align = "center";
        } else if (text.startsWith(":-")) {
          curr_column.align = "left";
        } else if (text.endsWith("-:")) {
          curr_column.align = "right";
        }
        column_idx++;
        text = "";
      } else if (!StringHelper.is_valid_char(char)) {
        return Parser.FAIL;
      } else {
        text += char;
      }
    }
    if (column_idx !== columns.length) return Parser.FAIL;
    CHAR_MAP.discard_immediately(char_map_line, charmap_idx + start_idx, 1);
    CHAR_MAP.discard_immediately(char_map_line, line.length - 1, 1);
    CHAR_MAP.discard_immediately(char_map_line + 1, 0, next_line.length);
    return new _Table(columns);
  }
  static register_escape_chars() {
    return "|";
  }
  generate(options) {
    let out = "<table>";
    out += "<thead><tr>";
    for (const column of this.#colums) {
      out += `<td style="text-align: ${column.align}">${column.heading}${options.enable_trailing_linebreaks ? "<br> " : ""}</td>`;
    }
    out += "</tr></thead>";
    out += "<tbody>";
    for (const row of this.#rows) {
      out += "<tr>";
      for (const [idx, cell] of row.entries()) {
        let align = this.#colums[idx]?.align;
        out += `<td style="text-align: ${align}">${cell.text}${options.enable_trailing_linebreaks ? "<br> " : ""}</td>`;
      }
      out += "</tr>";
    }
    out += "</tbody></table>";
    return out;
  }
};
var CodeBlock = class _CodeBlock extends MultilineParser {
  #lines = [];
  #language;
  #ended = false;
  constructor(language) {
    super();
    this.#language = language;
  }
  get is_ended() {
    return this.#ended;
  }
  extend(text, end_block = false) {
    this.#lines.push(text);
    if (end_block) this.#ended = true;
    return true;
  }
  static parse(line, all_lines, line_idx, CHAR_MAP, char_map_line, charmap_idx, ast, parsers, options) {
    let prev_node = ast[ast.length - 1];
    if (prev_node instanceof _CodeBlock && !prev_node.is_ended) {
      if (line.startsWith("```")) {
        CHAR_MAP.discard_immediately(char_map_line, charmap_idx, line.length);
        prev_node.extend("", true);
      } else {
        let text = "";
        for (let i = 0; i < line.length - 1; i++) {
          let char = line.charAt(i);
          if (char === "&") {
            text += "&amp";
            continue;
          }
          if (char === "<") {
            text += "&lt;";
            continue;
          }
          if (char === ">") {
            text += "&gt;";
            continue;
          }
          if (char === '"') {
            text += "&quot;";
            continue;
          }
          if (char === "'") {
            text += "&#39;";
            continue;
          }
          text += char;
        }
        prev_node.extend(text);
      }
      return Parser.EXTEND;
    }
    if (line.startsWith("```")) {
      let success = false;
      for (let i = line_idx + 1; i < all_lines.length; i++) {
        if (all_lines[i]?.startsWith("```")) {
          success = true;
          break;
        }
      }
      if (!success) return Parser.FAIL;
      let language = line.slice(3);
      for (let i = 0; i < language.length - 1; i++) {
        if (!StringHelper.is_text_char(language.charAt(i))) return Parser.FAIL;
      }
      CHAR_MAP.discard_immediately(char_map_line, charmap_idx, line.length);
      return new _CodeBlock(language);
    }
    return Parser.FAIL;
  }
  static register_escape_chars() {
    return "`";
  }
  generate(options) {
    let out = `<pre><code class="language-${this.#language}">`;
    for (const [idx, line] of this.#lines.entries()) {
      if (idx !== 0) {
        out += "\n";
      }
      out += line;
    }
    out += `</code></pre>`;
    return out;
  }
};
var Strikethrough = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("~")) return [];
    let squiggles = [];
    let count = 0;
    let modifiers = [];
    for (let i = 0; i < input.length; i++) {
      if (input.charAt(i) === "~") {
        let start = i;
        i++;
        count = 1;
        while (input.charAt(i) === "~") {
          count++;
          i++;
          if (count >= 3) continue;
        }
        if (count !== 2) continue;
        squiggles.push({
          "count": count,
          "start": start
        });
      }
    }
    if (squiggles.length === 0) return [];
    for (let i = 0; i < squiggles.length; i++) {
      let squiggle = squiggles[i];
      if (!squiggle) continue;
      let success = false;
      for (let si = i + 1; si < squiggles.length; si++) {
        let ending = squiggles[si];
        if (!ending) continue;
        if (ending.count === squiggle.count) {
          modifiers.push(InlineModifer.new_replace(ending.start, squiggle.count, "</s>", true));
          modifiers.push(InlineModifer.new_replace(squiggle.start, squiggle.count, "<s>", true));
          i = si;
          success = true;
          break;
        }
      }
      if (success) continue;
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "~";
  }
};

// src/syntax/finalize.ts
var EscapeIncompleteHtml = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx) {
    let modifiers = [];
    let stack = [];
    let is_closing = false;
    let is_inside_tag = false;
    let is_html_attributes = false;
    let invalid_attributes = false;
    let attributes_double_quotes_open = false;
    let attributes_single_quotes_open = false;
    for (let i = 0; i < input.length; i++) {
      let curr_char = input.charAt(i);
      let prev_char = input.charAt(i - 1);
      if (curr_char === "<" && prev_char !== "\\") {
        if (is_inside_tag) {
          let last = stack[stack.length - 1];
          if (last !== void 0) stack.unshift(last);
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
      } else if (is_inside_tag && curr_char === "/" && prev_char === "<") {
        let last = stack[stack.length - 1];
        is_closing = true;
        if (last !== void 0) last.full_text += "/";
      } else if (is_inside_tag && curr_char === " ") {
        let last = stack[stack.length - 1];
        if (last !== void 0) last.full_text += " ";
        is_html_attributes = true;
      } else if (is_inside_tag && curr_char === ">" && prev_char !== "\\") {
        let last = stack[stack.length - 1];
        if (last === void 0) continue;
        last.got_closing_bracket = 1;
        last.invalid_attributes = invalid_attributes || attributes_double_quotes_open || attributes_single_quotes_open;
        if (is_closing) {
          if (stack.length < 2 || stack[stack.length - 2]?.html_tag !== stack[stack.length - 1]?.html_tag) {
            let found_idx = null;
            for (let idx = stack.length - 3; idx >= 0; idx--) {
              if (stack[idx]?.html_tag === stack[stack.length - 1]?.html_tag) {
                found_idx = idx;
                break;
              }
            }
            if (found_idx === null) {
              let curr_tag = stack[stack.length - 1];
              if (!curr_tag) continue;
              modifiers.push(InlineModifer.new_replace(curr_tag.start_location, 1, "&lt;"));
              modifiers.push(InlineModifer.new_replace(curr_tag.start_location + curr_tag.full_text.length + 1, 1, "&gt;"));
              stack.splice(stack.length - 1, 1);
            } else {
              if (stack[found_idx]?.invalid_attributes) {
                stack.unshift(stack[found_idx]);
                stack.unshift(stack[stack.length - 1]);
                stack.splice(found_idx, 1);
                stack.splice(stack.length - 1, 1);
              } else {
                let opening = stack[found_idx];
                let closing = stack[stack.length - 1];
                if (!opening || !closing) continue;
                CHAR_MAP.discard_immediately(char_map_line, opening.start_location, opening.full_text.length + 2);
                CHAR_MAP.discard_immediately(char_map_line, closing.start_location, closing.full_text.length + 2);
                stack.splice(found_idx, 1);
                stack.splice(stack.length - 1, 1);
              }
            }
          } else {
            if (stack[stack.length - 2]?.invalid_attributes === true) {
              stack.unshift(stack[stack.length - 1]);
              stack.unshift(stack[stack.length - 2]);
              stack.splice(stack.length - 2, 2);
            } else {
              let opening = stack[stack.length - 2];
              let closing = stack[stack.length - 1];
              if (!opening || !closing) continue;
              CHAR_MAP.discard_immediately(char_map_line, opening.start_location, opening.full_text.length + 2);
              CHAR_MAP.discard_immediately(char_map_line, closing.start_location, closing.full_text.length + 2);
              stack.splice(stack.length - 2, 2);
            }
          }
        } else {
          switch (stack[stack.length - 1]?.html_tag) {
            // html void tags shouldn't be added to the stack
            case "br":
            case "hr":
            case "img":
            case "wbr":
            case "source":
            case "track":
              let tag = stack[stack.length - 1];
              if (!tag) break;
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
      } else if (is_inside_tag) {
        let last = stack[stack.length - 1];
        if (is_html_attributes) {
          if (!StringHelper.is_whitespace(curr_char) && !StringHelper.is_valid_char(curr_char)) {
            invalid_attributes = true;
          }
          if (curr_char === '"' && !attributes_single_quotes_open) {
            if (attributes_double_quotes_open) {
              attributes_double_quotes_open = false;
            } else {
              attributes_double_quotes_open = true;
            }
          }
          if (curr_char === "'" && !attributes_double_quotes_open) {
            if (attributes_single_quotes_open) {
              attributes_single_quotes_open = false;
            } else {
              attributes_single_quotes_open = true;
            }
          }
        } else {
          if (last !== void 0) last.html_tag += curr_char;
        }
        if (last !== void 0) last.full_text += curr_char;
      }
    }
    stack.sort((a, b) => a !== void 0 && b !== void 0 ? b.start_location - a.start_location : 0);
    for (const entry of stack) {
      if (entry) modifiers.push(InlineModifer.new_replace(entry.start_location, 1, "&lt;"));
      if (entry && entry.got_closing_bracket) modifiers.push(InlineModifer.new_replace(entry.start_location + entry.full_text.length + 1, 1, "&gt;"));
    }
    for (let i = 0; i < input.length; i++) {
      let char = input.charAt(i);
      if (char === "&") {
        let success = false;
        for (let si = i + 1; si < input.length; si++) {
          let search_char = input.charAt(si);
          let prev_search_char = input.charAt(si);
          if (search_char === ";" && prev_search_char !== "\\") {
            success = true;
            if (this.verify_html_entity(input.slice(i, si + 1))) {
              CHAR_MAP.discard_immediately(char_map_line, char_map_idx + i + 1, si - i);
            }
            break;
          }
        }
        if (!success) {
          modifiers.push(InlineModifer.new_replace(i, 1, "&amp;"));
        }
      }
    }
    for (let i = 0; i < input.length; i++) {
      let prev_char = input.charAt(i - 1);
      if (prev_char === "\\") {
        switch (input.charAt(i)) {
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
  // Ehh I think this is a cool solution I came up with
  static verify_html_entity(html_entity) {
    let elem = document.createElement("textarea");
    elem.innerHTML = html_entity;
    return elem.value !== html_entity;
  }
  static register_escape_chars() {
    return ";";
  }
};

// src/syntax/infill.ts
var Color = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("]") || !input.includes("[") || !input.includes("|")) return [];
    let modifiers = [];
    let color_start = 0;
    let color_opened = false;
    let color_done = false;
    let color_end = 0;
    for (let i = 0; i < input.length; i++) {
      let char = input.charAt(i);
      if (char === "[") {
        color_start = i;
        color_opened = true;
      } else if (char === "|" && color_opened) {
        color_end = i;
        color_done = true;
      } else if (char === "]" && color_done && color_opened) {
        let color_part = input.slice(color_start + 1, color_end);
        modifiers.push(InlineModifer.new_replace(color_start, color_end - color_start + 1, `<span style="color: ${color_part};">`, true));
        modifiers.push(InlineModifer.new_replace(i, 1, "</span>", true));
      } else if (color_opened && !color_done && !StringHelper.is_text_char(char) && char !== "#") {
        color_opened = false;
      }
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "[|]";
  }
};
var Highlight = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("^")) return [];
    let backticks = [];
    let count = 0;
    let modifiers = [];
    for (let i = 0; i < input.length; i++) {
      if (input.charAt(i) === "^" && input.charAt(i - 1) !== "\\") {
        let start = i;
        i++;
        count = 1;
        while (input.charAt(i) === "^") {
          count++;
          i++;
          if (count >= 3) continue;
        }
        backticks.push({
          "count": count,
          "start": start
        });
      }
    }
    if (backticks.length === 0) return [];
    for (let i = 0; i < backticks.length; i++) {
      let backtick = backticks[i];
      if (!backtick) continue;
      let success = false;
      for (let si = i + 1; si < backticks.length; si++) {
        let ending = backticks[si];
        if (!ending) continue;
        if (ending.count === backtick.count) {
          if (backtick.count > 1) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + ending.start + 1, backtick.count - 1);
          if (backtick.count > 1) CHAR_MAP.discard_immediately(char_map_line, char_map_idx + backtick.start + backtick.count - 1, backtick.count - 1);
          modifiers.push(InlineModifer.new_replace(ending.start, backtick.count, "</mark>\u200B"));
          modifiers.push(InlineModifer.new_replace(backtick.start, backtick.count, "<mark>\u200B"));
          i = si;
          success = true;
          break;
        }
      }
      if (success) continue;
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "^";
  }
};
var Underlined = class extends InlineParser {
  static parse(input, CHAR_MAP, char_map_line, char_map_idx, options) {
    if (!input.includes("=")) return [];
    let equal_signs = [];
    let count = 0;
    let modifiers = [];
    for (let i = 0; i < input.length; i++) {
      if (input.charAt(i) === "=") {
        let start = i;
        i++;
        count = 1;
        while (input.charAt(i) === "=") {
          count++;
          i++;
          if (count >= 3) continue;
        }
        if (count !== 2) continue;
        equal_signs.push({
          "count": count,
          "start": start
        });
      }
    }
    if (equal_signs.length === 0) return [];
    for (let i = 0; i < equal_signs.length; i++) {
      let squiggle = equal_signs[i];
      if (!squiggle) continue;
      let success = false;
      for (let si = i + 1; si < equal_signs.length; si++) {
        let ending = equal_signs[si];
        if (!ending) continue;
        if (ending.count === squiggle.count) {
          modifiers.push(InlineModifer.new_replace(ending.start, squiggle.count, "</u>", true));
          modifiers.push(InlineModifer.new_replace(squiggle.start, squiggle.count, "<u>", true));
          i = si;
          success = true;
          break;
        }
      }
      if (success) continue;
    }
    return modifiers;
  }
  static register_escape_chars() {
    return "=";
  }
};

// src/main.ts
var default_options = {
  "enabled_features": [
    // All enabled syntax features
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
    EscapeIncompleteHtml
    // Tbh you shouldn't really disable this one since that will f*ck up your charmap when the md contains html
  ],
  "disable_paragraph_elements": false,
  // Parse paragraphs without adding the <p> elements
  "literal_mid_word_underscores": true,
  // Make sure words like hello_world_stuff stay literal and don't become italic
  "add_zero_width_space_for_cursor_positions": true,
  // Insert zero-width-spaces to differenciate between before and after styling. Useful for carret positions
  "enable_trailing_linebreaks": true,
  // Put a linebreak at the end of every line, even <h1>text<br></h1>. This is also useful for carret position
  "finalize_spaces": true
  // Determines wheter spaces will be replaced with &nbsp; so they always show a difference
};
var final_options;
var parsers_sorted;
function set_options(options) {
  final_options = {};
  for (const [option, value] of Object.entries(default_options)) {
    if (options[option] !== void 0) {
      final_options[option] = options[option];
    } else {
      final_options[option] = default_options[option];
    }
  }
  verify_options(final_options);
  if (!final_options.enabled_features) return;
  parsers_sorted = final_options.enabled_features.sort((a, b) => b.PRIORITY - a.PRIORITY);
  clear_cache();
}
function parse(text) {
  console.log("CACHE", structuredClone(cache));
  if (!final_options) set_options(default_options);
  console.log("CACHE", structuredClone(cache));
  let lines = parse_to_lines(text);
  console.log("CACHE", structuredClone(cache));
  let cached = parse_cache(lines, final_options);
  console.log("CACHED:", cached);
  let CHAR_MAP = CharMap.from_cache(lines, cached);
  const ast = gen_ast(lines, cached, CHAR_MAP, parsers_sorted, final_options);
  const html = process_ast(ast, cached, CHAR_MAP, parsers_sorted, final_options);
  console.log("AST:", ast);
  cache_char_map(CHAR_MAP);
  console.log("CACHE", structuredClone(cache));
  return {
    "html": html,
    "char_map": CHAR_MAP.absolute_map()
  };
}
function parse_to_lines(text) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
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
function gen_ast(lines, cached, CHAR_MAP, parsers, options) {
  for (const parser of parsers) {
    parser.init();
  }
  let ast = [];
  let last_ast_node = null;
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    let curr_entry = cached.entries[idx];
    if (!curr_entry || !line) continue;
    if (curr_entry.type === "node") {
      if (!curr_entry.output) throw Error("[YAMP]: Cached AST node doesn't have a valid output!");
      ast.push({ "type": "cached", "output": curr_entry.output, "line_idx": idx });
      if (curr_entry.line_count) idx += curr_entry.line_count - 1;
      continue;
    }
    const parsed = parse_single_line(line, CHAR_MAP, lines, idx, ast, parsers, options);
    if (idx === lines.length - 1) {
      if (parsed instanceof MultilineParser) {
        parsed.finish();
      } else if (parsed === Parser.EXTEND && last_ast_node instanceof MultilineParser) {
        last_ast_node.finish();
      }
    }
    if (parsed !== Parser.EXTEND) {
      if (last_ast_node !== null && last_ast_node instanceof MultilineParser && last_ast_node.constructor !== parsed.constructor) {
        console.log(last_ast_node);
        console.log(parsed);
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
function parse_single_line(line, CHAR_MAP, lines, idx, ast, parsers, options) {
  if (parsers.length > 0) {
    for (const parser of parsers) {
      if (IsTypeOf.SingleLineParserClass(parser) || IsTypeOf.MultilineParserClass(parser)) {
        CHAR_MAP.cancel_que();
        let parsed = parser.parse(line, lines, idx, CHAR_MAP, idx, 0, ast, parsers, options);
        if (parsed === null) throw new Error(`[YAMP]: Failed to build ast, parser ${parser} doesn't implement required method parse()!`);
        if (parsed !== Parser.FAIL) return parsed;
      }
    }
  }
  return Paragraph.parse(line, lines, idx, CHAR_MAP, idx, 0, ast, parsers, options);
}
function process_ast(ast, cached, CHAR_MAP, parsers, options) {
  let out = "";
  for (let i = 0; i < ast.length; i++) {
    let node = ast[i];
    let segment;
    if (!node) continue;
    if (IsTypeOf.cachedAstNode(node)) {
      segment = node.output;
    } else {
      segment = node.generate(options);
      if (!segment) continue;
      if (options.finalize_spaces !== false) segment = finalize_spaces(segment);
      cache_output(node.line_idx, segment);
    }
    if (segment == null) throw new Error(`[YAMP]: Failed to generate output, parser ${node.constructor.name} doesn't implement required method generate()!`);
    out += segment;
  }
  return out;
}
var cache = {
  "entries": [],
  "char_map": []
};
function clear_cache() {
  cache = {
    "entries": [],
    "char_map": []
  };
}
function parse_cache(lines, options) {
  let output = cache.entries.slice(0, lines.length);
  let char_map = cache.char_map.slice(0, lines.length);
  let prev_node_idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (cache.entries.length <= i) {
      output[i] = { "type": "parse_again" };
      char_map[i] = null;
    }
    let entry = cache.entries[i];
    if (!(entry && entry.type !== "parse_again" && entry.input && lines[i] === entry.input)) {
      if (!entry || entry.type !== "extend") {
        output[i] = { "type": "parse_again" };
        char_map[i] = null;
      }
      if (prev_node_idx >= 0) {
        let line_idx = prev_node_idx;
        console.log(line_idx, i);
        while (entry && entry.type === "extend" || line_idx < i) {
          output[line_idx] = { "type": "parse_again" };
          char_map[line_idx] = null;
          line_idx++;
          entry = cache.entries[line_idx];
        }
        entry = cache.entries[i];
        console.log(line_idx, i);
      }
    }
    if (entry && entry.type === "node") prev_node_idx = i;
  }
  if (cache.entries.length < lines.length) cache.entries = new Array(lines.length);
  return {
    "entries": output,
    "char_map": char_map
  };
}
var last_node_idx = 0;
function cache_ast_node(line_idx, input, parsed) {
  if (parsed === Parser.EXTEND && cache && cache.entries.length > 0) {
    let last_node = cache.entries[last_node_idx];
    if (last_node && last_node.type === "node") last_node.line_count = last_node.line_count ? last_node.line_count + 1 : 1;
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
function cache_output(line_idx, output) {
  let entry = cache.entries[line_idx];
  if (!entry || entry.type !== "node") return console.warn("Whoops an extend line somehow got a corresponding output.");
  entry.output = output;
}
function cache_char_map(char_map) {
  cache.char_map = char_map.get_copy();
}
function finalize_spaces(input) {
  let inside_html = false;
  let out = "";
  for (let i = 0; i < input.length; i++) {
    let char = input.charAt(i);
    if (char === "<") {
      for (let si = i; si < input.length; si++) {
        if (input.charAt(si) === ">") {
          out += input.slice(i, si);
          i = si - 1;
          break;
        }
      }
    } else if (char === " ") {
      out += "&nbsp;";
    } else {
      out += char;
    }
  }
  return out;
}
function verify_options(options) {
  if (!(options.enabled_features instanceof Array)) {
    throw new Error("[Markdown]: failed to parse, invalid options! Field 'enabled_features' must be of type array");
  }
  for (const parser of options.enabled_features) {
    if (!(parser.prototype instanceof Parser)) throw Error(`[Markdown]: Parser entries must be instance of Parser but found: ${parser}`);
  }
  if (options.disable_paragraph_elements !== true && options.disable_paragraph_elements !== false) {
    throw new Error("[Markdown]: failed to parse, invalid options! Field 'disable_paragraph_elements' must be of type boolean");
  }
  if (options.add_zero_width_space_for_cursor_positions !== true && options.add_zero_width_space_for_cursor_positions !== false) {
    throw new Error("[Markdown]: failed to parse, invalid options! Field 'add_zero_width_space_for_cursor_positions' must be of type boolean");
  }
  if (options.enable_trailing_linebreaks !== true && options.enable_trailing_linebreaks !== false) {
    throw new Error("[Markdown]: failed to parse, invalid options! Field 'enable_trailing_linebreaks' must be of type boolean");
  }
  if (options.finalize_spaces !== true && options.finalize_spaces !== false) {
    throw new Error("[Markdown]: failed to parse, invalid options! Field 'finalize_spaces' must be of type boolean");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AlternateHeader,
  BlockQuote,
  CharMap,
  Code,
  CodeBlock,
  Color,
  Emphasis,
  EscapeIncompleteHtml,
  Header,
  Highlight,
  HorizontalRule,
  Image,
  InlineModifer,
  InlineParser,
  IsTypeOf,
  Link,
  List,
  MultilineParser,
  Paragraph,
  Parser,
  SingleLineParser,
  Strikethrough,
  StringHelper,
  Table,
  Underlined,
  UnderscoreEmphasis,
  default_options,
  parse,
  set_options
});
