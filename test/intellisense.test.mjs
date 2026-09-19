import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { complete, hover, parseDocument } from "../dist/service.js";

/** Request completions at the marked cursor in a source file.
 * @param {"zap" | "blink"} language
 * @param {string} source
 */
function suggest(language, source) {
  const offset = source.indexOf("|");
  assert.notEqual(offset, -1);
  const document = parseDocument(language, source.replace("|", ""));
  return complete(document, offset);
}

/** @param {ReturnType<typeof suggest>} result */
function labels(result) {
  return result.items.map((item) => item.label);
}

test("declaration snippets use each library's syntax", () => {
  const zap = suggest("zap", "|");
  const blink = suggest("blink", "|");
  assert.ok(labels(zap).includes("opt"));
  assert.ok(labels(zap).includes("funct"));
  assert.ok(!labels(zap).includes("function"));
  assert.ok(labels(blink).includes("function"));
  assert.ok(!labels(blink).includes("funct"));
  assert.match(zap.items.find((item) => item.label === "event").insertText, /= \{/);
  assert.doesNotMatch(blink.items.find((item) => item.label === "event").insertText, /= \{/);
});

test("option names and values stay specific to each library", () => {
  assert.ok(labels(suggest("zap", "opt |")).includes("server_output"));
  assert.ok(!labels(suggest("zap", "opt |")).includes("ServerOutput"));
  assert.ok(labels(suggest("blink", "option |")).includes("ServerOutput"));
  assert.deepEqual(labels(suggest("zap", "opt write_checks = |")), ["true", "false"]);
  assert.deepEqual(labels(suggest("blink", "option Casing = |")), ["Pascal", "Camel", "Snake"]);
  assert.deepEqual(labels(suggest("zap", "opt casing = |")), [
    '"PascalCase"',
    '"camelCase"',
    '"snake_case"',
  ]);
  assert.deepEqual(labels(suggest("blink", "option ServerOutput = |")), []);
});

test("option completion inserts the assignment and leaves the cursor at its value", () => {
  for (const [language, source, name, values] of [
    ["zap", "opt write_ch|", "write_checks", ["true", "false"]],
    ["blink", "option Cas|", "Casing", ["Pascal", "Camel", "Snake"]],
  ]) {
    const result = suggest(language, source);
    const item = result.items.find((candidate) => candidate.label === name);
    assert.equal(item.insertText, `${name} = $0`);
    const text = source.replace("|", "");
    const inserted =
      text.slice(0, result.start) + item.insertText.replace("$0", "|") + text.slice(result.end);
    assert.deepEqual(labels(suggest(language, inserted)), values);
  }
});

test("completing an existing option preserves its assignment", () => {
  const result = suggest("blink", "option Cas|ing = Camel");
  const item = result.items.find((candidate) => candidate.label === "Casing");
  assert.equal(item.insertText ?? item.label, "Casing");
});

test("event and function values respect the containing declaration", () => {
  assert.deepEqual(labels(suggest("zap", "event Update = { from: |")), ["Server", "Client"]);
  assert.deepEqual(labels(suggest("zap", "funct Query = { call: |")), ["Async", "Sync"]);
  assert.ok(labels(suggest("zap", "event Update = { from: Server, call: |")).includes("ManyAsync"));
  assert.deepEqual(labels(suggest("blink", "function Query { Yield: |")), [
    "Coroutine",
    "Future",
    "Promise",
  ]);
  assert.deepEqual(labels(suggest("blink", "event Update { Poll: |")), ["true", "false"]);
  assert.ok(labels(suggest("zap", "event Update = { type: |")).includes("OrderedUnreliable"));
  assert.ok(!labels(suggest("blink", "event Update { Type: |")).includes("OrderedUnreliable"));
});

test("field suggestions omit fields already present on either side of the cursor", () => {
  assert.deepEqual(labels(suggest("blink", "event Update { From: Server, | Type: Reliable }")), [
    "Call",
    "Poll",
    "Data",
  ]);
  assert.deepEqual(labels(suggest("zap", "funct Query = { call: Async, | }")), ["args", "rets"]);
  assert.deepEqual(labels(suggest("blink", "struct Payload { | }")), []);
});

test("type completions work inside payloads, maps, tuples, and generics", () => {
  for (const source of [
    "type Value = |",
    "type Value = map { [|]: u8 }",
    "event Update = { data: (id: |) }",
  ]) {
    const result = labels(suggest("zap", source));
    assert.ok(result.includes("u8"), source);
    assert.ok(!result.includes("event"), source);
    assert.ok(!result.includes("f16"), source);
  }
  for (const source of [
    "struct Payload { count: | }",
    "type Value = map { [string]: | }",
    "type Value = vector<|>",
  ]) {
    assert.ok(labels(suggest("blink", source)).includes("f16"), source);
  }
  assert.deepEqual(labels(suggest("zap", "type Name = string.|")), ["utf8", "binary"]);
  assert.deepEqual(labels(suggest("blink", "type Name = string.|")), []);
  assert.deepEqual(labels(suggest("zap", "type Value = u8(1..|)")), []);
});

test("local types resolve through nested scopes without leaking sibling members", () => {
  for (const [language, scope] of [
    ["zap", "namespace Shared ="],
    ["blink", "scope Shared"],
  ]) {
    const source = `${scope} { type Player = u32 type Health = f32 }\ntype Result = Shared.|`;
    assert.deepEqual(labels(suggest(language, source)), ["Player", "Health"]);
    const outside = labels(suggest(language, source.replace("Shared.|", "|")));
    assert.ok(outside.includes("Shared"));
    assert.ok(!outside.includes("Player"));
    assert.ok(
      labels(suggest(language, `${scope} { type Player = u32 type Result = | }`)).includes(
        "Player",
      ),
    );
  }
  assert.ok(
    labels(suggest("blink", "type Root = u8 scope Inner { type Value = | }")).includes("Root"),
  );
  assert.deepEqual(
    labels(suggest("blink", 'import "./shared.blink" as Shared\ntype Value = Shared.|')),
    [],
  );
});

test("Blink generic parameters are available only within their declaration", () => {
  assert.ok(labels(suggest("blink", "struct Packet<T> { payload: | }")).includes("T"));
  assert.ok(
    !labels(suggest("blink", "struct Packet<T> { payload: T }\ntype Other = |")).includes("T"),
  );
});

test("completion replaces the full word while preserving its surrounding text", () => {
  const source = "event Update = { from: Se|rver }";
  const result = suggest("zap", source);
  assert.deepEqual(labels(result), ["Server"]);
  assert.equal(source.replace("|", "").slice(result.start, result.end), "Server");
});

test("typing a type before a closing tuple bracket filters and replaces the entire prefix", () => {
  const prefix =
    "event Name = {\n  from: Server,\n  type: Reliable,\n  call: ManyAsync,\n  data: (c0: CFrame, c1: ";
  for (const typed of ["C", "CF", "CFr"]) {
    const source = `${prefix}${typed}|)\n}`;
    const result = suggest("zap", source);
    assert.ok(labels(result).includes("CFrame"));
    assert.ok(!labels(result).includes("f32"));
    assert.ok(!labels(result).includes("f64"));

    const text = source.replace("|", "");
    assert.equal(text.slice(result.start, result.end), typed);
    assert.equal(
      text.slice(0, result.start) + "CFrame" + text.slice(result.end),
      `${prefix}CFrame)\n}`,
    );
  }
});

test("a following delimiter does not hide the type being completed", () => {
  for (const [language, source, expected] of [
    ["zap", "type Value = CF|?", ["CFrame"]],
    ["zap", "type Value = CF|[]", ["CFrame"]],
    ["zap", "event Update = { data: (first: CF|, next: u8) }", ["CFrame"]],
    ["blink", "struct Payload { value: CF|}", ["CFrame"]],
    ["blink", "type Transform = CFrame<f32, f|>", ["f32", "f64", "f16"]],
  ]) {
    assert.deepEqual(labels(suggest(language, source)), expected, source);
  }
});

test("completing existing fields and constructors preserves their punctuation and bodies", () => {
  const field = suggest("blink", "event Update { Fr|om: Server }").items.find(
    (item) => item.label === "From",
  );
  assert.ok(field);
  assert.equal(field.insertText ?? field.label, "From");
  const constructor = suggest("zap", "type Payload = st|ruct { id: u8 }").items.find(
    (item) => item.label === "struct",
  );
  assert.equal(constructor.insertText ?? constructor.label, "struct");
  const declaration = suggest("blink", "ev|ent Update { From: Server }").items.find(
    (item) => item.label === "event",
  );
  assert.equal(declaration.insertText ?? declaration.label, "event");
});

test("nested payload fields do not inherit event field suggestions", () => {
  assert.deepEqual(
    labels(suggest("blink", "event Update { Data: struct { Call: | } }")).includes("SingleAsync"),
    false,
  );
  assert.ok(labels(suggest("blink", "event Update { Data: struct { Call: | } }")).includes("u8"));
  assert.ok(
    labels(suggest("blink", "event Update { Data: struct { id: u8 }, | }")).includes("Call"),
  );
});

test("Zap field suggestions follow the parser's required order", () => {
  assert.deepEqual(labels(suggest("zap", "event Update = { | }")), ["from"]);
  assert.deepEqual(labels(suggest("zap", "event Update = { from: Server, call: ManyAsync, | }")), [
    "data",
  ]);
  assert.deepEqual(labels(suggest("zap", "event Update = { from: Server, data: u8, | }")), []);
});

test("Zap qualified references stay relative to the current namespace", () => {
  const source = "namespace Shared = { type Id = u32 } namespace Inner = { type Value = Shared.| }";
  assert.deepEqual(labels(suggest("zap", source)), []);
  const nested = "namespace Outer = { namespace Shared = { type Id = u32 } type Value = Shared.| }";
  assert.deepEqual(labels(suggest("zap", nested)), ["Id"]);
});

test("Blink scope captures prefer the closest declaration", () => {
  const source = "type Id = u8 scope Inner { type Id = u32 type Value = Id }";
  const result = hover(parseDocument("blink", source), source.lastIndexOf("Id") + 1);
  assert.equal(result.signature, "type Id = u32");
});

test("option values on a new line still offer values instead of declarations", () => {
  assert.deepEqual(labels(suggest("blink", "option Casing =\n |")), ["Pascal", "Camel", "Snake"]);
  assert.ok(labels(suggest("zap", "type Id =\n |")).includes("u8"));
});

test("large suggestion lists stay bounded without hiding matches as the user types", () => {
  const declarations = Array.from(
    { length: 1000 },
    (_, index) => `type Payload${index} = u32`,
  ).join("\n");
  const initial = suggest("zap", declarations + "\ntype Value = |");
  assert.ok(initial.items.length <= 200);
  assert.equal(initial.isIncomplete, true);
  const filtered = suggest("zap", declarations + "\ntype Value = Payload999|");
  assert.deepEqual(labels(filtered), ["Payload999"]);
  assert.equal(filtered.isIncomplete, false);
  const source = declarations + "\ntype Value = Payload999";
  assert.equal(
    hover(parseDocument("zap", source), source.lastIndexOf("Payload999") + 2).signature,
    "type Payload999 = u32",
  );
});

test("comments and strings suppress suggestions and resume at the correct boundary", () => {
  for (const language of ["zap", "blink"]) {
    for (const source of [
      "-- type Hidden = |",
      "--[[\ntype Hidden = |",
      '"type Hidden = |',
      "'type Hidden = |",
      "-- type Hidden = |\ntype Visible = u8",
    ]) {
      assert.deepEqual(labels(suggest(language, source)), [], `${language}: ${source}`);
    }
    assert.ok(
      labels(suggest(language, "--[[ type Hidden = u8 ]]\ntype Visible = |")).includes("u8"),
    );
    assert.ok(
      !labels(suggest(language, "-- type Hidden = u8\ntype Visible = |")).includes("Hidden"),
    );
  }
  assert.deepEqual(labels(suggest("blink", "--[=[ ]] type Hidden = | ]=]")), []);
  assert.ok(labels(suggest("blink", "--[=[ ]] ]=]\ntype Visible = |")).includes("u8"));
  assert.deepEqual(labels(suggest("blink", String.raw`option ServerOutput = "escaped \" |`)), []);
  assert.ok(
    labels(
      suggest("zap", String.raw`opt server_output = "folder\"` + "\ntype Visible = |"),
    ).includes("u8"),
  );
});

test("hover explains builtins, options, and the right kind of call field", () => {
  for (const [language, source, word, description] of [
    ["zap", "type Id = u16", "u16", /unsigned.*16|16.*unsigned/i],
    ["blink", "option ServerOutput = ''", "ServerOutput", /server/i],
    ["zap", "funct Query = { call: Async }", "call", /Async.*Sync/s],
    ["blink", "function Query { Yield: Future }", "Yield", /Coroutine.*Future.*Promise/s],
  ]) {
    const result = hover(parseDocument(language, source), source.indexOf(word) + 1);
    assert.ok(result, source);
    assert.match(result.documentation, description);
  }
  const source = "struct Payload { string: u8 }";
  assert.equal(hover(parseDocument("blink", source), source.indexOf("string") + 1), undefined);
  assert.equal(hover(parseDocument("zap", "-- u16"), 4), undefined);
});

test("hover resolves local declarations and qualified types", () => {
  const source = "scope Shared { type Player = u32 }\ntype Result = Shared.Player";
  const result = hover(parseDocument("blink", source), source.lastIndexOf("Player") + 2);
  assert.match(result.signature, /type Player = u32/);
  assert.match(result.documentation, /Shared.Player/);
});

test("large schemas keep parsing, edits, completion, and hover within their latency budgets", (context) => {
  for (const language of ["zap", "blink"]) {
    for (const count of [1000, 10000]) {
      const declarations = Array.from({ length: count }, (_, index) =>
        language === "zap"
          ? `type Payload${index} = struct { id: u32, name: string(1..64), position: vector, flags: boolean[8] }`
          : `struct Payload${index}<T> { id: u32, name: string(1..64), position: vector, data: T }`,
      ).join("\n");
      const source = declarations + `\ntype Last = Payload${count - 1}\ntype New = `;
      const start = performance.now();
      const document = parseDocument(language, source);
      const parseMs = performance.now() - start;
      const budget = count === 1000 ? 100 : 250;
      assert.ok(
        parseMs < budget,
        `${language}: parse took ${parseMs.toFixed(1)} ms, budget ${budget} ms`,
      );

      const latencies = [];
      for (let index = 0; index < 100; index++) {
        const requestStart = performance.now();
        const result = complete(document, source.length);
        const info = hover(document, source.lastIndexOf(`Payload${count - 1}`) + 2);
        latencies.push(performance.now() - requestStart);
        assert.ok(result.items.length <= 200);
        assert.ok(
          info.signature.startsWith(language === "zap" ? "type Payload" : "struct Payload"),
        );
      }
      latencies.sort((left, right) => left - right);
      const p95 = latencies[94];
      assert.ok(
        p95 < 10,
        `${language}: cached completion and hover p95 ${p95.toFixed(1)} ms, budget 10 ms`,
      );

      const editStart = performance.now();
      const editedSource = source + `Payload${count - 1}`;
      const edited = parseDocument(language, editedSource);
      assert.deepEqual(labels(complete(edited, editedSource.length)), [`Payload${count - 1}`]);
      const editMs = performance.now() - editStart;
      assert.ok(
        editMs < budget,
        `${language}: edit and completion took ${editMs.toFixed(1)} ms, budget ${budget} ms`,
      );
      context.diagnostic(
        `${language}, ${count} unique types, ${(source.length / 1024).toFixed(0)} KiB: parse ${parseMs.toFixed(1)} ms, cached completion + hover p95 ${p95.toFixed(2)} ms, edit + completion ${editMs.toFixed(1)} ms`,
      );
    }
    assert.deepEqual(labels(suggest(language, '"' + "\\".repeat(20000) + "|")), []);
  }
});
