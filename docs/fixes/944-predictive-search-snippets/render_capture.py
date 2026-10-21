"""Renders theme-check-before.txt / theme-check-after.txt into before-after.png (#944)."""
import pathlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = pathlib.Path(__file__).parent
before = (here / "theme-check-before.txt").read_text().strip().splitlines()
after = set((here / "theme-check-after.txt").read_text().strip().splitlines())
rows = [l for l in before if not l.endswith("offense(s)")]
fig, ax = plt.subplots(figsize=(11, 0.42 * (len(rows) + 3)))
ax.axis("off")
ax.set_title(
    "UndefinedObject on repro-theme: main (before) vs fix/944 (after)", loc="left", fontsize=11
)
for i, line in enumerate(rows):
    kept = line in after
    y = 1 - (i + 1) / (len(rows) + 1)
    ax.text(0.0, y, line.replace(" [UndefinedObject]", ""), family="monospace", fontsize=9,
            color="black" if kept else "#b22222")
    ax.text(0.86, y, "still reported" if kept else "fixed (false positive)", fontsize=9,
            color="#1f6f2f" if kept else "#b22222", weight="bold")
n_after = len([l for l in after if not l.endswith("offense(s)")])
ax.text(0.0, 0.0, f"before: {len(rows)} offenses   after: {n_after} offenses", fontsize=10, weight="bold")
fig.savefig(here / "before-after.png", dpi=130, bbox_inches="tight")
print("wrote", here / "before-after.png")
