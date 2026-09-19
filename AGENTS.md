# Stupid Net Highlighter

Stupid Net Highlighter is a syntax highlighting project for the Roblox networking libraries Zap and Blink. Keep the implementation as simple as the task allows.

The initial scope is Zap and Blink, with more libraries planned. The project directory started empty. No editor target, implementation language, package manifest, source, tests, CI configuration, or Git history is established yet. Do not assume a particular extension platform or build system.

## What makes Stupid Net Highlighter special?

Morgan values simple solutions to complex problems. Preserve that simplicity as library support grows. No user count or adoption claims are established. The following priorities apply within this project's scope.

### 1. Open at the core

Keep code and the reasoning behind changes understandable to contributors. Work in the open where the project's visibility and Morgan's instructions permit it. Public source, licensing, a shared roadmap, and users running forks are not established for this project. Do not claim them without evidence.

### 2. Performance without compromise

Keep syntax highlighting responsive. Check the performance impact of highlighting rules on realistic input. There is no established performance audit process. The template's WebSocket traffic, CSS animation, and list rendering examples do not apply to the current empty project. Make sure all changes are considerate of performance impact.

### 3. Remote ready

No server, WebSocket layer, local network connection, Tailscale integration, or tunnel exists here. Those remote features do not apply. If the chosen editor supports remote workspaces, consider that environment when changing highlighting behavior. Do not add networking infrastructure just because the highlighted libraries use networking.

### 4. Multi-surface

No app or editor target is established in this directory. The template's **web**, **desktop**, and **mobile** clients are not established project targets.

**Web** has no hosted app or local web development command here. If a web editor becomes a supported target, verify relevant changes there.

**Desktop** has no extension manifest, Electron app, bundled server, or host mode here. Verify the editor target from the implementation before giving installation or development instructions.

**Mobile** has no React Native app, iOS or Android build, store release, or remote control client here. Mobile verification does not apply.

## Maintainer guidance

Favor simple systems and clear behavior, including when considering ambitious ideas. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.

Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the dev's intent in both a minimal and realistic fashion.

The rest of this document is meant to help you navigate the codebase and make changes effectively. Think of these instructions less as "hard rules", more as "good defaults". The developer's preferences should be able to override anything here.

Be careful about accessing data, killing development processes, or changing the editor or agent session the contributor is using. This project has no established development server or runtime state. Never touch production, live databases, or daily-driver build or preview channels unless explicitly told to. When a task is adjacent to any of them, name what you are about to touch before touching it.

- A question is a request for an answer, not for changes. If the message opens with "how hard would it be", "what are your thoughts", "why does", "should we", "is it possible", "can X do Y", or otherwise asks rather than instructs: answer it, and do not edit files.
- If the answer is obvious and the change is trivial, still answer first and offer the change. Ask before making it.
- Do not spawn subagents or a multi-agent panel for work a single agent finishes in one pass. Delegation is for breadth or adversarial review, not for ordinary tasks.
- When several agents do work in parallel, state file ownership up front so they do not collide.

## A small glossary

We need to be on the same page with terminology. When communicating, use this language:

- **you** means the agent reading this file and changing Stupid Net Highlighter.
- **we, us, and maintainers** mean Morgan and the people building Stupid Net Highlighter. These are who you are talking to now.
- **user** means the person using the project's syntax highlighting for Zap or Blink.
- **agent** means a coding agent helping maintain this project, including you. The product does not run agents.
- **provider** has no product equivalent here. An agent runtime such as Codex or Claude is a contributor tool, not a project integration.
- **client** means the editor that hosts the syntax highlighting. No editor target is established yet.
- **environment** means the development machine, filesystem, and editor session used to work on this project. There is no project server or credential store.
- **project** means this workspace directory and its files.
- **thread** means the durable conversation and work history for a project.
- **turn** means one user-to-agent cycle, including follow-up verification. The project has no checkpointing system.
- **project state directory** has no equivalent here. There is no application data directory or userdata store.

## The three ways to hurt yourself

1. **Killing by pattern.** Never stop a process by matching a name, path, or worktree string. This includes PowerShell process searches piped to `Stop-Process`, and Unix patterns such as `pkill -f` or `pgrep | kill`. Your agent process can contain the workspace path, and unrelated development processes may be running. Stop only a PID you captured when starting a process for this task. The template's Linux port-owner and `/proc` checks do not apply to this Windows workspace.
2. **Writing to the live install.** No project database or live install path is established. Do not modify the developer's installed highlighting package, editor profile, or daily-driver channel without explicit instructions. The template's permission to read or copy live state does not override Morgan's restriction on touching live databases. Use authorized copies for test data, never live state. Never start a test server against live data, open it read-write, or clean it up.
3. **Baking in origins.** No Vite configuration, HTTP origin, WebSocket origin, or proxy routes exist here, so the template's origin settings do not apply. Do not introduce hardcoded local endpoints. They would make shared builds depend on one machine and could break remote use.

## Hit every surface

A change can work on the input you tested and fail elsewhere. There is no defect history yet. Before calling highlighting or frontend work done, walk this list and say which entries applied:

- **Entry points.** Check each supported way the editor selects a language, once implemented. The template's chat view, Settings, command palette, and keybinding entry points have no implementation here. Fixing one entry point does not establish that all work.
- **Clients.** Verify the editor targets the project actually supports. No web, Electron, or React Native client, navigation system, or shared client runtime exists yet.
- **Providers.** No agent provider adapters exist here. The relevant coverage is Zap and Blink. Decide whether each highlighting change applies to one library or both, and extend this check when support for another library is added.
- **Contracts.** There is no wire protocol or schema package. Once implemented, keep editor language registration and highlighting definitions consistent with the supported library syntax. Check every consumer when a shared definition changes.
- **Reverse states.** If you added a way in, add the way out and the way to see it. For highlighting rules that enter a string or comment, verify that highlighting ends at the correct boundary. The template's snooze and reopen actions do not apply. A one-way door is a bug.
- **Connection modes.** No local server, relay, tunnel, or multi-environment product exists here. If the eventual editor supports local and remote workspaces, check the modes affected by a change. Do not claim support without verification.
- **Docs.** Check whether the change makes existing guidance inaccurate. Apply the [documentation rules](#documentation) before adding anything.

## Dev servers

- No installation command, dependency manifest, or worktree setup script exists yet. Read the eventual manifest and contributor guidance before installing dependencies. Do not assume the template's package manager or diagnose module resolution against a nonexistent setup script.
- No development server or launch command exists yet. The template's worktree state directory, environment-variable precedence, and home-directory override do not apply. Keep any future development state isolated from live installs and shared state.
- No development ports or runner logs are established. If a future development process uses ports, read its actual output instead of assuming a port is free or unchanged across restarts.
- Tailnet sharing, pairing links, reusable browser cookies, token renewal, and connection scopes do not apply. There is no sharing or pairing command. Do not create a tunnel or consume a user's pairing link as part of this project's setup.
- There is no development authentication token, linked environment file, or reusable-credential guide. Cross-worktree authentication does not apply. Never commit or publish credentials or authenticated startup URLs if future tooling introduces them.
- Stop what you started, by the PID you tracked. See rule 1.

## Test data

Empty input alone is a poor test of syntax highlighting. Use representative Zap and Blink examples, copied into isolated test fixtures when fixtures are introduced. There is no database or fixture directory yet:

- Copy examples only from sources authorized for the task. No live data directory or worktree userdata path exists here. Keep original user files unchanged.
- The template's database snapshot procedure does not apply. There is no database to snapshot with `VACUUM INTO`, and no verified fixture-copy command can be given before source examples and their destination exist:

  ```text
  No database snapshot command applies to this project.
  ```

  The original procedure creates an isolated destination, removes prior snapshot files because `VACUUM INTO` refuses to overwrite, and reads the source without opening it for writes. Its purpose is a consistent snapshot while the source is in use. A plain database file copy is unsafe while a server has it open, and an offline copy must include its `-wal` and `-shm` siblings. None of these database operations is part of this project's setup.

- Bring secrets or editor settings into a test environment only if the flow under test needs them and access is authorized. No project secrets store or settings file exists yet.
- Copy in, never symlink. Data flows one way: into your sandbox, never back out.

## Verifying

- Smallest proof that the change works. No test runner, lint command, or typecheck command exists yet. Once configured, run focused checks for the files and behavior you changed. For instruction-only changes, read the files and review the diff.
- Test meaningful logic or observable behavior. Do not render components to static markup to assert props or attributes, or add tests that merely assert callback wiring or mirror the implementation.
- **Do not run repo-wide checks.** Do not run a full lint, test, or typecheck suite unless the developer asks. The template assigns full-suite checks to CI, but this project has no CI or check commands yet. Keep verification focused until those are established.
- Highlighting behavior changes ship with focused tests for that behavior once a test runner is established. There is no backend to test. Do not introduce tests that merely mirror definitions or add a framework for an instruction-only change.
- No event-sourced server, typed receipts, or worker queues exist here. Their specific wait mechanisms do not apply. For future asynchronous tests, wait on observable completion, never on sleeps or polling. A test that needs a timeout to pass is wrong.
- Upon request, user-visible highlighting changes should get one integrated pass in the supported editor. No editor verification command or skill is established yet. The primary agent does this once after integrating. Subagents do not launch their own dev servers. Use computer control or browsers only when the user has authorized that verification. Do not ask again when the request already authorizes it.

The template's mobile build step, simulator host, Expo fingerprint check, Metro startup, and mobile verification skill do not apply. There is no native client or mobile build script. For authorized verification of the eventual editor integration, treat a missing development build as a setup step when a verified build procedure exists. Keep that build isolated from the daily-driver install.

## Pull requests

- Never make a PR unless the developer explicitly asks you to do so.
- Follow the repository's title conventions in plain language. No Git history establishes a convention yet. Use conventional commits if the project adopts them, for example `fix(blink): correct string highlighting`.
- Body: the problem in a sentence or two, then how you fixed it. End with the model and harness that did the work.
- UI changes need before/after images. Motion or timing needs a short video.
- Upload PR evidence to GitHub. Never commit PR-only screenshots or assets such as `.github/pr-assets/`.
- One concern per PR. If the description says "also", split it.
- Open a real PR, not a draft. Drafts do not get review-bot coverage.
- Rebase onto latest `main` before opening. Stale branches conflict and waste a review round. This directory has no Git repository or branch yet, so no rebase command is established at setup time.
- When babysitting: poll checks and comments newer than the last push, verify each bot finding against the source, fix real ones, dismiss false positives with a written reason. Fix CI failures, distinguishing real breaks from known infrastructure flakes. Stay quiet when nothing is new. Stop when the bots are green on the latest commit. No CI or review bots are configured in this directory yet.
- Merge only per the disposition given in the request. If none was given, report and ask.

## Documentation

Most code changes do not need an internal documentation change. Agents can read the code.

- No internal documentation directory exists. If internal documentation becomes necessary, reserve it for architectural decisions and their reasons, constraints that span components, and implementation traps that are hard to discover from the source. Before adding a paragraph, ask what a maintainer would get wrong without it. If reading the relevant code answers the question, leave it out.
- Do not document every feature, enumerate fields or methods, narrate control flow, maintain file catalogs, or append PR summaries. Types, tests, and code already record the implementation. The glossary defines shared vocabulary; it is not a feature index.
- Keep a local implementation explanation in a nearby code comment. Use an internal doc when the reasoning crosses boundaries or needs context the code cannot carry well. Link to the relevant source instead of copying it.
- When a documented decision or constraint changes, rewrite or remove the affected text. Do not append another account of the new behavior. A new internal page needs a distinct, durable reason to exist.
- No README or user documentation directory exists. When user guidance is added, help users accomplish tasks. Give each major feature a concise section explaining what it does, how to start, and anything unintuitive. A settings path is useful; descriptions of visible buttons, icons, layouts, animations, or every UI state are not. Before adding text, ask what task or decision it helps the user with.
- Keep user docs in the shipped product's voice, without implementation details or contributor tooling. Update the relevant feature section when how to use it changes. A UI tweak does not need a documentation entry, and a new control does not need its own page.
- No operations documentation or release procedure exists. Maintainer guidance is for setup, release, and debugging procedures. Keep instructions for using installed syntax highlighting in the user guides. The template's installed-server operations do not apply.
- Apply the `unslop` skill to replies, commit messages, PR descriptions, documentation, and code comments. Read the skill once per session, not once per message. Do not use em dashes.

## Plans and work artifacts

- Do not commit implementation plans, research notes, or agent scratch files. Keep temporary working material outside the worktree. No ignore file exists, so there is no gitignored plans directory or legacy-tooling safety net.
- Track active maintainer work in the GitHub issue or project item that owns it, when one exists. No Git remote, contributor guide, or Ideas discussion process is configured here. Do not invent an external proposal process.
- A merged PR is the implementation record. Close or update its tracking item when the work lands; do not preserve a second checklist in the repository.

## How it works

The intended behavior is syntax highlighting for Zap and Blink. No implementation exists yet, so the highlighting format, editor integration, and packaging are not established. The template's typed WebSocket requests, commands, decider, persisted events, projector, provider subprocesses, adapters, queued reactors, receipts, and Git checkpoints have no equivalent here. Do not introduce that architecture for syntax highlighting.

No separate glossary file exists. Use [A small glossary](#a-small-glossary) above.

## Where code lives

- No server source exists. WebSocket handling, orchestration, provider management, checkpointing, and Effect-specific reference instructions do not apply.
- No web, desktop, mobile, or marketing app directories exist. No React, Vite, Electron, or React Native stack is established.
- No contracts package or schema library exists. The template's contract-and-helper boundary has no current equivalent. Keep any future shared syntax definitions free of unrelated runtime logic.
- No shared runtime utility package exists. Subpath exports and barrel-export restrictions have no current module structure to apply to. Do not create a package just to match this template.
- No shared client runtime exists. No web and mobile clients need shared code here.
- No vendored reference directory or dependency-sync command exists. If read-only references are introduced, prefer their verified patterns over invented ones. Never edit or import from read-only references. Update the matching reference when changing a dependency, using the project's actual sync procedure.

## Taste

- Keep library-specific syntax rules separate where Zap and Blink differ. No adapter, orchestration layer, or custom UI exists. If those boundaries become necessary, keep complexity at the integration boundary, orchestration pure, and UI logic minimal.
- Inferred types over annotations. `any` is the enemy. These rules apply if the chosen implementation language has those features. No language is established yet.
- Comments describe how a thing is used, and move when the code moves. To be used mostly to describe functions, not to annotate every line of behavior.
- Users need responsive highlighting while editing. No continuously repainting animations; they peg the GPU on high-refresh displays. The template's agent UI, spinner, and stale-label examples have no current equivalent.
- If a rule here conflicts with the task, explain the conflict. Follow explicit developer preferences that already resolve it. Otherwise, get human sign-off before breaking it.
- Before writing code, read `general.md` and the file for the language at hand in the user-level preferences directory. Use `~/.codex/preferences/` in Codex and `~/.claude/preferences/` in Claude Code. Never resolve this directory relative to the current repository.
- Do not edit real components first. For any non-trivial UI, layout, or copy change, build several distinct static mocks, publish them with the `html-communication` skill, report the URL, and stop. Wait for a pick before implementing.
- Default visual preferences are dark mode, a true black background of `#000`, white primary text, information-dense layouts, and minimal copy.
- When using a frontend package or design system such as MUI, GOV.UK Frontend, or Material 3 Expressive, follow its recommended design guidelines in mocks and implementation. Those guidelines take precedence over the visual defaults.
- Avoid light-grey subtitle lines above sections, decorative card or pill chrome, and similar decoration unless the chosen design system's guidance calls for them in that context.

## Additional tips

- Don't verify with browsers or computer use unless the user explicitly agrees or requests it. Existing authorization is sufficient.
- Security is important, but should not be over-indexed on, especially for dev mode/maintainer-only features.
- For URLs on `github.com`, `raw.githubusercontent.com`, or `api.github.com`, use the `gh` CLI.
- For URLs under `create.roblox.com/docs/`, use the `roblox-docs` skill. Do not use native web search tools to access these docs.
- For all other web searches and browsing, use the `search-web` skill.
- `npm run format:check` must pass before considering code-related tasks complete.
