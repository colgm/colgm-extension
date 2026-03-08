# Colgm Language Support

## Features

- **Syntax Highlighting** - Full syntax highlighting for `.colgm` files
- **Autocompletion** - Keywords and primitive types with descriptions
- **Hover Information** - Hover over keywords and types to see documentation
- **Diagnostics** - Basic syntax error detection (unmatched braces/parentheses)
- **Document Symbols** - Navigate functions, structs, and enums in the outline view

## Supported Language Features

| Feature          | Description                                               |
| ---------------- | --------------------------------------------------------- |
| Autocompletion   | Auto or `Ctrl+Space`, also triggered by `.` and `:`       |
| Hover            | Hover over keywords/types to see descriptions             |
| Diagnostics      | Errors for unmatched braces and parentheses               |
| Document Symbols | View functions, structs, and enums in outline view        |

## Requirements

- None

## Extension Settings

| Setting              | Description                                 | Default |
| -------------------- | ------------------------------------------- | ------- |
| `colgm.trace.server` | Trace communication between VS Code and     | `off`   |
|                      | language server                             |         |

## Known Issues

- None

## Release Notes

### 0.0.5

- **Added LSP support** with autocompletion, hover, and diagnostics
- **Added document symbol provider** for navigating code structure

### 0.0.4

- Delete some unnecessary keywords.
- Add reserved word `nil`.

### 0.0.3

- Fix `and` `or`, and dot access highlighting issues.
- Add `elsif` keyword highlighting.

### 0.0.2

- Add new keyword `defer`.

### 0.0.1

- Initial release of colgm extension.
- Simple syntax highlighting is provided.
