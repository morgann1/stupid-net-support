import * as vscode from "vscode";
import { complete, hover, parseDocument } from "./service.js";
import { describe, type Entry } from "./catalog.js";

const kinds = {
  keyword: vscode.CompletionItemKind.Keyword,
  type: vscode.CompletionItemKind.TypeParameter,
  property: vscode.CompletionItemKind.Property,
  value: vscode.CompletionItemKind.EnumMember,
  module: vscode.CompletionItemKind.Module,
};

function documentation(item: Entry, language: string) {
  const markdown = new vscode.MarkdownString();
  if (item.signature) {
    markdown.appendCodeblock(item.signature, language);
  }
  markdown.appendText(describe(item));
  return markdown;
}

export function activate(context: vscode.ExtensionContext) {
  const cache = new WeakMap<
    vscode.TextDocument,
    { version: number; language: string; parsed: ReturnType<typeof parseDocument> }
  >();

  function parsed(document: vscode.TextDocument) {
    const previous = cache.get(document);
    if (previous?.version === document.version && previous.language === document.languageId) {
      return previous.parsed;
    }

    const result = parseDocument(
      document.languageId === "zap" ? "zap" : "blink",
      document.getText(),
    );
    cache.set(document, {
      version: document.version,
      language: document.languageId,
      parsed: result,
    });
    return result;
  }

  const selector = [{ language: "zap" }, { language: "blink" }];
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        provideCompletionItems(document, position, cancellation) {
          if (cancellation.isCancellationRequested) {
            return [];
          }

          const result = complete(parsed(document), document.offsetAt(position));
          const range = new vscode.Range(
            document.positionAt(result.start),
            document.positionAt(result.end),
          );
          const items = result.items.map((entry) => {
            const item = new vscode.CompletionItem(entry.label, kinds[entry.kind]);
            item.detail = document.languageId === "zap" ? "Zap" : "Blink";
            item.documentation = documentation(entry, document.languageId);
            item.range = range;
            item.insertText = entry.insertText
              ? new vscode.SnippetString(entry.insertText)
              : entry.label;
            if (entry.kind === "property" && entry.insertText) {
              item.command = { command: "editor.action.triggerSuggest", title: "Suggest a value" };
            }
            return item;
          });
          return new vscode.CompletionList(items, result.isIncomplete);
        },
      },
      ".",
      ":",
      "=",
      " ",
      "<",
      "{",
      "(",
      "[",
    ),
    vscode.languages.registerHoverProvider(selector, {
      provideHover(document, position, cancellation) {
        if (cancellation.isCancellationRequested) {
          return undefined;
        }

        const result = hover(parsed(document), document.offsetAt(position));
        if (!result) {
          return undefined;
        }

        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(result.signature ?? result.label, document.languageId);
        markdown.appendText(result.documentation);
        return new vscode.Hover(
          markdown,
          new vscode.Range(document.positionAt(result.start), document.positionAt(result.end)),
        );
      },
    }),
  );
}
