#!/usr/bin/env bash
# Regenerates theme-check-before.txt / theme-check-after.txt and tests-*.txt for #944.
# Run from the theme-tools root on the fix branch with a clean tree.
set -euo pipefail
D=docs/fixes/944-predictive-search-snippets
SPECS="packages/theme-check-common/src/checks/undefined-object packages/theme-language-server-common/src/TypeSystem.spec.ts packages/theme-language-server-common/src/completions/providers/ObjectCompletionProvider.spec.ts"
build() { (cd packages/theme-check-common && npx tsc -b tsconfig.build.json) && (cd packages/theme-check-node && npx tsc -b tsconfig.build.json); }
strip() { sed -E 's/\x1b\[[0-9;]*m//g; /(Start at|Duration) /d' | sed "s#$PWD/##g"; }
# Before: main's sources with this branch's tests
git checkout -q "${BASE:-origin/main}" -- packages/theme-check-common/src/checks/undefined-object/index.ts packages/theme-language-server-common/src/TypeSystem.ts
build && node $D/offenses.mjs . $D/repro-theme > $D/theme-check-before.txt
npx vitest run $SPECS 2>&1 | strip > $D/tests-before.txt || true
# After: this branch
git checkout -q HEAD -- packages
build && node $D/offenses.mjs . $D/repro-theme > $D/theme-check-after.txt
npx vitest run $SPECS 2>&1 | strip > $D/tests-after.txt
"${PYTHON:-python3}" $D/render_capture.py  # needs matplotlib
