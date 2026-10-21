---
'@shopify/theme-check-common': patch
'@shopify/theme-language-server-common': patch
---

`UndefinedObject` no longer reports `predictive_search` as undefined in theme-mode snippets that use `{% doc %}`, and the language server now types `section`, `block` and `predictive_search` in theme-mode snippets, matching the objects the check allows there (#944).
