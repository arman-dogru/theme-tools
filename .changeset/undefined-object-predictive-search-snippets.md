---
'@shopify/theme-check-common': patch
'@shopify/theme-language-server-common': patch
---

`UndefinedObject` no longer reports section objects (`predictive_search`, `recommendations`, `comment`) as undefined in theme blocks and theme-mode snippets, and the language server now types and completes them there.

A theme block is rendered inside a section and a snippet is rendered from a section or block, and `render` gives a snippet access to the objects directly accessible where it is rendered. The contextual-object lists are now exported from `@shopify/theme-check-common` and shared by the check and the language server, so the two can no longer drift apart.
