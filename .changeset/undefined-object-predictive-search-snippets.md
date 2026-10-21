---
'@shopify/theme-check-common': minor
'@shopify/theme-language-server-common': patch
---

`UndefinedObject` no longer reports section objects (`predictive_search`, `recommendations`, `comment`) as undefined in theme blocks and theme-mode snippets, and the language server now types and completes them there.

A theme block is rendered inside a section and a snippet is usually rendered from a section or block, and `render` gives a snippet access to the objects directly accessible where it is rendered. The file path can't tell who renders a snippet, so this is potential availability, not a guarantee: a snippet rendered directly from a layout or template is accepted too. This matches the existing broad allowance for `section` and `block` in snippets.

`@shopify/theme-check-common` now exports the contextual-object lists (`SECTION_CONTEXTUAL_OBJECTS`, `THEME_BLOCK_AND_SNIPPET_CONTEXTUAL_OBJECTS`, `APP_BLOCK_CONTEXTUAL_OBJECTS`, `CHECKOUT_LAYOUT_CONTEXTUAL_OBJECTS`). The check and the language server now share these definitions; each still classifies file paths on its own.
