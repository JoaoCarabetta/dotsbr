"""Audit and rebuild the dot tiles so every zoom is an unbiased sample.

`mapshaper -dots` turns each polygon's count into `Math.round(value /
per_dot)` dots per category. A group smaller than half a dot in a polygon
therefore never gets a dot, and at coarse zooms (large per_dot) that erases
most small groups: national z5 had preta at 4.5% of the race dots against
10.2% in the census.

The fix derives zooms 3–13 from z14 (the finest level, 20 people per race
dot) by keeping each z14 dot with probability per_dot[z14] / per_dot[z].
That is unbiased by construction for every category and every place, keeps
each dot inside its own setor (so the density clusters are no longer needed
at z3–6), and nests the zooms: a zoom's dots are a subset of the next
zoom's, so zooming in only adds dots instead of reshuffling them.

    python3 scripts/dot_tiles.py audit race             # national shares per zoom
    python3 scripts/dot_tiles.py thin race RJ SP        # rebuild z3–13 for some UFs
    python3 scripts/dot_tiles.py thin religion          # every UF of a theme
    python3 scripts/dot_tiles.py thin race RJ z5 z6     # only some zooms

`thin` needs tippecanoe on PATH (or TIPPECANOE=/path/to/tippecanoe).
Tiles are written without tippecanoe's size/feature limits: the default
`--drop-fraction-as-needed` silently thinned dense metro tiles (z7–9 lost
~10% of people and households, most of them in the richest, whitest tiles).
The unused `r` attribute mapshaper adds is left out to keep tiles small.
Stdlib only.
"""

from __future__ import annotations

import gzip
import math
import os
import random
import sqlite3
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

from themes import THEMES

ROOT = Path(__file__).resolve().parents[1]
TILES = ROOT / "tiles"
ZOOMS = range(3, 15)
FINEST = 14

UFS = (
    "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO"
).split()

# Dot property per theme, as written by makefiles.sh (save-as=).
PROP = {"race": "race", "income": "cat", "deaths": "cat", "religion": "cat"}


def categories(theme: str) -> tuple[str, ...]:
    return THEMES[theme].categories


def per_dot(theme: str, zoom: int) -> int:
    return THEMES[theme].per_dot[zoom - 3]


def mbtiles_path(theme: str, uf: str, zoom: int) -> Path:
    base = TILES / uf if theme == "race" else TILES / theme / uf
    return base / f"zoom{zoom}-{zoom}" / "tiles.mbtiles"


# ---------- Mapbox Vector Tile decoding (points only) ----------

def _varint(b: bytes, i: int) -> tuple[int, int]:
    c = b[i]
    if c < 0x80:
        return c, i + 1
    result = c & 0x7F
    shift = 7
    i += 1
    while True:
        c = b[i]
        i += 1
        result |= (c & 0x7F) << shift
        if c < 0x80:
            return result, i
        shift += 7


def _packed(b: bytes, i: int, end: int) -> list[int]:
    out = []
    while i < end:
        v, i = _varint(b, i)
        out.append(v)
    return out


def _skip(b: bytes, i: int, wire: int) -> int:
    if wire == 0:
        return _varint(b, i)[1]
    if wire == 1:
        return i + 8
    if wire == 2:
        n, i = _varint(b, i)
        return i + n
    if wire == 5:
        return i + 4
    raise ValueError(f"wire type {wire}")


def _string_value(b: bytes, i: int, end: int) -> str | None:
    while i < end:
        key, i = _varint(b, i)
        if key == (1 << 3 | 2):
            n, i = _varint(b, i)
            return b[i:i + n].decode()
        i = _skip(b, i, key & 7)
    return None


def decode_points(data: bytes, prop: str):
    """Yield (x, y, category) in tile units for the `points` layer, skipping
    tippecanoe's buffer copies (coordinates outside [0, extent))."""
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    i, n = 0, len(data)
    while i < n:
        key, i = _varint(data, i)
        if key != (3 << 3 | 2):
            i = _skip(data, i, key & 7)
            continue
        size, i = _varint(data, i)
        yield from _decode_layer(data, i, i + size, prop)
        i += size


def _decode_layer(b: bytes, i: int, end: int, prop: str):
    name = None
    keys: list[str] = []
    values: list[str | None] = []
    features: list[tuple[int, int]] = []
    extent = 4096
    while i < end:
        key, i = _varint(b, i)
        field, wire = key >> 3, key & 7
        if wire == 2:
            size, i = _varint(b, i)
            if field == 1:
                name = b[i:i + size].decode()
            elif field == 2:
                features.append((i, i + size))
            elif field == 3:
                keys.append(b[i:i + size].decode())
            elif field == 4:
                values.append(_string_value(b, i, i + size))
            i += size
        elif field == 5:
            extent, i = _varint(b, i)
        else:
            i = _skip(b, i, wire)
    if name != "points" or prop not in keys:
        return
    kidx = keys.index(prop)
    for fs, fe in features:
        tags: list[int] = []
        geom: list[int] = []
        j = fs
        while j < fe:
            key, j = _varint(b, j)
            if key == (2 << 3 | 2):
                size, j = _varint(b, j)
                tags = _packed(b, j, j + size)
                j += size
            elif key == (4 << 3 | 2):
                size, j = _varint(b, j)
                geom = _packed(b, j, j + size)
                j += size
            else:
                j = _skip(b, j, key & 7)
        cat = None
        for t in range(0, len(tags) - 1, 2):
            if tags[t] == kidx:
                cat = values[tags[t + 1]]
                break
        if cat is None:
            continue
        # MoveTo with `count` points; deltas are zigzag-encoded.
        x = y = 0
        g = 0
        while g < len(geom):
            cmd = geom[g]
            count = cmd >> 3
            g += 1
            for _ in range(count):
                dx, dy = geom[g], geom[g + 1]
                g += 2
                x += (dx >> 1) ^ -(dx & 1)
                y += (dy >> 1) ^ -(dy & 1)
                if 0 <= x < extent and 0 <= y < extent:
                    yield x / extent, y / extent, cat


def read_dots(path: Path, zoom: int, prop: str):
    """Yield (mx, my, category) with mx/my in Web Mercator [0, 1)."""
    if not path.exists():
        return
    n = 1 << zoom
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        rows = con.execute(
            "select tile_column, tile_row, tile_data from tiles "
            "where zoom_level = ? order by tile_column, tile_row",
            (zoom,),
        )
        for col, row, data in rows:
            ty = n - 1 - row  # MBTiles rows are TMS
            for fx, fy, cat in decode_points(data, prop):
                yield (col + fx) / n, (ty + fy) / n, cat
    finally:
        con.close()


# ---------- audit ----------

def audit(theme: str, ufs: list[str]) -> None:
    keys = categories(theme)
    rows = {}
    for z in ZOOMS:
        c: Counter[str] = Counter()
        for uf in ufs:
            for _, _, cat in read_dots(mbtiles_path(theme, uf, z), z, PROP[theme]):
                c[cat] += 1
        rows[z] = c
    ref = rows[FINEST]
    ref_total = sum(ref.values())
    head = "zoom  per_dot      dots   implied  " + "  ".join(f"{k.split('_', 1)[-1][:10]:>10}" for k in keys)
    print(f"{theme} · {len(ufs)} UF · shares of dots (Δ vs z{FINEST} in pp)\n{head}")
    for z in ZOOMS:
        c = rows[z]
        total = sum(c.values()) or 1
        cells = []
        for k in keys:
            share = 100 * c[k] / total
            delta = share - 100 * ref[k] / (ref_total or 1)
            cells.append(f"{share:5.1f}{delta:+5.1f}" if z != FINEST else f"{share:10.1f}")
        implied = sum(c.values()) * per_dot(theme, z)
        print(f"{z:>4} {per_dot(theme, z):>8} {sum(c.values()):>9} {implied / 1e6:8.2f}M  " + "  ".join(cells))


# ---------- thin ----------

def _lonlat(mx: float, my: float) -> tuple[float, float]:
    lon = mx * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * my))))
    return lon, lat


def tippecanoe_args(zoom: int) -> list[str]:
    # Shared with makefiles.sh (z14 from source): one zoom per archive,
    # never drop dots to fit a tile budget.
    return ["-l", "points", f"-z{zoom}", f"-Z{zoom}", "--force", "-P", "-r1",
            "--no-feature-limit", "--no-tile-size-limit", "-x", "r", "-q"]


def thin(theme: str, ufs: list[str], zooms: list[int]) -> None:
    prop = PROP[theme]
    tippecanoe = os.environ.get("TIPPECANOE", "tippecanoe")
    for uf in ufs:
        src = mbtiles_path(theme, uf, FINEST)
        # A fixed draw per dot, in a fixed read order: reruns are identical and
        # every zoom keeps the dots whose draw is under its probability, so
        # coarser zooms are always subsets of finer ones.
        rng = random.Random(f"dotsbr-{theme}-{uf}")
        dots = [(mx, my, cat, rng.random()) for mx, my, cat in read_dots(src, FINEST, prop)]
        if not dots:
            print(f"{theme} {uf}: no z{FINEST} dots at {src}", file=sys.stderr)
            continue
        for z in zooms:
            keep = per_dot(theme, FINEST) / per_dot(theme, z)
            out = mbtiles_path(theme, uf, z)
            out.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile("w", suffix=".geojsonl", delete=False) as fh:
                kept = 0
                for mx, my, cat, u in dots:
                    if u >= keep:
                        continue
                    lon, lat = _lonlat(mx, my)
                    fh.write(
                        '{"type":"Feature","properties":{"%s":"%s"},'
                        '"geometry":{"type":"Point","coordinates":[%.7f,%.7f]}}\n'
                        % (prop, cat, lon, lat)
                    )
                    kept += 1
                tmp = fh.name
            try:
                subprocess.run([tippecanoe, "-o", str(out), *tippecanoe_args(z), tmp], check=True)
            finally:
                os.unlink(tmp)
            print(f"{theme} {uf} z{z}: {kept} dots (keep {keep:.4f} of {len(dots)})", flush=True)


def main(argv: list[str]) -> None:
    if len(argv) < 2 or argv[0] not in {"audit", "thin", "per-dot", "tippecanoe-args"} or argv[1] not in THEMES:
        raise SystemExit(__doc__)
    cmd, theme, rest = argv[0], argv[1], [a.upper() for a in argv[2:]]
    # Tiny helpers so makefiles.sh reads the same tables and flags.
    if cmd == "per-dot":
        print(per_dot(theme, int(rest[0]) if rest else FINEST))
        return
    if cmd == "tippecanoe-args":
        print(" ".join(tippecanoe_args(int(rest[0]) if rest else FINEST)))
        return
    zooms = [int(a[1:]) for a in rest if a.startswith("Z")] or list(range(3, FINEST))
    ufs = [a for a in rest if not a.startswith("Z")] or list(UFS)
    unknown = [u for u in ufs if u not in UFS]
    if unknown:
        raise SystemExit(f"unknown UF: {' '.join(unknown)}")
    if cmd == "audit":
        audit(theme, ufs)
    else:
        thin(theme, ufs, zooms)


if __name__ == "__main__":
    main(sys.argv[1:])
