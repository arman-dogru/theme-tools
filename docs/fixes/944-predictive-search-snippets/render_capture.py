"""Renders the #944 captures into PNGs (needs matplotlib).

before-after.png     UndefinedObject offenses on repro-theme, base vs branch
                     (theme-check-before.txt / theme-check-after.txt).
ls-before-after.png  Language server completion/hover probes, base vs branch
                     (ls-before.tsv / ls-after.tsv from ls-capture.mjs).
"""
import pathlib
import textwrap

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

here = pathlib.Path(__file__).parent
RED, GREEN, AMBER = "#b22222", "#1f6f2f", "#b26b00"
# Offenses that disappear only because the caller is unknown (documented limitation).
KNOWN_LIMITATION = ("snippets/layout-rendered-search.liquid",)


def offenses(name):
    lines = (here / name).read_text().strip().splitlines()
    return [l for l in lines if not l.endswith("offense(s)")]


def render_offenses():
    before, after = offenses("theme-check-before.txt"), offenses("theme-check-after.txt")
    rows = before + [l for l in after if l not in before]
    fig, ax = plt.subplots(figsize=(11.5, 0.42 * (len(rows) + 3)))
    ax.axis("off")
    ax.set_title("UndefinedObject on repro-theme: base ee5ab68 (before) vs branch (after)",
                 loc="left", fontsize=11)
    for i, line in enumerate(rows):
        y = 1 - (i + 1) / (len(rows) + 1)
        if line in before and line in after:
            status, color = "still reported (true positive)", GREEN
        elif line in before and line.startswith(KNOWN_LIMITATION):
            status, color = "now accepted (known limitation)", AMBER
        elif line in before:
            status, color = "fixed (false positive)", RED
        else:
            status, color = "NEW offense", RED
        ax.text(0.0, y, line.replace(" [UndefinedObject]", ""), family="monospace", fontsize=9,
                color="black" if color == GREEN else color)
        ax.text(0.80, y, status, fontsize=9, color=color, weight="bold")
    ax.text(0.0, 0.0, f"before: {len(before)} offenses   after: {len(after)} offenses   "
            "(amber: snippet rendered only from a layout; the path can't tell the caller)",
            fontsize=10, weight="bold")
    fig.savefig(here / "before-after.png", dpi=130, bbox_inches="tight")


def probes(name):
    out = {}
    for line in (here / name).read_text().strip().splitlines():
        if line.startswith("#"):
            continue
        pid, mode, file, source, result = line.split("\t")
        out[pid] = (mode, file, source, result)
    return out


def render_ls():
    before, after = probes("ls-before.tsv"), probes("ls-after.tsv")
    ids = list(after)
    cells, colors = [], []
    for pid in ids:
        mode, file, source, res_after = after[pid]
        res_before = before[pid][3]
        wrap = lambda s, n: "\n".join(textwrap.wrap(s, n, break_long_words=True)) or s
        cells.append(
            [pid, f"{mode}\n{file}", wrap(source, 40), wrap(res_before, 30), wrap(res_after, 30)]
        )
        changed = res_before != res_after
        colors.append(["white", "white", "white",
                       "#fde2e2" if changed else "white", "#e2f5e6" if changed else "white"])
    fig, ax = plt.subplots(figsize=(14, 0.75 * (len(ids) + 2)))
    ax.axis("off")
    ax.set_title("Language server (docset built by pnpm build): base ee5ab68 vs branch; "
                 "shaded cells changed; C*/H* are targets, K* are controls (expected unchanged)",
                 loc="left", fontsize=11)
    table = ax.table(cellText=cells, cellColours=colors,
                     colLabels=["probe", "mode / file", "source (█ = cursor)", "before", "after"],
                     colWidths=[0.05, 0.15, 0.30, 0.25, 0.25], loc="upper left", cellLoc="left")
    table.auto_set_font_size(False)
    table.set_fontsize(8)
    for (r, _), cell in table.get_celld().items():
        cell.set_height(0.08 if r else 0.045)
        if r == 0:
            cell.set_text_props(weight="bold")
    fig.savefig(here / "ls-before-after.png", dpi=130, bbox_inches="tight")


render_offenses()
render_ls()
print("wrote", here / "before-after.png", "and", here / "ls-before-after.png")
