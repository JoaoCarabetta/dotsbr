"""Theme definitions shared by the setor, municipality, and tile builders.

Race remains the default so old commands and versioned tiles keep working.
The extra themes live in separate trees because their units and dot-density
scales are different and must never overwrite the national race tiles.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from ibge_uf import RACES, RAW_DIR, SRC_COLS, num

ROOT = RAW_DIR.parents[2]
OUTPUT_ROOT = ROOT / "data/censo2022/output/tiles"

INCOME_URL = (
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
    "Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/"
    "Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip"
)
INCOME_MUNICIPALITY_URL = (
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
    "Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/"
    "Agregados_por_municipios_renda_responsavel_BR_20260508_csv.zip"
)
INCOME_DICTIONARY_URL = (
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
    "Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/"
    "dicionario_de_dados_renda_responsavel_20260508.xlsx"
)
DEATHS_URL = (
    "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
    "Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/"
    "Agregados_por_setores_obitos_BR.zip"
)

INCOME_KEYS = (
    "income_ate_1sm",
    "income_1_2sm",
    "income_2_3sm",
    "income_3_5sm",
    "income_5_10sm",
    "income_mais_10sm",
    "income_sem_dado",
)
DEATH_KEYS = (
    "death_0_14",
    "death_15_29",
    "death_30_59",
    "death_60_plus",
    "death_age_suppressed",
)
# Official P0410 groups (sample, ages 10+). 8 and 9 collapse so the
# legend does not treat "não sabe" as a faith.
RELIGION_KEYS = (
    "relig_catolica",
    "relig_evangelica",
    "relig_espirita",
    "relig_afro",
    "relig_indigena",
    "relig_sem_religiao",
    "relig_outras",
    "relig_sem_info",
)
# P0410 codes → map keys. Blank is under-10, not "sem religião".
P0410_TO_KEY = {
    "1": "relig_catolica",
    "2": "relig_evangelica",
    "3": "relig_espirita",
    "4": "relig_afro",
    "5": "relig_indigena",
    "6": "relig_outras",
    "7": "relig_sem_religiao",
    "8": "relig_sem_info",
    "9": "relig_sem_info",
}


@dataclass(frozen=True)
class Theme:
    id: str
    categories: tuple[str, ...]
    total_field: str
    source_path: Path
    source_url: str | None
    source_zip: Path | None
    key_field: str
    per_dot: tuple[int, ...]
    extract: Callable[[dict[str, str], dict[str, str]], dict[str, int | float]]
    municipality_path: Path | None = None
    municipality_url: str | None = None
    municipality_zip: Path | None = None

    @property
    def output_dir(self) -> Path:
        return OUTPUT_ROOT / self.id


def _field(row: dict[str, str], fields: dict[str, str], name: str) -> str:
    return row.get(fields.get(name, ""), "")


def extract_race(row: dict[str, str], fields: dict[str, str]) -> dict[str, int]:
    counts = {
        dest: int(num(_field(row, fields, src)))
        for dest, src in zip(RACES, SRC_COLS)
    }
    return {**counts, "populacao": sum(counts.values())}


def income_bin(value: float) -> str:
    """Use fixed 2022-minimum-wage bins so colors compare across setores."""
    sm = 1212.0
    if value <= sm:
        return "income_ate_1sm"
    if value <= 2 * sm:
        return "income_1_2sm"
    if value <= 3 * sm:
        return "income_2_3sm"
    if value <= 5 * sm:
        return "income_3_5sm"
    if value <= 10 * sm:
        return "income_5_10sm"
    return "income_mais_10sm"


def extract_income(
    row: dict[str, str], fields: dict[str, str]
) -> dict[str, int | float]:
    households = int(num(_field(row, fields, "V06001")))
    mean_raw = _field(row, fields, "V06004").strip().strip('"')
    median_raw = _field(row, fields, "V06006").strip().strip('"')
    mean = num(mean_raw)
    median = num(median_raw)
    counts = {key: 0 for key in INCOME_KEYS}
    # Suppressed/blank medians cannot be treated as zero-income households.
    category = (
        income_bin(median)
        if median_raw not in ("", "X") and median > 0
        else "income_sem_dado"
    )
    counts[category] = households
    return {
        **counts,
        "domicilios": households,
        "renda_media": mean,
        "renda_mediana": median,
    }


def _sum_columns(
    row: dict[str, str], fields: dict[str, str], columns: tuple[str, ...]
) -> int:
    return int(sum(num(_field(row, fields, column)) for column in columns))


def extract_deaths(row: dict[str, str], fields: dict[str, str]) -> dict[str, int]:
    # Sex is summed here only because the universe file has no sex-neutral
    # detailed-age columns. The product intentionally exposes no sex filter.
    counts = {
        "death_0_14": _sum_columns(
            row,
            fields,
            ("V01228", "V01229", "V01230", "V01239", "V01240", "V01241"),
        ),
        "death_15_29": _sum_columns(
            row,
            fields,
            ("V01231", "V01232", "V01233", "V01242", "V01243", "V01244"),
        ),
        "death_30_59": _sum_columns(
            row,
            fields,
            ("V01234", "V01235", "V01236", "V01245", "V01246", "V01247"),
        ),
        "death_60_plus": _sum_columns(
            row, fields, ("V01237", "V01238", "V01248", "V01249")
        ),
    }
    visible_total = _sum_columns(row, fields, ("V01226", "V01227"))
    # Detailed ages are suppressed far more often than sex totals. Keep that
    # residual visible instead of silently pretending the missing ages are zero.
    counts["death_age_suppressed"] = max(0, visible_total - sum(counts.values()))
    return {**counts, "obitos": visible_total}


def extract_religion(
    row: dict[str, str], fields: dict[str, str]
) -> dict[str, int | float]:
    """Read a already-allocated setor row (not raw microdata)."""
    counts = {key: int(num(_field(row, fields, key))) for key in RELIGION_KEYS}
    return {**counts, "pessoas_10": sum(counts.values())}


# National totals: ~72.4M households and ~3.63M visible deaths vs ~202M people.
# Income stays ~1/3 of the race schedule so switching views keeps similar
# visual density (z14 is 7, not 6, so ~10.3M dots instead of 12M).
# Deaths stay sparser (~1/56 of people): matching race 1:1 would make a
# mortality map look as populated as the census, which it is not.
THEMES = {
    "race": Theme(
        id="race",
        categories=RACES,
        total_field="populacao",
        source_path=RAW_DIR / "Agregados_por_setores_cor_ou_raca_BR.csv",
        source_url=None,
        source_zip=None,
        key_field="CD_SETOR",
        per_dot=(4500, 2000, 900, 400, 150, 120, 90, 70, 50, 35, 25, 20),
        extract=extract_race,
    ),
    "income": Theme(
        id="income",
        categories=INCOME_KEYS,
        total_field="domicilios",
        source_path=RAW_DIR
        / "Agregados_por_setores_renda_responsavel_BR_20260508.csv",
        source_url=INCOME_URL,
        source_zip=RAW_DIR
        / "Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip",
        key_field="CD_SETOR",
        per_dot=(1500, 700, 300, 130, 50, 40, 30, 24, 17, 12, 8, 7),
        extract=extract_income,
        municipality_path=RAW_DIR
        / "Agregados_por_municipios_renda_responsavel_BR_20260508.csv",
        municipality_url=INCOME_MUNICIPALITY_URL,
        municipality_zip=RAW_DIR
        / "Agregados_por_municipios_renda_responsavel_BR_20260508_csv.zip",
    ),
    "deaths": Theme(
        id="deaths",
        categories=DEATH_KEYS,
        total_field="obitos",
        source_path=RAW_DIR / "Agregados_por_setores_obitos_BR.csv",
        source_url=DEATHS_URL,
        source_zip=RAW_DIR / "Agregados_por_setores_obitos_BR.zip",
        key_field="CD_SETOR",
        per_dot=(200, 100, 50, 25, 12, 10, 8, 6, 4, 3, 2, 1),
        extract=extract_deaths,
    ),
    # Sample religion is valid only at the weighting area. The CSV written
    # by build_religion_apond.py already holds APOND-level mix allocated
    # onto setores (dasymetric). per_dot is a touch sparser than race
    # because the universe is people aged 10+, ~177M not ~202M.
    "religion": Theme(
        id="religion",
        categories=RELIGION_KEYS,
        total_field="pessoas_10",
        source_path=OUTPUT_ROOT / "religion" / "apond_religion.csv",
        source_url=None,
        source_zip=None,
        key_field="id_setor_censitario",
        per_dot=(3900, 1750, 790, 350, 130, 105, 80, 60, 44, 31, 22, 18),
        extract=extract_religion,
    ),
}


def get_theme(raw: str | None) -> Theme:
    name = (raw or "race").strip().lower()
    if name not in THEMES:
        raise SystemExit(f"Unknown theme {raw!r}. Expected: {', '.join(THEMES)}")
    return THEMES[name]
