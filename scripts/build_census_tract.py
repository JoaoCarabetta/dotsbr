"""Build themed census_tract_{UF}.geojson without geopandas/geobr.

Downloads the official 2022 setor shapefile for one UF and joins the
selected national aggregate CSV on CD_SETOR. Race stays the default so
existing commands keep working.
"""

from __future__ import annotations

import csv
import sys
import zipfile

from ibge_uf import (
    RACE_DIR,
    RAW_DIR,
    UF_CODES,
    csv_fieldmap,
    download,
    find_shp,
    merge_hover,
    num,
    parse_uf,
    run_mapshaper,
    unzip,
)
from themes import Theme, get_theme

# Official 2022 malha (not the preliminar tree). Files sit directly under UF/.
MALHA_URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/"
    "malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/"
    "censo_2022/setores/shp/UF/{uf}_setores_CD2022.zip"
)


def ensure_theme_source(theme: Theme) -> None:
    if theme.source_path.exists():
        return
    if not theme.source_url or not theme.source_zip:
        raise SystemExit(f"Missing source CSV: {theme.source_path}")
    download(theme.source_url, theme.source_zip)
    # Theme archives contain one national CSV; extract beside the other raw
    # inputs so subsequent state builds do not repeat a network download.
    with zipfile.ZipFile(theme.source_zip) as zf:
        csv_names = [name for name in zf.namelist() if name.lower().endswith(".csv")]
        if len(csv_names) != 1:
            raise SystemExit(f"Expected one CSV in {theme.source_zip}, found {csv_names}")
        with zf.open(csv_names[0]) as src, theme.source_path.open("wb") as dest:
            dest.write(src.read())


def write_setor_counts(uf: str, theme: Theme) -> None:
    prefix = UF_CODES[uf]
    out_dir = theme.output_dir
    counts_csv = out_dir / f"census_tract_{uf}_counts.csv"
    counts_csv.parent.mkdir(parents=True, exist_ok=True)
    rows = 0
    with theme.source_path.open(encoding="latin-1", newline="") as fh_in, counts_csv.open(
        "w", encoding="utf-8", newline=""
    ) as fh_out:
        reader = csv.DictReader(fh_in, delimiter=";")
        fieldmap = csv_fieldmap(reader.fieldnames)
        extra_fields = ["renda_media", "renda_mediana"] if theme.id == "income" else []
        writer = csv.DictWriter(
            fh_out,
            fieldnames=[
                "id_setor_censitario",
                "sigla_uf",
                *theme.categories,
                theme.total_field,
                *extra_fields,
            ],
        )
        writer.writeheader()
        for row in reader:
            setor = row[fieldmap[theme.key_field]].strip('"')
            if not setor.startswith(prefix):
                continue
            values = theme.extract(row, fieldmap)
            writer.writerow(
                {
                    "id_setor_censitario": setor,
                    "sigla_uf": uf,
                    **values,
                }
            )
            rows += 1
    print(f"wrote {counts_csv} theme={theme.id} setores={rows}")


def ensure_malha(uf: str):
    dest_dir = RAW_DIR / f"{uf}_setores_CD2022"
    existing = list(dest_dir.rglob("*.shp")) if dest_dir.exists() else []
    if existing:
        return existing[0]
    zip_path = RAW_DIR / f"{uf}_setores_CD2022.zip"
    if not zip_path.exists():
        download(MALHA_URL.format(uf=uf), zip_path)
    unzip(zip_path, dest_dir)
    return find_shp(dest_dir)


def enrich_race_hover(uf: str, counts_csv) -> None:
    """Append theme metrics to the existing national race hover geometry."""
    base = RACE_DIR / f"census_tract_{uf}.geojson"
    if not base.exists():
        return
    temp = RACE_DIR / f"census_tract_{uf}_enriched.geojson"
    run_mapshaper(
        [
            str(base),
            "-join",
            str(counts_csv),
            "keys=id_setor_censitario,id_setor_censitario",
            "string-fields=id_setor_censitario",
            "force",
            "-o",
            "format=geojson",
            str(temp),
        ]
    )
    temp.replace(base)


def mapshaper_join(uf: str, shp, theme: Theme) -> None:
    out_dir = theme.output_dir
    counts_csv = out_dir / f"census_tract_{uf}_counts.csv"
    out_path = out_dir / f"census_tract_{uf}.geojson"
    fields = [
        "id_setor_censitario",
        "id_municipio",
        "municipio",
        "sigla_uf",
        theme.total_field,
        *theme.categories,
    ]
    if theme.id == "income":
        fields.extend(["renda_media", "renda_mediana"])
    if theme.id == "religion":
        # id_apond stays on the setor so hover can dissolve to weighting areas.
        fields.extend(["id_apond", "unstable_cats"])
    # Rename first so the join key matches the counts CSV. Drop bulky IBGE
    # columns we do not render; keep municipio for a future tooltip label.
    run_mapshaper(
        [
            str(shp),
            "-rename-fields",
            "id_setor_censitario=CD_SETOR,id_municipio=CD_MUN,municipio=NM_MUN",
            "-join",
            str(counts_csv),
            "keys=id_setor_censitario,id_setor_censitario",
            "string-fields=id_setor_censitario,id_municipio,id_apond,unstable_cats",
            "-filter-fields",
            ",".join(fields),
            "-o",
            "format=geojson",
            str(out_path),
        ]
    )
    print(f"wrote {out_path}")
    # Religion hover is the APOND polygon, not the setor. Joining the mix
    # onto race hover would invite showing sample religion at setor resolution.
    if theme.id not in ("race", "religion"):
        enrich_race_hover(uf, counts_csv)


def main(argv: list[str] | None = None) -> None:
    args = argv if argv is not None else sys.argv[1:]
    if not 1 <= len(args) <= 2:
        raise SystemExit(f"Usage: {sys.argv[0]} <UF> [race|income|deaths|religion]")
    uf = parse_uf(args[0])
    theme = get_theme(args[1] if len(args) > 1 else None)
    if theme.id == "religion":
        # Religion counts are expanded from the sample, not a setor CSV.
        from build_religion_apond import write_setor_counts as write_religion_counts

        write_religion_counts(uf)
    else:
        ensure_theme_source(theme)
        write_setor_counts(uf, theme)
    shp = ensure_malha(uf)
    mapshaper_join(uf, shp, theme)
    # Theme builds enrich the race geometry; rebuild the expensive national
    # hover tiles once after every requested theme has been joined.
    if theme.id == "race":
        merge_hover()


if __name__ == "__main__":
    main()
