# Project Rules

## Philosophy
- This is a simple, personal project
- Simplicity > flexibility > performance
- Readability is the highest priority

## Hard Rules
- Do NOT introduce new frameworks or libraries
- Do NOT over-engineer
- Prefer modifying existing code over adding new layers
- Keep files small and simple
- Avoid abstraction unless absolutely necessary
- No "future-proofing" design

## Complexity Limits
- File < 300 lines (exception: data/i18n/translation files, large page components)
- Function < 50 lines
- Avoid deep nesting
- Avoid multi-level indirection

## Coding Style
- Write straightforward, linear logic
- Avoid magic, hidden behavior, or implicit flow
- One file = one responsibility

## Refactoring Rules
- Always prefer deleting code over adding code
- If something feels complex, simplify it
- If duplicate logic appears, merge it
