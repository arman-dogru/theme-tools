# Repro for the quoted-lookup-key loop false positive (issue #1204)

Evidence for the `fix/1204-quoted-lookup-keys-in-loops` branch of this fork. Nothing here
is used by the packages or the test suite.

- `repro-theme/` is a minimal theme. `snippets/options-by-name.liquid` is valid Liquid that
  should produce no offenses. `snippets/true-positives.liquid` has real mistakes that must
  still be reported.
- `repro.mjs` runs Theme Check (LiquidHTMLSyntaxError only, using the theme's
  `.theme-check.yml`) through the built `@shopify/theme-check-node`. It prints the offenses,
  then autofixes a scratch copy and prints the diff autofix would write.
- `theme-check-before.txt` / `theme-check-after.txt` are the unedited output of `repro.mjs` on
  `main` (ee5ab68) and on this branch. `before-after.png` is the same text rendered by
  `render_capture.py`, with colour added.
- `offenses.mjs` lists every offense from every check with the theme's own config. Used for
  the Dawn regression run described below.

## Reproduce

```sh
# from the repo root, after `pnpm install` and `pnpm build:ts`
node docs/fixes/1204-quoted-lookup-keys/repro.mjs . docs/fixes/1204-quoted-lookup-keys/repro-theme

# Dawn regression check (all checks, Dawn's .theme-check.yml)
git clone --depth 1 https://github.com/Shopify/dawn.git /tmp/dawn
node docs/fixes/1204-quoted-lookup-keys/offenses.mjs . /tmp/dawn > dawn.txt
```

To get the "before" output, check out `main`'s versions of
`packages/theme-check-common/src/checks/liquid-html-syntax-error/checks/{utils,InvalidLoopArguments}.ts`,
then rebuild with `pnpm --filter @shopify/theme-check-common build:ts`.

Dawn 16.0.0 (258f00f) reports the same 9 offenses before and after this change.
