#!/usr/bin/env python3
"""Expand controlled sample religion to APOND, then allocate onto setores.

Religion is sample-only and only valid at the weighting area. Dots still
sit on setor polygons so they follow where people live (dasymetric),
but every setor in an APOND gets that APOND's mix.
"""

from __future__ import annotations

import csv
import os
import sys
from collections import defaultdict
from pathlib import Path

from build_census_tract import ensure_malha, mapshaper_join
from ibge_uf import (
    RACE_DIR,
    RAW_DIR,
    UF_CODES,
    download,
    parse_uf,
    run_mapshaper,
)
from themes import (
    P0410_TO_KEY,
    RELIGION_KEYS,
    THEMES,
    get_theme,
)

MICRODADOS_DIR = Path(
    os.environ.get(
        "MICRODADOS_DIR",
        str(
            Path.home()
            / "Downloads"
            / "microdados_censo_amostra_2022_csv_20260908_231350"
        ),
    )
)
DEPARA_URL = (
    "https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/"
    "malha_de_areas_de_ponderacao/censo_demografico_2022/"
    "DePara_SetorCensit22xAPOND22/CSV/"
    "DePara_SetorCensit22xAPOND22_{code}_{uf}.csv"
)
DEPARA_BR_URL = (
    "https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/"
    "malha_de_areas_de_ponderacao/censo_demografico_2022/"
    "DePara_SetorCensit22xAPOND22/CSV/"
    "DePara_SetorCensit22xAPOND22_Brasil.csv"
)
# Design floor of an APOND (~400 sample households) and a minimum raw n
# so a handful of interviews cannot paint a color on the map.
MIN_WEIGHTED = 400.0
MIN_UNWEIGHTED = 30
# IBGE 2022 sample prelim (people 10+): used only as a sanity check.
# Controlled files apply a 50% subsample in 100% sectors, so a small gap
# is expected; a large one means the expander is wrong.
OFFICIAL_SHARE = {
    "relig_catolica": 0.567,
    "relig_evangelica": 0.269,
    "relig_sem_religiao": 0.093,
}


def religion_dir() -> Path:
    return THEMES["religion"].output_dir


def apond_csv_path() -> Path:
    return religion_dir() / "apond_religion.csv"


def depara_path(uf: str) -> Path:
    code = UF_CODES[uf]
    return RAW_DIR / f"DePara_SetorCensit22xAPOND22_{code}_{uf}.csv"


def ensure_depara(uf: str) -> Path:
    dest = depara_path(uf)
    if not dest.exists():
        download(DEPARA_URL.format(code=UF_CODES[uf], uf=uf), dest)
    return dest


def religion_key(raw: str) -> str | None:
    return P0410_TO_KEY.get((raw or "").strip())


def parse_weight(raw: str) -> float:
    text = (raw or "").strip().replace(",", ".")
    if not text:
        return 0.0
    return float(text)


def _expand_uf(path: Path) -> tuple[dict[str, dict[str, float]], dict[str, dict[str, int]], int, int, int]:
    """Fast split-based pass: DictReader over 21M rows is too slow to restart."""
    weighted: dict[str, dict[str, float]] = defaultdict(
        lambda: {key: 0.0 for key in RELIGION_KEYS}
    )
    raw_n: dict[str, dict[str, int]] = defaultdict(
        lambda: {key: 0 for key in RELIGION_KEYS}
    )
    people = skipped_age = skipped_code = 0
    with path.open(encoding="latin-1", newline="") as fh:
        header = next(fh).rstrip("\n\r").split(";")
        try:
            i_apond = header.index("P0090")
            i_rel = header.index("P0410")
            i_w = header.index("P0111")
        except ValueError as exc:
            raise SystemExit(f"{path} missing P0090/P0410/P0111: {exc}") from exc
        for line in fh:
            cols = line.rstrip("\n\r").split(";")
            if len(cols) <= i_w:
                skipped_code += 1
                continue
            key = religion_key(cols[i_rel])
            if key is None:
                # Blank P0410 is under-10; do not call that "sem religião".
                skipped_age += 1
                continue
            apond = cols[i_apond].strip()
            if not apond:
                skipped_code += 1
                continue
            weighted[apond][key] += parse_weight(cols[i_w])
            raw_n[apond][key] += 1
            people += 1
    return weighted, raw_n, people, skipped_age, skipped_code


def _write_apond_csv(
    out: Path,
    weighted: dict[str, dict[str, float]],
    raw_n: dict[str, dict[str, int]],
) -> tuple[dict[str, float], dict[str, int]]:
    national = {key: 0.0 for key in RELIGION_KEYS}
    national_n = {key: 0 for key in RELIGION_KEYS}
    tmp = out.with_suffix(".csv.tmp")
    with tmp.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "id_apond",
                "sigla_uf",
                "n_unweighted",
                "pessoas_10",
                *RELIGION_KEYS,
                *[f"n_{key}" for key in RELIGION_KEYS],
                "unstable_cats",
            ],
        )
        writer.writeheader()
        for apond in sorted(weighted):
            wrow = weighted[apond]
            nrow = raw_n[apond]
            unstable = []
            for key in RELIGION_KEYS:
                # Keep the weighted estimate for hover; zero dots later
                # when the cell is too thin to paint.
                if wrow[key] < MIN_WEIGHTED or nrow[key] < MIN_UNWEIGHTED:
                    if wrow[key] > 0:
                        unstable.append(key)
                national[key] += wrow[key]
                national_n[key] += nrow[key]
            pessoas = sum(wrow[key] for key in RELIGION_KEYS)
            writer.writerow(
                {
                    "id_apond": apond,
                    "sigla_uf": next(
                        (sig for sig, c in UF_CODES.items() if apond.startswith(c)),
                        "",
                    ),
                    "n_unweighted": sum(nrow.values()),
                    "pessoas_10": int(round(pessoas)),
                    **{key: int(round(wrow[key])) for key in RELIGION_KEYS},
                    **{f"n_{key}": nrow[key] for key in RELIGION_KEYS},
                    "unstable_cats": ",".join(unstable),
                }
            )
    tmp.replace(out)
    return national, national_n


def expand_sample() -> Path:
    """Sum P0111 by APOND × P0410 for people aged 10+ (non-blank religion)."""
    if not MICRODADOS_DIR.is_dir():
        raise SystemExit(
            f"Missing microdata folder {MICRODADOS_DIR}. "
            "Set MICRODADOS_DIR or unpack the controlled CSVs."
        )
    out = apond_csv_path()
    out.parent.mkdir(parents=True, exist_ok=True)
    weighted: dict[str, dict[str, float]] = defaultdict(
        lambda: {key: 0.0 for key in RELIGION_KEYS}
    )
    raw_n: dict[str, dict[str, int]] = defaultdict(
        lambda: {key: 0 for key in RELIGION_KEYS}
    )
    people = 0
    skipped_age = 0
    skipped_code = 0
    done = set()
    if out.exists():
        # Resume: a killed run used to lose every UF because the CSV
        # was written only at the end.
        for row in csv.DictReader(out.open(encoding="utf-8", newline="")):
            apond = row["id_apond"]
            done.add(row.get("sigla_uf") or "")
            wdest = weighted[apond]
            ndest = raw_n[apond]
            for key in RELIGION_KEYS:
                wdest[key] += float(row.get(key) or 0)
                ndest[key] += int(row.get(f"n_{key}") or 0)
            people += int(row.get("n_unweighted") or 0)
        print(f"resume from {out} ufs={sorted(u for u in done if u)}", flush=True)
    for uf, code in UF_CODES.items():
        if uf in done:
            print(f"skip {uf} (already in CSV)", flush=True)
            continue
        path = MICRODADOS_DIR / code / f"Pessoas_{code}_controlado.csv"
        if not path.exists():
            raise SystemExit(f"Missing {path}")
        print(f"expanding {uf}…", flush=True)
        uf_w, uf_n, uf_people, uf_age, uf_code = _expand_uf(path)
        for apond, counts in uf_w.items():
            dest = weighted[apond]
            for key, value in counts.items():
                dest[key] += value
        for apond, counts in uf_n.items():
            dest = raw_n[apond]
            for key, value in counts.items():
                dest[key] += value
        people += uf_people
        skipped_age += uf_age
        skipped_code += uf_code
        print(f"expanded {uf} aponds_so_far={len(weighted)}", flush=True)
        _write_apond_csv(out, weighted, raw_n)

    national, national_n = _write_apond_csv(out, weighted, raw_n)
    total = sum(national.values())
    print(f"wrote {out} aponds={len(weighted)} people_10_plus_rows={people}")
    print(f"skipped_blank_religion={skipped_age} skipped_no_apond={skipped_code}")
    print(f"weighted_total={total:,.0f}")
    for key in RELIGION_KEYS:
        share = national[key] / total if total else 0
        official = OFFICIAL_SHARE.get(key)
        extra = (
            f" official={official:.1%} delta={share - official:+.1%}"
            if official
            else ""
        )
        print(
            f"  {key}: {national[key]:,.0f} ({share:.1%}) n={national_n[key]:,}{extra}"
        )
    return out


def load_apond_rows() -> dict[str, dict[str, str]]:
    path = apond_csv_path()
    if not path.exists():
        raise SystemExit(f"Missing {path}. Run: python3 scripts/build_religion_apond.py expand")
    with path.open(encoding="utf-8", newline="") as fh:
        return {row["id_apond"]: row for row in csv.DictReader(fh)}


def load_depara(uf: str) -> dict[str, str]:
    dest = ensure_depara(uf)
    mapping: dict[str, str] = {}
    with dest.open(encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh, delimiter=";")
        for row in reader:
            setor = (row.get("CD_SETOR") or "").strip()
            apond = (row.get("cd_apond") or "").strip()
            if setor and apond:
                mapping[setor] = apond
    return mapping


def load_setor_pop(uf: str) -> dict[str, float]:
    counts = RACE_DIR / f"census_tract_{uf}_counts.csv"
    if not counts.exists():
        raise SystemExit(
            f"Missing {counts}. Race setor totals weight the dasymetric split."
        )
    pop: dict[str, float] = {}
    with counts.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            pop[row["id_setor_censitario"]] = float(row.get("populacao") or 0)
    return pop


def write_setor_counts(uf: str) -> Path:
    """Give every setor its APOND religion mix, scaled by universe population."""
    theme = THEMES["religion"]
    out = theme.output_dir / f"census_tract_{uf}_counts.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    aponds = load_apond_rows()
    depara = load_depara(uf)
    pop = load_setor_pop(uf)
    apond_pop: dict[str, float] = defaultdict(float)
    for setor, pessoas in pop.items():
        apond = depara.get(setor)
        if apond:
            apond_pop[apond] += pessoas
    missing_depara = 0
    missing_apond = 0
    rows = 0
    with out.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "id_setor_censitario",
                "id_apond",
                "sigla_uf",
                *RELIGION_KEYS,
                "pessoas_10",
                "unstable_cats",
            ],
        )
        writer.writeheader()
        for setor, pessoas in pop.items():
            apond = depara.get(setor)
            if not apond:
                missing_depara += 1
                continue
            stats = aponds.get(apond)
            if not stats:
                missing_apond += 1
                continue
            denom = apond_pop[apond]
            share = (pessoas / denom) if denom else 0.0
            # Suppress thin APOND cells so mapshaper -dots cannot invent
            # a color from <400 weighted people or <30 interviews.
            unstable = set((stats.get("unstable_cats") or "").split(",")) - {""}
            allocated = {}
            for key in RELIGION_KEYS:
                raw = float(stats.get(key) or 0)
                allocated[key] = 0 if key in unstable else int(round(raw * share))
            writer.writerow(
                {
                    "id_setor_censitario": setor,
                    "id_apond": apond,
                    "sigla_uf": uf,
                    **allocated,
                    "pessoas_10": sum(allocated.values()),
                    "unstable_cats": stats.get("unstable_cats") or "",
                }
            )
            rows += 1
    print(
        f"wrote {out} setores={rows} "
        f"missing_depara={missing_depara} missing_apond={missing_apond}"
    )
    return out


def write_apond_hover(uf: str) -> Path:
    """Dissolve setor polygons to APOND and attach the weighted estimates."""
    theme = THEMES["religion"]
    setor_geo = theme.output_dir / f"census_tract_{uf}.geojson"
    if not setor_geo.exists():
        raise SystemExit(f"Missing {setor_geo}")
    stats_csv = theme.output_dir / f"apond_{uf}_stats.csv"
    aponds = load_apond_rows()
    with stats_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "id_apond",
                "sigla_uf",
                "n_unweighted",
                "pessoas_10",
                *RELIGION_KEYS,
                "unstable_cats",
            ],
        )
        writer.writeheader()
        prefix = UF_CODES[uf]
        for apond, row in aponds.items():
            if apond.startswith(prefix):
                writer.writerow({key: row.get(key, "") for key in writer.fieldnames})
    out = theme.output_dir / f"apond_{uf}.geojson"
    # The setor malha is a left join: water / empty IBGE cells keep no
    # id_apond. Dissolving those leftovers makes one MultiPolygon that
    # paints the sea (and any other unmatched mesh) as a hover hit.
    run_mapshaper(
        [
            str(setor_geo),
            "-filter",
            "id_apond != null && String(id_apond).length > 0",
            "-dissolve",
            "id_apond",
            "copy-fields=sigla_uf,municipio,id_municipio",
            "-join",
            str(stats_csv),
            "keys=id_apond,id_apond",
            "string-fields=id_apond,unstable_cats,sigla_uf",
            "force",
            "-filter",
            "pessoas_10 > 0",
            "-o",
            "format=geojson",
            str(out),
        ]
    )
    print(f"wrote {out}")
    return out


def build_uf(uf: str) -> None:
    theme = get_theme("religion")
    write_setor_counts(uf)
    shp = ensure_malha(uf)
    mapshaper_join(uf, shp, theme)
    write_apond_hover(uf)


def main(argv: list[str] | None = None) -> None:
    args = argv if argv is not None else sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        raise SystemExit(
            f"Usage: {sys.argv[0]} expand | <UF> | all-geo | hover\n"
            "  expand    read controlled Pessoas CSVs → apond_religion.csv\n"
            "  <UF>      dasymetric setor GeoJSON + APOND hover for one state\n"
            "  all-geo   expand if needed, then every UF\n"
            "  hover     rebuild APOND hover GeoJSON from existing setor files"
        )
    cmd = args[0].strip().lower()
    if cmd == "expand":
        expand_sample()
        return
    if cmd == "hover":
        for uf in UF_CODES:
            write_apond_hover(uf)
        return
    if cmd == "all-geo":
        if not apond_csv_path().exists():
            expand_sample()
        for uf in UF_CODES:
            build_uf(uf)
        from ibge_uf import ensure_apond_hover_layer

        ensure_apond_hover_layer()
        return
    build_uf(parse_uf(args[0]))


if __name__ == "__main__":
    main()
