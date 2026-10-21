#!/usr/bin/env bash
# Regenerates every capture for the #944 fix:
#   theme-check-{before,after}.txt  UndefinedObject on repro-theme (offenses.mjs)
#   ls-{before,after}.tsv           language server completions/hover (ls-capture.mjs)
#   tests-{before,after}.txt        the touched spec files
#   before-after.png, ls-before-after.png (render_capture.py, needs matplotlib)
# "Before" is BASE's check and TypeSystem sources with this branch's tests.
# Run from the theme-tools root on the fix branch with a clean tree:
#   PYTHON=/path/to/python-with-matplotlib docs/fixes/944-predictive-search-snippets/capture.sh
set -euo pipefail
BASE=${BASE:-ee5ab68}
D=docs/fixes/944-predictive-search-snippets
SRC="packages/theme-check-common/src/checks/undefined-object/index.ts packages/theme-language-server-common/src/TypeSystem.ts"
SPECS="packages/theme-check-common/src/checks/undefined-object packages/theme-language-server-common/src/TypeSystem.spec.ts packages/theme-language-server-common/src/completions/providers/ObjectCompletionProvider.spec.ts"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "capture.sh: tracked files have uncommitted changes; commit or stash them first" >&2
  exit 1
fi
restore() { git checkout -q HEAD -- $SRC; }
trap restore EXIT

build() {
  (cd packages/theme-check-common && npx tsc -b tsconfig.build.json)
  (cd packages/theme-check-node && npx tsc -b tsconfig.build.json)
  (cd packages/theme-language-server-common && npx tsc -b src/tsconfig.build.json)
}
strip() { sed -E 's/\x1b\[[0-9;]*m//g; /(Start at|Duration) /d' | sed -E "s#$PWD/##g; s#$PWD\b#.#g; s/ +$//; s/ [0-9]+ms$//"; }
capture() {
  build
  node $D/offenses.mjs . $D/repro-theme > $D/theme-check-$1.txt
  node $D/ls-capture.mjs . > $D/ls-$1.tsv
  npx vitest run $SPECS 2>&1 | strip > $D/tests-$1.txt || true
}

git checkout -q "$BASE" -- $SRC
capture before
restore
capture after
"${PYTHON:-python3}" $D/render_capture.py
