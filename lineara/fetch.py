"""Download the upstream corpus files at a pinned commit and verify their hashes.

The upstream data is not committed to this repository: part of it is
CC BY-NC-SA (SigLA-derived) and part comes from lineara.xyz, which carries no
licence. Fetching at a pinned commit keeps builds reproducible without
redistributing it.
"""

import hashlib
import shutil
import subprocess
import urllib.request
from pathlib import Path

REPO = "Navarre-AI/linear-a"
COMMIT = "3a83a327505bd5e01c41f05185fdcd74a40fb062"
FILES = {
    "corpus.json": "34b2d7d65c1377367e9a393cfa4004f6f9101f4ee5eea9f9b1a2ba830466ff59",
    "signs.json": "7af75c6e5ee15e44d749222d6c6cebb09b9f9f0369b3dd5b6430451314a95387",
}

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM_DIR = ROOT / "data" / "upstream" / ("navarre-" + COMMIT[:12])


def _url(name):
    return "https://raw.githubusercontent.com/%s/%s/linear_a/data/%s" % (REPO, COMMIT, name)


def _sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _download(url, dest):
    try:
        with urllib.request.urlopen(url, timeout=60) as resp, open(dest, "wb") as out:
            shutil.copyfileobj(resp, out)
    except OSError:
        # The macOS system Python often lacks a CA bundle; curl uses the system store.
        subprocess.run(["curl", "-fsSL", "-o", str(dest), url], check=True)


def fetch(force=False, log=print):
    """Ensure every pinned upstream file is present and matches its hash. Returns the directory."""
    UPSTREAM_DIR.mkdir(parents=True, exist_ok=True)
    for name, expected in FILES.items():
        path = UPSTREAM_DIR / name
        if path.exists() and not force and _sha256(path) == expected:
            continue
        log("fetching %s @ %s" % (name, COMMIT[:12]))
        tmp = path.with_suffix(".part")
        _download(_url(name), tmp)
        actual = _sha256(tmp)
        if actual != expected:
            tmp.unlink()
            raise RuntimeError("%s: sha256 %s does not match pinned %s" % (name, actual, expected))
        tmp.replace(path)
    return UPSTREAM_DIR
