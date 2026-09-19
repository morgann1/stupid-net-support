import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { after, test } from "node:test";
import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const wasm = await readFile(new URL(import.meta.resolve("vscode-oniguruma/release/onig.wasm")));
await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));

const registry = new textmate.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
    createOnigString: (value) => new oniguruma.OnigString(value),
  }),
  async loadGrammar(scopeName) {
    const contribution = manifest.contributes.grammars.find((item) => item.scopeName === scopeName);
    assert.ok(contribution, `No grammar registered for ${scopeName}`);

    const path = new URL(contribution.path, root);
    return textmate.parseRawGrammar(await readFile(path, "utf8"), path.pathname);
  },
});
after(() => registry.dispose());

/** @type {Map<string, import("vscode-textmate").IGrammar>} */
const grammars = new Map();

for (const language of ["zap", "blink"]) {
  const grammar = await registry.loadGrammar(`source.${language}`);
  assert.ok(grammar);
  grammars.set(language, grammar);
}

/** Tokenize with the same stateful TextMate engine used by VS Code.
 * @param {string} language
 * @param {string} source
 */
function highlight(language, source) {
  const grammar = grammars.get(language);
  assert.ok(grammar);

  let state = textmate.INITIAL;
  let offset = 0;
  const tokens = [];

  for (const line of source.split("\n")) {
    const result = grammar.tokenizeLine(line, state, 1000);
    assert.equal(result.stoppedEarly, false, "Tokenization exceeded its per-line budget");

    for (const token of result.tokens) {
      tokens.push({
        start: offset + token.startIndex,
        end: offset + Math.min(token.endIndex, line.length),
        scopes: token.scopes,
      });
    }

    offset += line.length + 1;
    state = result.ruleStack;
  }

  return {
    /** Check every character of a unique excerpt, including split tokens.
     * @param {string} excerpt
     * @param {string} scope
     */
    expect(excerpt, scope) {
      const start = source.indexOf(excerpt);
      assert.notEqual(start, -1, `Missing excerpt: ${excerpt}`);
      assert.equal(source.indexOf(excerpt, start + 1), -1, `Ambiguous excerpt: ${excerpt}`);

      for (let index = start; index < start + excerpt.length; index++) {
        const token = tokens.find((item) => item.start <= index && index < item.end);
        assert.ok(
          token?.scopes.includes(`${scope}.${language}`),
          `${JSON.stringify(excerpt)} at ${index}: expected ${scope}.${language}, got ${token?.scopes}`,
        );
      }
    },
    state,
  };
}

for (const language of ["zap", "blink"]) {
  const fixture = await readFile(new URL(`test/fixtures/example.${language}`, root), "utf8");

  test(`${language}: file extensions and manual language selection use the grammar`, () => {
    const registration = manifest.contributes.languages.find((item) => item.id === language);
    assert.ok(registration?.extensions.includes(`.${language}`));
    assert.ok(registration.aliases.some((alias) => alias.toLowerCase() === language));
    assert.equal(
      manifest.contributes.grammars.find((item) => item.language === language)?.scopeName,
      `source.${language}`,
    );
  });

  test(`${language}: nested network definitions retain token scopes`, () => {
    const result = highlight(language, fixture);
    result.expect("Update", "entity.name.function");
    result.expect("GetPlayer", "entity.name.function");
    result.expect("-- Network definitions", "comment.line.double-dash");
    result.expect('"network/server.luau"', "string.quoted.double");
    result.expect('"display-name"', "string.quoted.double");
    result.expect("-10.5", "constant.numeric");
    result.expect("100", "constant.numeric");
    result.expect("ManyAsync", "constant.language");
    assert.equal(result.state.depth, textmate.INITIAL.depth);
  });

  test(`${language}: numeric ranges keep their separator outside each number`, () => {
    for (const { source, numbers } of [
      { source: "f32(-12.5..23.75)", numbers: ["-12.5", "23.75"] },
      { source: "u8[1..64]", numbers: ["1", "64"] },
      { source: "buffer(..900)", numbers: ["900"] },
      { source: "string(3..)", numbers: ["3"] },
    ]) {
      const result = highlight(language, source);
      for (const number of numbers) {
        result.expect(number, "constant.numeric");
      }
      result.expect("..", "keyword.operator");
    }
  });

  test(`${language}: fields can reuse keyword and primitive names`, () => {
    const result = highlight(language, "struct { type: u8, CFrame: string, true: boolean }");
    for (const field of ["type", "CFrame", "true"]) {
      result.expect(field, "variable.other.property");
    }
    result.expect("u8", "storage.type");
    result.expect("string", "storage.type");
    result.expect("boolean", "storage.type");
  });

  test(`${language}: identifier substrings are not keywords or constants`, () => {
    const result = highlight(language, "eventual trueValue u8Array MyServer");
    for (const identifier of ["eventual", "trueValue", "u8Array", "MyServer"]) {
      result.expect(identifier, "entity.name.type");
    }
  });

  test(`${language}: primitive types and boolean values have distinct scopes`, () => {
    const source =
      "u8 u16 u32 i8 i16 i32 f32 f64 boolean string buffer vector unknown Instance Color3 CFrame BrickColor DateTime DateTimeMillis";
    for (const primitive of source.split(" ")) {
      highlight(language, `type Value = ${primitive}`).expect(primitive, "storage.type");
    }
    const result = highlight(language, "true false");
    result.expect("true", "constant.language");
    result.expect("false", "constant.language");
  });

  test(`${language}: comments end before the following declaration`, () => {
    const result = highlight(
      language,
      "-- type Hidden = u8\ntype Visible = f32\n--[[ hidden\nfalse\n]] type After = u16",
    );
    result.expect("Hidden", "comment.line.double-dash");
    result.expect("false", "comment.block");
    result.expect("Visible", "entity.name.type");
    result.expect("After", "entity.name.type");
    result.expect("u16", "storage.type");
  });

  test(`${language}: strings contain comments and resume after their closing quote`, () => {
    const result = highlight(language, `"--[[ false ]]" u8 '-- true' f64`);
    result.expect("--[[ false ]]", "string.quoted.double");
    result.expect("-- true", "string.quoted.single");
    result.expect("u8", "storage.type");
    result.expect("f64", "storage.type");
  });

  test(`${language}: empty and incomplete input tokenizes without losing state`, () => {
    assert.equal(highlight(language, "").state.depth, textmate.INITIAL.depth);
    const comment = highlight(language, "--[[ unfinished\ntype Hidden = u8");
    comment.expect("Hidden", "comment.block");
    assert.ok(comment.state.depth > textmate.INITIAL.depth);

    const string = highlight(language, '"unfinished\n-- still a string');
    string.expect("-- still a string", "string.quoted.double");
  });

  test(`${language}: large definitions and unfinished lines stay within the tokenizer budget`, (context) => {
    highlight(language, fixture);
    const source = fixture.repeat(100);
    const start = performance.now();
    highlight(language, source);
    const elapsed = performance.now() - start;
    context.diagnostic(`${source.split("\n").length} lines in ${elapsed.toFixed(1)} ms`);
    assert.ok(elapsed < 5000, `Large definition took ${elapsed.toFixed(1)} ms`);

    highlight(language, "identifier".repeat(5000));
    highlight(language, '"' + "\\".repeat(20000));
    highlight(language, "--[[" + "=".repeat(20000));
  });
}

test("zap: namespaces, string encodings, unions, and built-in types", () => {
  const result = highlight(
    "zap",
    "namespace Network = { type Payload = (string.utf8 | string.binary | Instance.Part | Vector2 | Vector3 | AlignedCFrame) }",
  );
  result.expect("Network", "entity.name.namespace");
  result.expect("Payload", "entity.name.type");
  result.expect("utf8", "support.type");
  result.expect("binary", "support.type");
  result.expect("Part", "support.class");
  for (const type of ["Vector2", "Vector3", "AlignedCFrame"]) {
    result.expect(type, "storage.type");
  }
});

test("zap: backslashes do not escape string delimiters", () => {
  const result = highlight("zap", 'opt path = "folder\\" type After = u8');
  result.expect("folder\\", "string.quoted.double");
  result.expect("After", "entity.name.type");
  result.expect("u8", "storage.type");
});

test("blink: imports, exported generic types, and scopes", () => {
  const result = highlight(
    "blink",
    'import "./shared.blink" as Shared\nexport struct Packet<T> { data: T }\nscope Network { type Entry = Packet<Shared.Player> }',
  );
  result.expect("import", "keyword.control");
  result.expect("as", "keyword.control");
  result.expect("export", "keyword.control");
  result.expect("Network", "entity.name.namespace");
  result.expect("data", "variable.other.property");
  result.expect("Player", "entity.name.type");
});

test("blink: escaped quotes stay in strings, and an even backslash count closes them", () => {
  const result = highlight(
    "blink",
    String.raw`"escaped \" -- text" u8 'it\'s text' f32 "folder\\" boolean`,
  );
  result.expect("-- text", "string.quoted.double");
  result.expect("s text", "string.quoted.single");
  result.expect("u8", "storage.type");
  result.expect("f32", "storage.type");
  result.expect("boolean", "storage.type");
});

test("blink: long comments require a matching number of equals signs", () => {
  const result = highlight(
    "blink",
    "--[==[\n]] type StillHidden = u8\n]=] false\n]==] type Visible = f16",
  );
  result.expect("StillHidden", "comment.block");
  result.expect("false", "comment.block");
  result.expect("Visible", "entity.name.type");
  result.expect("f16", "storage.type");
});

test("blink: fractional ranges may omit the leading zero", () => {
  const result = highlight("blink", "f16(-.5...75)");
  result.expect("-.5", "constant.numeric");
  result.expect(".75", "constant.numeric");
});

test("library-specific words do not leak into the other grammar", () => {
  const zap = highlight("zap", "option function import export scope f16");
  for (const word of ["option", "function", "import", "export", "scope", "f16"]) {
    zap.expect(word, "entity.name.type");
  }

  const blink = highlight("blink", "opt funct namespace AlignedCFrame Vector2 Vector3");
  for (const word of ["opt", "funct", "namespace", "AlignedCFrame", "Vector2", "Vector3"]) {
    blink.expect(word, "entity.name.type");
  }
});
