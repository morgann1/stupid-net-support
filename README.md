# Stupid Net Highlighter

Syntax highlighting, autocomplete, and hover help for Zap and Blink network
definition files in VS Code.

Open a `.zap` or `.blink` file to enable highlighting. For untitled files, select
**Zap** or **Blink** through **Change Language Mode**. Colours follow your editor
theme.

Highlights declarations, types, fields, literals, comments, and operators,
including Zap namespaces and Blink imports and generics.

Type in a definition file or press **Ctrl+Space** for suggestions. Complete
declarations, options, event and function fields, built-in types, and types
declared in the current file. Press **Tab** to accept a suggestion or advance to
the next snippet placeholder. Choosing an option or field opens its value suggestions.
Brackets and quotes close automatically. Press **Enter** between braces to indent
the block.
Hover over a supported name for its description or local type declaration.

Local type suggestions respect Zap namespaces, Blink scopes, and Blink generic
parameters. Imported Blink types, diagnostics, and generated Luau APIs are outside
the current IntelliSense support.

See [CONTRIBUTING.md](CONTRIBUTING.md) to run the extension locally.
