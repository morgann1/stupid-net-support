import { catalogs, describe, encodings, valuesFor, type Entry, type Language } from "./catalog.js";

interface Token {
  value: string;
  kind: "word" | "number" | "symbol" | "string" | "comment";
  start: number;
  end: number;
  closed: boolean;
  frame: Frame;
  after: Frame;
}

interface Declaration {
  keyword: string;
  name: Token;
  start: number;
  end: number;
  scope: string[];
  generics: string[];
  body?: Frame;
}

interface Frame {
  kind: string;
  delimiter: string;
  scope: string[];
  parent?: Frame;
  declaration?: Declaration;
  pending?: Declaration;
  direct: number[];
}

interface Document {
  language: Language;
  source: string;
  root: Frame;
  tokens: Token[];
  ignored: Token[];
  declarations: Declaration[];
  members: Map<string, Map<string, Declaration>>;
  names: Map<number, Declaration>;
  entries: WeakMap<Declaration, Entry>;
}

function lex(source: string, language: Language, root: Frame) {
  const tokens: Token[] = [];
  const ignored: Token[] = [];
  const word = /[A-Za-z_][A-Za-z0-9_]*|-?(?:\d+(?:\.\d+)?|\.\d+)/y;
  let offset = 0;

  while (offset < source.length) {
    if (/\s/.test(source[offset] ?? "")) {
      offset++;
      continue;
    }

    const start = offset;
    let kind: Token["kind"] = "symbol";
    let closed = true;
    const quote = source[offset];

    if (source.startsWith("--", offset)) {
      kind = "comment";
      const opening = (language === "blink" ? /^--\[(=*)\[/ : /^--\[()\[/).exec(
        source.slice(offset),
      );
      if (opening) {
        const closing = `]${opening[1]}]`;
        const end = source.indexOf(closing, offset + opening[0].length);
        closed = end !== -1;
        offset = closed ? end + closing.length : source.length;
      } else {
        const end = source.indexOf("\n", offset);
        offset = end === -1 ? source.length : end;
        closed = false;
      }
    } else if (quote === '"' || quote === "'") {
      kind = "string";
      closed = false;
      offset++;
      while (offset < source.length) {
        if (source[offset] === "\\" && language === "blink") {
          offset = Math.min(offset + 2, source.length);
        } else if (source[offset++] === quote) {
          closed = true;
          break;
        }
      }
    } else if (source.startsWith("..", offset)) {
      offset += 2;
    } else {
      word.lastIndex = offset;
      const match = word.exec(source);
      if (match) {
        kind = /^[A-Za-z_]/.test(match[0]) ? "word" : "number";
        offset = word.lastIndex;
      } else {
        offset++;
      }
    }

    const token = {
      value: source.slice(start, offset),
      kind,
      start,
      end: offset,
      closed,
      frame: root,
      after: root,
    };
    if (kind === "comment" || kind === "string") {
      ignored.push(token);
    }
    if (kind !== "comment") {
      tokens.push(token);
    }
  }

  return { tokens, ignored };
}

function isContainer(frame: Frame) {
  return frame.kind === "root" || frame.kind === "scope";
}

function blockKind(tokens: Token[], index: number, frame: Frame, language: Language) {
  const previous = tokens[index - 1]?.value;
  const declaration = frame.pending;
  if (isContainer(frame) && declaration && !declaration.body) {
    if (declaration.keyword === catalogs[language].namespace) {
      return "scope";
    }
    if (declaration.keyword === catalogs[language].function) {
      return "function";
    }
    if (declaration.keyword !== "type") {
      return declaration.keyword;
    }
  }
  if (["struct", "map", "set", "enum"].includes(previous ?? "")) {
    return previous ?? "struct";
  }
  if (tokens[index - 1]?.kind === "string" && tokens[index - 2]?.value === "enum") {
    return "enum";
  }
  return "struct";
}

/** Index declarations and delimiter contexts once per document version, including unfinished input. */
export function parseDocument(language: Language, source: string): Document {
  const root: Frame = { kind: "root", delimiter: "", scope: [], direct: [] };
  const { tokens, ignored } = lex(source, language, root);
  const declarations: Declaration[] = [];
  const catalog = catalogs[language];
  const declarationWords = new Set(catalog.declarations.map((item) => item.label));
  for (const word of [catalog.option, "export", "import"]) {
    declarationWords.delete(word);
  }
  let frame = root;
  let nameIndex = -1;

  for (const [index, token] of tokens.entries()) {
    token.frame = frame;
    frame.direct.push(index);
    const name = tokens[index + 1];
    const next = tokens[index + 2]?.value;

    if (
      index !== nameIndex &&
      isContainer(frame) &&
      declarationWords.has(token.value) &&
      name?.kind === "word" &&
      ["=", "{", "<"].includes(next ?? "")
    ) {
      if (frame.pending) {
        const previous = tokens[index - 1];
        frame.pending.end =
          previous?.value === "export" ? previous.start : (previous?.end ?? token.start);
      }
      const declaration: Declaration = {
        keyword: token.value,
        name,
        start: token.start,
        end: source.length,
        scope: frame.scope,
        generics: [],
      };
      declarations.push(declaration);
      frame.pending = declaration;
      nameIndex = index + 1;
    }

    if (["{", "(", "[", "<"].includes(token.value) && token.kind === "symbol") {
      const previous = tokens[index - 1]?.value ?? "";
      let kind = "tuple";
      if (token.value === "{") {
        kind = blockKind(tokens, index, frame, language);
      } else if (token.value === "[") {
        kind = frame.kind === "map" && previous === "{" ? "mapKey" : "range";
      } else if (token.value === "<") {
        kind = frame.pending?.name === tokens[index - 1] ? "genericParameters" : "typeArguments";
      } else if (
        /^(?:[uif]\d+|string|buffer|Instance)$/.test(previous) ||
        (language === "blink" && previous === "vector")
      ) {
        kind = "range";
      }

      const declaration = isContainer(frame) ? frame.pending : frame.declaration;
      const child: Frame = {
        kind,
        delimiter: token.value,
        scope:
          kind === "scope" && declaration ? [...frame.scope, declaration.name.value] : frame.scope,
        parent: frame,
        declaration,
        direct: [],
      };
      if (token.value === "{" && isContainer(frame) && declaration && !declaration.body) {
        declaration.body = child;
      }
      frame = child;
    } else if (["}", ")", "]", ">"].includes(token.value) && token.kind === "symbol") {
      const opening = { "}": "{", ")": "(", "]": "[", ">": "<" }[token.value];
      if (frame.delimiter === opening && frame.parent) {
        if (frame.pending) {
          frame.pending.end = tokens[index - 1]?.end ?? token.start;
        }
        if (frame.declaration?.body === frame) {
          frame.declaration.end = token.end;
          frame.parent.pending = undefined;
        }
        frame = frame.parent;
      }
    } else if (frame.kind === "genericParameters" && token.kind === "word") {
      frame.declaration?.generics.push(token.value);
    }
    token.after = frame;
  }

  const members = new Map<string, Map<string, Declaration>>();
  const names = new Map<number, Declaration>();
  for (const declaration of declarations) {
    names.set(declaration.name.start, declaration);
    if (declaration.keyword === "event" || declaration.keyword === catalog.function) {
      continue;
    }
    const path = scopeKey(declaration.scope);
    let scope = members.get(path);
    if (!scope) {
      scope = new Map();
      members.set(path, scope);
    }
    scope.set(declaration.name.value, declaration);
    if (declaration.keyword === catalog.namespace) {
      const childPath = scopeKey([...declaration.scope, declaration.name.value]);
      if (!members.has(childPath)) {
        members.set(childPath, new Map());
      }
    }
  }

  return {
    language,
    source,
    root,
    tokens,
    ignored,
    declarations,
    members,
    names,
    entries: new WeakMap(),
  };
}

/** Return the last token starting at or before an offset. */
function tokenIndex(tokens: Token[], offset: number) {
  let low = 0;
  let high = tokens.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((tokens[middle]?.start ?? Infinity) <= offset) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low - 1;
}

function suppressed(document: Document, offset: number, includeOpenEnd: boolean) {
  const token = document.ignored[tokenIndex(document.ignored, offset)];
  return token && (offset < token.end || (includeOpenEnd && offset === token.end && !token.closed));
}

function fieldsFor(document: Document, frame: Frame) {
  const catalog = catalogs[document.language];
  if (frame.kind === "event") {
    return catalog.eventFields;
  }
  if (frame.kind === "function") {
    return catalog.functionFields;
  }
  return undefined;
}

function declarationEntry(document: Document, declaration: Declaration): Entry {
  const cached = document.entries.get(declaration);
  if (cached) {
    return cached;
  }

  const path = [...declaration.scope, declaration.name.value].join(".");
  const end = Math.min(declaration.end, declaration.start + 1200);
  const signature = document.source.slice(declaration.start, end).trim();
  const result: Entry = {
    label: declaration.name.value,
    kind: declaration.keyword === catalogs[document.language].namespace ? "module" : "type",
    documentation: `Declared in this file as ${path}.`,
    signature: end < declaration.end ? `${signature}\n...` : signature,
  };
  document.entries.set(declaration, result);
  return result;
}

function scopeKey(scope: string[]) {
  return scope.join(".");
}

const completionLimit = 200;

function matches(label: string, query: string, exact: boolean) {
  return exact ? label === query : label.toLowerCase().startsWith(query);
}

function matchingMembers(document: Document, path: string, query: string, exact: boolean): Entry[] {
  const members = document.members.get(path);
  if (!members) {
    return [];
  }

  if (exact) {
    const declaration = members.get(query);
    return declaration ? [declarationEntry(document, declaration)] : [];
  }

  const result: Entry[] = [];
  for (const [name, declaration] of members) {
    if (matches(name, query, false)) {
      result.push(declarationEntry(document, declaration));
      if (result.length > completionLimit) {
        break;
      }
    }
  }
  return result;
}

function visibleTypes(document: Document, frame: Frame, query: string, exact: boolean): Entry[] {
  const result = new Map<string, Entry>();
  for (let depth = frame.scope.length; depth >= 0; depth--) {
    // Zap resolves unqualified references in the current namespace; Blink also captures parents.
    if (document.language === "zap" && depth !== frame.scope.length) {
      break;
    }
    const path = scopeKey(frame.scope.slice(0, depth));
    for (const item of matchingMembers(document, path, query, exact)) {
      if (!result.has(item.label)) {
        result.set(item.label, item);
      }
    }
    if (result.size > completionLimit || (exact && result.size > 0)) {
      break;
    }
  }
  for (const name of frame.declaration?.generics ?? []) {
    if (matches(name, query, exact)) {
      result.set(name, {
        label: name,
        documentation: `Type parameter of ${frame.declaration?.name.value}.`,
        kind: "type",
      });
    }
  }
  return [...result.values()];
}

function qualifiedMembers(
  document: Document,
  frame: Frame,
  path: string[],
  query: string,
  exact: boolean,
): Entry[] {
  for (let depth = frame.scope.length; depth >= 0; depth--) {
    if (document.language === "zap" && depth !== frame.scope.length) {
      break;
    }
    const target = scopeKey([...frame.scope.slice(0, depth), ...path]);
    if (document.members.has(target)) {
      return matchingMembers(document, target, query, exact);
    }
  }
  return [];
}

function qualifier(tokens: Token[], index: number) {
  const path: string[] = [];
  while (tokens[index]?.value === "." && tokens[index - 1]?.kind === "word") {
    path.unshift(tokens[index - 1]?.value ?? "");
    index -= 2;
  }
  return path;
}

function typeItems(document: Document, frame: Frame, query: string, exact: boolean) {
  const result = new Map(
    catalogs[document.language].types
      .filter((item) => matches(item.label, query, exact))
      .map((item) => [item.label, item]),
  );
  for (const item of visibleTypes(document, frame, query, exact)) {
    result.set(item.label, item);
  }
  return [...result.values()];
}

function candidates(
  document: Document,
  index: number,
  start: number,
  query: string,
  exact = false,
): Entry[] {
  const { tokens, language } = document;
  const previous = tokens[index];
  const frame = previous?.after ?? document.root;
  const catalog = catalogs[language];
  const before = (distance: number) => tokens[index - distance]?.value;

  if (frame.kind === "range" || frame.kind === "genericParameters") {
    return [];
  }
  if (isContainer(frame) && previous?.value === catalog.option) {
    return catalog.options.map((item) => ({ ...item, insertText: `${item.label} = $0` }));
  }
  if (isContainer(frame) && previous?.value === "=" && before(2) === catalog.option) {
    const option = catalog.options.find((item) => item.label === before(1));
    return option ? valuesFor(option) : [];
  }
  if (previous?.value === ".") {
    const path = qualifier(tokens, index);
    if (language === "zap" && path.join(".") === "string") {
      return encodings;
    }
    return qualifiedMembers(document, frame, path, query, exact);
  }

  const fields = fieldsFor(document, frame);
  if (fields) {
    const direct = frame.direct.filter((item) => (tokens[item]?.start ?? Infinity) < start);
    let comma = -1;
    for (let position = direct.length - 1; position >= 0; position--) {
      if (tokens[direct[position] ?? -1]?.value === ",") {
        comma = position;
        break;
      }
    }
    const segment = direct.slice(comma + 1).map((item) => tokens[item]);
    if (segment.length === 0) {
      const fieldTokens = frame.direct.filter(
        (item) => tokens[item]?.start !== start && tokens[item + 1]?.value === ":",
      );
      const used = new Set(fieldTokens.map((item) => tokens[item]?.value));
      let earliest = 0;
      let latest = fields.length - 1;
      if (language === "zap") {
        for (const index of fieldTokens) {
          const order = fields.findIndex((field) => field.label === tokens[index]?.value);
          if (order < 0) {
            continue;
          }
          if ((tokens[index]?.start ?? Infinity) < start) {
            earliest = Math.max(earliest, order + 1);
          } else {
            latest = Math.min(latest, order - 1);
          }
        }
        if (earliest === 0) {
          latest = Math.min(latest, 0);
        }
      }
      return fields
        .filter((item, order) => !used.has(item.label) && order >= earliest && order <= latest)
        .map((item) => ({ ...item, insertText: `${item.label}: $0` }));
    }
    if (segment[1]?.value === ":" && segment.length === 2) {
      const field = fields.find((item) => item.label === segment[0]?.value);
      return field?.values ? valuesFor(field) : typeItems(document, frame, query, exact);
    }
    return [];
  }

  if (isContainer(frame)) {
    if (previous?.value === "export" && language === "blink") {
      return catalog.declarations.filter((item) =>
        ["type", "struct", "enum", "map", "set"].includes(item.label),
      );
    }
    if (previous?.value === "=" && tokens[index - 2]?.value === "type") {
      return typeItems(document, frame, query, exact);
    }
    if (previous?.value === "=" && ["map", "set", "enum"].includes(before(2) ?? "")) {
      return [];
    }
    const lineBreak = previous && /[\r\n]/.test(document.source.slice(previous.end, start));
    if (
      !previous ||
      previous.value === "}" ||
      previous.value === ";" ||
      previous.after !== previous.frame ||
      lineBreak
    ) {
      const hasDeclaration = document.declarations.some((item) => item.start < start);
      return catalog.declarations.filter(
        (item) => item.label !== catalog.option || (frame.kind === "root" && !hasDeclaration),
      );
    }
    return [];
  }

  if (frame.kind === "struct") {
    return previous?.value === ":" || previous?.value === ".."
      ? typeItems(document, frame, query, exact)
      : [];
  }
  if (frame.kind === "enum" || (frame.kind === "set" && language === "blink")) {
    return [];
  }
  if (frame.kind === "map") {
    return previous?.value === ":" ? typeItems(document, frame, query, exact) : [];
  }
  if (["tuple", "typeArguments", "mapKey", "set"].includes(frame.kind)) {
    return typeItems(document, frame, query, exact);
  }
  return [];
}

/** Complete the word at the cursor and replace its full span, including text after the cursor. */
export function complete(document: Document, offset: number) {
  let token = document.tokens[tokenIndex(document.tokens, offset)];
  if (token?.kind !== "word" && token?.start === offset) {
    token = document.tokens[tokenIndex(document.tokens, offset - 1)];
  }
  const word = token?.kind === "word" && offset <= token.end ? token : undefined;
  const start = word?.start ?? offset;
  const end = word?.end ?? offset;
  if (suppressed(document, offset, true)) {
    return { items: [] as Entry[], start, end, isIncomplete: false };
  }

  const prefix = document.source.slice(start, offset).toLowerCase();
  const items = candidates(document, tokenIndex(document.tokens, start - 1), start, prefix);
  const next = document.tokens[tokenIndex(document.tokens, end - 1) + 1];
  const filtered = items
    .filter((item) => item.label.toLowerCase().startsWith(prefix))
    .map((item) => {
      const hasBody = ["{", "(", "<"].includes(next?.value ?? "");
      const hasFieldValue = item.kind === "property" && [":", "="].includes(next?.value ?? "");
      const hasName = item.kind === "keyword" && (next?.kind === "word" || next?.kind === "string");
      return word && (hasBody || hasFieldValue || hasName)
        ? { ...item, insertText: undefined }
        : item;
    });
  return {
    items: filtered.slice(0, completionLimit),
    start,
    end,
    isIncomplete: filtered.length > completionLimit,
  };
}

/** Explain a token using its option, field, or type context instead of its spelling alone. */
export function hover(document: Document, offset: number) {
  if (suppressed(document, offset, false)) {
    return undefined;
  }
  const index = tokenIndex(document.tokens, offset);
  const token = document.tokens[index];
  if (!token || token.kind !== "word" || offset >= token.end) {
    return undefined;
  }

  const { tokens, language } = document;
  const catalog = catalogs[language];
  const frame = token.frame;
  const previous = tokens[index - 1];
  let item: Entry | undefined;

  if (tokens[index + 1]?.value === ":") {
    item = fieldsFor(document, frame)?.find((field) => field.label === token.value);
  } else if (previous?.value === catalog.option && isContainer(frame)) {
    item = catalog.options.find((option) => option.label === token.value);
  } else if (previous?.value === ".") {
    const path = qualifier(tokens, index - 1);
    const entries =
      language === "zap" && path.join(".") === "string"
        ? encodings
        : qualifiedMembers(document, frame, path, token.value, true);
    item = entries.find((candidate) => candidate.label === token.value);
  } else {
    const declaration = document.names.get(token.start);
    if (declaration) {
      item = declarationEntry(document, declaration);
    } else {
      item = candidates(document, index - 1, token.start, token.value, true).find(
        (candidate) => candidate.label === token.value,
      );
    }
  }

  return item
    ? {
        label: item.label,
        documentation: describe(item),
        signature: item.signature,
        start: token.start,
        end: token.end,
      }
    : undefined;
}
