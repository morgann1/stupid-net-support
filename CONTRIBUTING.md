# Run the extension locally

Run `npm ci` to install the development tools. Open this folder in VS Code, then
press **F5** with **Run extension** selected. The launch task builds the extension.

The Extension Development Host opens the fixture folder and both example files
with a temporary profile. Check that the language mode is **Zap** or **Blink**.
For an untitled file, use **Change Language Mode** to select either language.

On Windows, run `npm run dev` to build and preview without the debugger. The `code`
command must be on your PATH. This launches a separate VS Code instance and stores
its settings and extensions in `.vscode-test/`. Use this command if the F5
development window closes during debugger startup.

Add highlighting rules to the corresponding file in `syntaxes/`. Add editing
behavior to the corresponding file in `language-configuration/`. Reload the
development window after changing these files.

After changing IntelliSense code in `src/`, run `npm run build` and reload the
development window. Check completions with **Ctrl+Space** and hover over a type or
option name. Repeat in an untitled file after selecting its language mode.

## Check highlighting

Run `npm run test:syntax`.
The tests use VS Code's TextMate tokenizer and cover both languages, string and
comment boundaries, and large definitions. They do not require `.repos`.

Use `test/fixtures/example.zap` and `test/fixtures/example.blink` for a manual
check in the Extension Development Host.

## Check IntelliSense

Run `npm run test:intellisense` to build and test completions and hover help.
The tests include comment boundaries, incomplete input, scope resolution, and
latency checks with 1,000 and 10,000 distinct types. The output reports parsing,
completion, hover, and edit timings. No editor session is required.

Run `npm run format -- <changed-files>`, `npm run format:check -- <changed-files>`,
and `npm run lint -- <changed-code-files>` before submitting changes.

## Prepare a release

Before packaging or publishing, set your Marketplace `publisher` in `package.json`
and choose a license. Neither has been configured.
