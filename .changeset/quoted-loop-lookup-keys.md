---
'@shopify/theme-check-common': patch
---

Fix `LiquidHTMLSyntaxError` false positive on `for`/`tablerow` loops whose collection uses a quoted key with spaces or commas (e.g. `product.options_by_name['hello world'].values`), and stop its autofix (and the `assign`/`echo` trailing-value autofixes) from cutting bracketed lookups in half.
