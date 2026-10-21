---
'@shopify/theme-check-common': minor
'@shopify/theme-language-server-common': patch
---

`UndefinedObject` no longer reports section objects (`predictive_search`, `recommendations`, `comment`) as undefined in theme blocks and theme-mode snippets, and the language server now types and completes them there.

A theme block is rendered inside a section and a snippet is rendered from a section or block, and `render` gives a snippet access to the objects directly accessible where it is rendered. `@shopify/theme-check-common` now exports the contextual-object lists (`SECTION_CONTEXTUAL_OBJECTS`, `THEME_BLOCK_AND_SNIPPET_CONTEXTUAL_OBJECTS`, `APP_BLOCK_CONTEXTUAL_OBJECTS`, `CHECKOUT_LAYOUT_CONTEXTUAL_OBJECTS`), which the check and the language server share so they can no longer drift apart.
