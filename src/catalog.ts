export type Language = "zap" | "blink";

export interface Entry {
  label: string;
  documentation: string;
  kind: "keyword" | "type" | "property" | "value" | "module";
  insertText?: string;
  values?: readonly string[];
  signature?: string;
}

function entry(
  label: string,
  documentation: string,
  kind: Entry["kind"] = "type",
  insertText?: string,
): Entry {
  return { label, documentation, kind, insertText };
}

function property(label: string, documentation: string, values?: readonly string[]): Entry {
  return { label, documentation, values, kind: "property" };
}

const booleans = ["true", "false"];
const calls = ["SingleSync", "SingleAsync", "ManySync", "ManyAsync", "Polling"];
const numbers = [
  entry("u8", "Unsigned 8-bit integer, from 0 to 255."),
  entry("u16", "Unsigned 16-bit integer, from 0 to 65535."),
  entry("u32", "Unsigned 32-bit integer, from 0 to 4294967295."),
  entry("i8", "Signed 8-bit integer, from -128 to 127."),
  entry("i16", "Signed 16-bit integer, from -32768 to 32767."),
  entry("i32", "Signed 32-bit integer, from -2147483648 to 2147483647."),
  entry("f32", "32-bit floating-point number."),
  entry("f64", "64-bit floating-point number."),
];
const commonTypes = [
  ...numbers,
  entry("boolean", "A true or false value."),
  entry("string", "A string. Use string(min..max) to constrain its length."),
  entry("buffer", "A byte buffer. Use buffer(min..max) to constrain its length."),
  entry("unknown", "A value whose type is determined at runtime."),
  entry(
    "Instance",
    "A Roblox instance reference. Append ? if the instance may be absent on the receiving side.",
  ),
  entry("Color3", "A Roblox Color3 value."),
  entry("CFrame", "A position and rotation in 3D space."),
  entry("BrickColor", "A Roblox BrickColor value."),
  entry("DateTime", "A timestamp with second precision."),
  entry("DateTimeMillis", "A timestamp with millisecond precision."),
];

const zapDeclarations = [
  entry(
    "opt",
    "Configure generated output. Options go before declarations.",
    "keyword",
    "opt ${1:name} = $0",
  ),
  entry("type", "Declare a named type.", "keyword", "type ${1:Name} = $0"),
  entry(
    "event",
    "Declare an event sent between server and client.",
    "keyword",
    "event ${1:Name} = {\n\tfrom: ${2|Server,Client|},\n\ttype: ${3|Reliable,Unreliable,OrderedUnreliable|},\n\tcall: ${4|ManyAsync,SingleAsync,ManySync,SingleSync,Polling|},\n\tdata: ${5:unknown}\n}$0",
  ),
  entry(
    "funct",
    "Declare a request from the client with a response from the server.",
    "keyword",
    "funct ${1:Name} = {\n\tcall: ${2|Async,Sync|},\n\targs: ${3:unknown},\n\trets: ${4:unknown}\n}$0",
  ),
  entry(
    "namespace",
    "Group declarations under a name. Reference types with Namespace.Type.",
    "keyword",
    "namespace ${1:Name} = {\n\t$0\n}",
  ),
];
const blinkDeclarations = [
  entry(
    "option",
    "Configure generated output. Options go before declarations.",
    "keyword",
    "option ${1:Name} = $0",
  ),
  entry("type", "Declare a named type.", "keyword", "type ${1:Name} = $0"),
  entry(
    "event",
    "Declare an event sent between server and client.",
    "keyword",
    "event ${1:Name} {\n\tFrom: ${2|Server,Client|},\n\tType: ${3|Reliable,Unreliable|},\n\tCall: ${4|ManyAsync,SingleAsync,ManySync,SingleSync,Polling|},\n\tData: ${5:unknown}\n}$0",
  ),
  entry(
    "function",
    "Declare a request from the client with a response from the server.",
    "keyword",
    "function ${1:Name} {\n\tYield: ${2|Coroutine,Future,Promise|},\n\tData: ${3:unknown},\n\tReturn: ${4:unknown}\n}$0",
  ),
  entry(
    "scope",
    "Group declarations under a name. Scopes can use types from their parents.",
    "keyword",
    "scope ${1:Name} {\n\t$0\n}",
  ),
  entry(
    "struct",
    "Declare a record with named fields.",
    "keyword",
    "struct ${1:Name} {\n\t${2:field}: ${3:u8}\n}$0",
  ),
  entry(
    "enum",
    "Declare a set of named alternatives.",
    "keyword",
    "enum ${1:Name} = { ${2:Value} }$0",
  ),
  entry(
    "map",
    "Declare a map of keys to values.",
    "keyword",
    "map ${1:Name} = { [${2:string}]: ${3:u8} }$0",
  ),
  entry("set", "Declare a set of named flags.", "keyword", "set ${1:Name} = { ${2:Flag} }$0"),
  entry(
    "import",
    "Import another Blink file into a scope.",
    "keyword",
    'import "${1:./shared.blink}" as ${2:Shared}$0',
  ),
  entry(
    "export",
    "Export read and write functions for a type. Generic types cannot be exported.",
    "keyword",
    "export $0",
  ),
];

// These catalogs follow the upstream parsers, including options absent from their guides.
// Zap: red-blox/zap, zap/src/parser/{grammar.lalrpop,convert.rs}.
// Blink: 1Axen/blink, src/Parser.luau.
export const catalogs = {
  zap: {
    option: "opt",
    namespace: "namespace",
    function: "funct",
    declarations: zapDeclarations,
    types: [
      ...commonTypes,
      entry("vector", "A vector. Use vector(f32, f32, f32) to choose component encodings."),
      entry("Vector2", "A two-component Roblox Vector2 value."),
      entry("Vector3", "A three-component Roblox Vector3 value."),
      entry("AlignedCFrame", "A CFrame with an axis-aligned rotation."),
      entry(
        "struct",
        "A record with named fields.",
        "type",
        "struct {\n\t${1:field}: ${2:u8}\n}$0",
      ),
      entry(
        "enum",
        "Named alternatives, optionally tagged with a string key.",
        "type",
        "enum { ${1:Value} }$0",
      ),
      entry("map", "A map of keys to values.", "type", "map { [${1:string}]: ${2:u8} }$0"),
      entry("set", "A collection of values of one type.", "type", "set { ${1:u8} }$0"),
    ],
    options: [
      property("server_output", "Path for the generated server module, relative to this file."),
      property("client_output", "Path for the generated client module, relative to this file."),
      property("types_output", "Path for the generated Luau types, relative to this file."),
      property(
        "call_default",
        "Default event listener mode.",
        calls.map((value) => `"${value}"`),
      ),
      property("remote_scope", "Prefix used for generated remote names."),
      property("remote_folder", "Name of the folder containing generated remotes."),
      property("casing", "Naming style for generated API methods.", [
        '"PascalCase"',
        '"camelCase"',
        '"snake_case"',
      ]),
      property("write_checks", "Validate constrained values when sending data.", booleans),
      property("typescript", "Generate TypeScript definitions alongside Luau modules.", booleans),
      property(
        "manual_event_loop",
        "Send queued messages only when SendEvents is called.",
        booleans,
      ),
      property(
        "include_profile_labels",
        "Include microprofiler labels in generated code.",
        booleans,
      ),
      property(
        "typescript_max_tuple_length",
        "Maximum tuple length before TypeScript output uses an array.",
      ),
      property("typescript_enum", "Representation of enums in TypeScript output.", [
        '"StringLiteral"',
        '"ConstEnum"',
        '"StringConstEnum"',
      ]),
      property(
        "yield_type",
        "How generated request functions yield. Futures are unavailable with TypeScript output.",
        ['"yield"', '"future"', '"promise"'],
      ),
      property("async_lib", "A require expression for the selected asynchronous library."),
      property("tooling", "Generate tooling integration output.", booleans),
      property("tooling_output", "Path for generated tooling output, relative to this file."),
      property("tooling_show_internal_data", "Include internal data in tooling output.", booleans),
      property("disable_fire_all", "Omit FireAll from the generated server API.", booleans),
    ],
    eventFields: [
      property("from", "Which side sends the event.", ["Server", "Client"]),
      property("type", "The event delivery mode.", ["Reliable", "Unreliable", "OrderedUnreliable"]),
      property("call", "The listener mode on the receiving side.", calls),
      property("data", "Payload type, or a parenthesized list of payload parameters."),
    ],
    functionFields: [
      property("call", "How the server calls the function listener.", ["Async", "Sync"]),
      property("args", "Argument type, or a parenthesized list of parameters sent to the server."),
      property("rets", "Return type, or a parenthesized list of unnamed return types."),
    ],
  },
  blink: {
    option: "option",
    namespace: "scope",
    function: "function",
    declarations: blinkDeclarations,
    types: [
      ...commonTypes,
      entry("f16", "16-bit floating-point number."),
      entry("vector", "A vector. Use vector<i16> to choose its component encoding."),
      entry(
        "struct",
        "An inline record with named fields.",
        "type",
        "struct {\n\t${1:field}: ${2:u8}\n}$0",
      ),
      entry(
        "enum",
        "Named alternatives, optionally tagged with a string key.",
        "type",
        "enum { ${1:Value} }$0",
      ),
      entry("map", "A map of keys to values.", "type", "map { [${1:string}]: ${2:u8} }$0"),
      entry("set", "A set of named flags.", "type", "set { ${1:Flag} }$0"),
    ],
    options: [
      property("Casing", "Naming style for generated API methods.", ["Pascal", "Camel", "Snake"]),
      property("UseColon", "Use method syntax for generated calls.", booleans),
      property("UsePolling", "Generate a polling API for all events.", booleans),
      property("Typescript", "Generate TypeScript definitions alongside Luau modules.", booleans),
      property("TypesOutput", "Path for the generated Luau types."),
      property("ClientOutput", "Path for the generated client module."),
      property("ServerOutput", "Path for the generated server module."),
      property("FutureLibrary", "Path to the library used with Yield: Future."),
      property("PromiseLibrary", "Path to the library used with Yield: Promise."),
      property("SyncValidation", "Check whether a synchronous listener yielded.", booleans),
      property("WriteValidations", "Validate values when sending data.", booleans),
      property(
        "ManualReplication",
        "Send queued messages only when StepReplication is called.",
        booleans,
      ),
      property("RemoteScope", "Prefix used for generated remote names."),
    ],
    eventFields: [
      property("From", "Which side sends the event.", ["Server", "Client"]),
      property("Type", "The event delivery mode.", ["Reliable", "Unreliable"]),
      property("Call", "The listener mode on the receiving side.", calls),
      property("Poll", "Use the polling listener mode for this event.", booleans),
      property("Data", "Payload type, or a parenthesized list of payload types."),
    ],
    functionFields: [
      property("Yield", "How the client waits for the response.", [
        "Coroutine",
        "Future",
        "Promise",
      ]),
      property("Data", "Argument type, or a parenthesized list of types sent to the server."),
      property("Return", "Return type, or a parenthesized list of return types."),
    ],
  },
} satisfies Record<
  Language,
  {
    option: string;
    namespace: string;
    function: string;
    declarations: Entry[];
    types: Entry[];
    options: Entry[];
    eventFields: Entry[];
    functionFields: Entry[];
  }
>;

export const encodings = [
  entry("utf8", "A string encoded as UTF-8 bytes."),
  entry("binary", "A string treated as raw bytes."),
];

export function valuesFor(item: Entry): Entry[] {
  return (item.values ?? []).map((label) => entry(label, item.documentation, "value"));
}

export function describe(item: Entry) {
  return item.values?.length
    ? `${item.documentation}\n\nValues: ${item.values.join(", ")}.`
    : item.documentation;
}
