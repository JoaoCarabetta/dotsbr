"""Cluster adjacent census tracts by density for coarse-zoom dots.

mapshaper -dots scatters points uniformly inside whatever polygon it is
given. Municipality polygons therefore paint empty interiors (the DF
rectangle). This builder merges neighboring setores of the same density
class until each cluster has about `target_pop` people, so dots stay on
settlements while still aggregating people for zooms 3–6.

geopandas hangs here and this mapshaper has no -neighbors, so adjacency
comes from shared TopoJSON arcs (stdlib). Run after build_census_tract.py.
"""

from __future__ import annotations

import csv
import heapq
import json
import math
import sys
from collections import defaultdict
from itertools import combinations
from pathlib import Path

from build_census_tract import ensure_malha
from ibge_uf import parse_uf, run_mapshaper
from themes import Theme, get_theme

# Urban fabric (1–3) and rural settlements/povoados (5–7). Zona rural (8)
# and empty (9) stay sparse so a village is not dissolved into hinterland.
DENSE_SITS = {"1", "2", "3", "5", "6", "7"}

# target_pop ≈ per_dot of that zoom so a cluster can emit at least one
# dot. Steps ~2.25× into z7 (4500 / 2000 / 900 / 400 / 150).
def sit_code(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def density_class(cd_sit) -> str:
    return "dense" if sit_code(cd_sit) in DENSE_SITS else "sparse"


def flatten_arcs(arcs) -> list[int]:
    out: list[int] = []

    def walk(node) -> None:
        if isinstance(node, int):
            out.append(node)
        elif node is not None:
            for child in node:
                walk(child)

    walk(arcs)
    return out


def neighbors_from_topojson(topo: dict) -> list[set[int]]:
    """Rook adjacency: two polygons that share a TopoJSON arc are neighbors."""
    obj = next(iter(topo["objects"].values()))
    geoms = obj["geometries"]
    n = len(geoms)
    nbr: list[set[int]] = [set() for _ in range(n)]
    arc_to: dict[int, list[int]] = defaultdict(list)
    for i, geom in enumerate(geoms):
        for arc in flatten_arcs(geom.get("arcs")):
            # Negative index is the same arc reversed (~a == -a-1).
            arc_to[arc if arc >= 0 else ~arc].append(i)
    for ids in arc_to.values():
        uniq = sorted(set(ids))
        if len(uniq) < 2:
            continue
        for a, b in combinations(uniq, 2):
            nbr[a].add(b)
            nbr[b].add(a)
    return nbr


def cluster_ids(
    pops: list[float],
    areas: list[float],
    classes: list[str],
    nbr: list[set[int]],
    target_pop: float,
) -> list[int]:
    """Greedy same-class merge until both sides meet target_pop."""
    n = len(pops)
    parent = list(range(n))
    pop = list(pops)
    area = list(areas)
    adj: list[set[int]] = [set(ids) for ids in nbr]

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def density(root: int) -> float:
        return pop[root] / max(area[root], 1e-9)

    def score(a: int, b: int) -> tuple:
        # Similar density first; then smaller combined pop so tiny leftovers
        # attach before two large clusters swallow each other.
        da = density(a) + 1e-9
        db = density(b) + 1e-9
        return (abs(math.log(da) - math.log(db)), pop[a] + pop[b], min(a, b), max(a, b))

    def union(a: int, b: int) -> int:
        a, b = find(a), find(b)
        if a == b:
            return a
        if pop[a] > pop[b]:
            a, b = b, a
        parent[a] = b
        pop[b] += pop[a]
        area[b] += area[a]
        for nb in list(adj[a]):
            nb = find(nb)
            if nb == b:
                continue
            adj[b].add(nb)
            adj[nb].discard(a)
            adj[nb].add(b)
        adj[a].clear()
        adj[b].discard(a)
        adj[b].discard(b)
        return b

    heap: list[tuple] = []
    for i in range(n):
        for j in nbr[i]:
            if j < i:
                continue
            if classes[i] != classes[j]:
                continue
            heapq.heappush(heap, (score(i, j), i, j))

    while heap:
        _, a0, b0 = heapq.heappop(heap)
        a, b = find(a0), find(b0)
        if a == b or classes[a] != classes[b]:
            continue
        if pop[a] >= target_pop and pop[b] >= target_pop:
            continue
        root = union(a, b)
        for nb in list(adj[root]):
            nb = find(nb)
            if nb == root or classes[nb] != classes[root]:
                continue
            if pop[root] >= target_pop and pop[nb] >= target_pop:
                continue
            heapq.heappush(heap, (score(root, nb), root, nb))

    # Attach leftovers below target to the nearest same-class neighbor even
    # if that neighbor is already large, so people are not dropped.
    for _ in range(n):
        moved = False
        for i in range(n):
            if find(i) != i or pop[i] >= target_pop:
                continue
            cands = []
            for nb in adj[i]:
                r = find(nb)
                if r != i and classes[r] == classes[i]:
                    cands.append(r)
            if not cands:
                continue
            union(i, min(cands, key=lambda r: score(i, r)))
            moved = True
            break
        if not moved:
            break

    return [find(i) for i in range(n)]


def prepare_working(uf: str, theme: Theme) -> Path:
    out_dir = theme.output_dir
    counts_csv = out_dir / f"census_tract_{uf}_counts.csv"
    if not counts_csv.exists():
        raise SystemExit(
            f"Missing {counts_csv}. Run: python3 scripts/build_census_tract.py {uf} {theme.id}"
        )
    shp = ensure_malha(uf)
    work = out_dir / f"cluster_{uf}_working.geojson"
    # Join theme counts onto the malha so CD_SIT / AREA_KM2 survive; the
    # published census_tract GeoJSON drops those fields.
    run_mapshaper(
        [
            str(shp),
            "-rename-fields",
            "id_setor_censitario=CD_SETOR",
            "-join",
            str(counts_csv),
            "keys=id_setor_censitario,id_setor_censitario",
            "string-fields=id_setor_censitario,id_apond",
            "-o",
            "format=geojson",
            str(work),
        ]
    )
    return work


def load_features(work: Path) -> tuple[list[dict], list[set[int]]]:
    topo_path = work.with_suffix(".topojson")
    run_mapshaper([str(work), "-o", "format=topojson", str(topo_path)])
    topo = json.loads(topo_path.read_text(encoding="utf-8"))
    obj = next(iter(topo["objects"].values()))
    features = [g.get("properties") or {} for g in obj["geometries"]]
    return features, neighbors_from_topojson(topo)


def num_prop(value) -> float:
    if value in (None, ""):
        return 0.0
    return float(value)


def write_zoom(
    uf: str,
    theme: Theme,
    work: Path,
    features: list[dict],
    nbr: list[set[int]],
    zoom: int,
) -> None:
    target = theme.per_dot[zoom - 3]
    pops = [num_prop(p.get(theme.total_field)) for p in features]
    areas = [num_prop(p.get("AREA_KM2")) for p in features]
    # Religion mix is valid only inside the weighting area. Prefix the class
    # so adjacent setores from two APONDs never dissolve across that border.
    if theme.id == "religion":
        classes = [
            f"{p.get('id_apond') or ''}|{density_class(p.get('CD_SIT'))}"
            for p in features
        ]
    else:
        classes = [density_class(p.get("CD_SIT")) for p in features]
    roots = cluster_ids(pops, areas, classes, nbr, target)

    remap: dict[int, int] = {}
    labels: list[int] = []
    for root in roots:
        if root not in remap:
            remap[root] = len(remap)
        labels.append(remap[root])

    assign_csv = theme.output_dir / f"cluster_{uf}_z{zoom}_assign.csv"
    with assign_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh, fieldnames=["id_setor_censitario", "cluster_id", "density_class"]
        )
        writer.writeheader()
        for props, cluster, cls in zip(features, labels, classes):
            writer.writerow(
                {
                    "id_setor_censitario": props.get("id_setor_censitario"),
                    "cluster_id": f"{uf}-z{zoom}-{cluster:05d}",
                    "density_class": cls,
                }
            )

    out_path = theme.output_dir / f"cluster_{uf}_z{zoom}.geojson"
    category_sum = ",".join(theme.categories)
    run_mapshaper(
        [
            str(work),
            "-join",
            str(assign_csv),
            "keys=id_setor_censitario,id_setor_censitario",
            "string-fields=id_setor_censitario,cluster_id,density_class",
            "-dissolve",
            "cluster_id",
            f"sum-fields={category_sum},{theme.total_field}",
            "copy-fields=sigla_uf,density_class,id_apond"
            if theme.id == "religion"
            else "copy-fields=sigla_uf,density_class",
            "-o",
            "format=geojson",
            str(out_path),
        ]
    )

    n_dense = sum(1 for cls in classes if cls == "dense")
    n_sparse = len(classes) - n_dense
    n_clusters = len(remap)
    print(
        f"wrote {out_path} zoom={zoom} target_pop={target} "
        f"setores={len(features)} dense={n_dense} sparse={n_sparse} "
        f"clusters={n_clusters}"
    )


def parse_zooms(raw: str | None) -> list[int]:
    if not raw:
        return [3, 4, 5, 6]
    zooms = []
    for part in raw.split(","):
        z = int(part.strip())
        if z not in (3, 4, 5, 6):
            known = "3, 4, 5, 6"
            raise SystemExit(f"Unknown cluster zoom {z}. Expected one of: {known}")
        zooms.append(z)
    return zooms


def main(argv: list[str] | None = None) -> None:
    args = argv if argv is not None else sys.argv[1:]
    if not 1 <= len(args) <= 3:
        raise SystemExit(f"Usage: {sys.argv[0]} <UF> [zooms] [race|income|deaths|religion]")
    uf = parse_uf(args[0])
    # Allow `script UF religion` (theme as 2nd arg) like makefiles.sh.
    if len(args) >= 2 and args[1] in ("race", "income", "deaths", "religion"):
        zooms = parse_zooms(None)
        theme = get_theme(args[1])
    else:
        zooms = parse_zooms(args[1] if len(args) > 1 else None)
        theme = get_theme(args[2] if len(args) > 2 else None)
    theme.output_dir.mkdir(parents=True, exist_ok=True)
    work = prepare_working(uf, theme)
    features, nbr = load_features(work)
    deg = sum(len(s) for s in nbr) / max(len(nbr), 1)
    print(
        f"adjacency setores={len(features)} mean_neighbors={deg:.1f}",
        flush=True,
    )
    for zoom in zooms:
        write_zoom(uf, theme, work, features, nbr, zoom)


if __name__ == "__main__":
    main()
