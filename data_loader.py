import os
import sqlite3
import pandas as pd
from threading import Lock
from config import (
    BASE_DIR, DB_PATH, EXCEL_FILE_A, EXCEL_FILE_B,
    COL_STYLE, COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2,
    COL_BRAND, COL_TONE, COL_CUSTOMER, COL_DATE,
    COL_METAL, COL_COLOR, COL_TOTAL_WT, COL_CON_BY_DESC, COL_CON_BY_DESC1,
    COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1, COL_WET_BY_DESC, COL_WET_BY_DESC1,
    COL_RM_DSG, COL_RM_CTG, COL_RM_SUBCTG, COL_RM_LN1, COL_RM_LN2, COL_RM_QTY, COL_RM_WT,
    COL_SET_CD, COL_SIZE, COL_WAX_WT, COL_A_WXT, COL_M_WXT
)

_filter_options_cache = {}
_lock = Lock()


def get_db_connection() -> sqlite3.Connection:
    """Provides a thread-safe connection with WAL mode and row factory."""
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA cache_size = -64000;")  # 64MB RAM cache
    return conn


def clean_val(v):
    if pd.isna(v) or v is None:
        return ""
    s = str(v).strip()
    return "" if s in ["-", "nan", "None"] else s


def build_sqlite_database():
    """Reads Excel sheets once, performs data cleaning, and builds indexed SQLite tables."""
    print("[INFO] Building high-performance SQLite database (catalog.db)...")

    # 1. Read and clean File A
    print("[INFO] Reading File A (Design Detail & Ana)...")
    df_a = pd.read_excel(
        EXCEL_FILE_A,
        usecols=[
            COL_STYLE, COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2,
            COL_DATE, COL_METAL, COL_COLOR, COL_TOTAL_WT,
            COL_BRAND, COL_CUSTOMER, COL_CON_BY_DESC, COL_CON_BY_DESC1,
            COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1, COL_WET_BY_DESC, COL_WET_BY_DESC1,
            COL_TONE, COL_SET_CD, COL_SIZE, COL_WAX_WT, COL_A_WXT, COL_M_WXT
        ]
    )
    df_a[COL_STYLE] = df_a[COL_STYLE].astype(str).str.strip()
    df_a = df_a[df_a[COL_STYLE] != ""].drop_duplicates(subset=[COL_STYLE]).copy()

    str_cols = [
        COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2, COL_BRAND,
        COL_TONE, COL_CUSTOMER, COL_METAL, COL_COLOR,
        COL_CON_BY_DESC, COL_CON_BY_DESC1, COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1,
        COL_WET_BY_DESC, COL_WET_BY_DESC1, COL_SET_CD, COL_SIZE
    ]
    for col in str_cols:
        df_a[col] = df_a[col].apply(clean_val)

    df_a[COL_TOTAL_WT] = pd.to_numeric(df_a[COL_TOTAL_WT], errors="coerce").fillna(0.0)
    df_a[COL_DATE] = pd.to_datetime(df_a[COL_DATE], errors="coerce")
    df_a[COL_WAX_WT] = pd.to_numeric(df_a[COL_WAX_WT], errors="coerce").fillna(0.0)
    df_a[COL_A_WXT] = pd.to_numeric(df_a[COL_A_WXT], errors="coerce").fillna(0.0)
    df_a[COL_M_WXT] = pd.to_numeric(df_a[COL_M_WXT], errors="coerce").fillna(0.0)

    # Compute Wax Weight logic
    def compute_wax_info(row):
        dt = row[COL_DATE]
        cutoff = pd.Timestamp("2023-01-01")
        if pd.notnull(dt) and dt <= cutoff:
            val = float(row[COL_WAX_WT])
            return ("waxwt", round(val, 3) if val > 0 else 0.0)
        else:
            m_val = float(row[COL_M_WXT])
            if m_val > 0:
                return ("mwxt", round(m_val, 3))
            a_val = float(row[COL_A_WXT])
            if a_val > 0:
                return ("awxt", round(a_val, 3))
            return ("waxwt", 0.0)

    wax_res = df_a.apply(compute_wax_info, axis=1)
    df_a["wax_label"] = [r[0] for r in wax_res]
    df_a["wax_value"] = [r[1] for r in wax_res]

    # Pre-tag image sources
    print("[INFO] Indexing image directories and tagging image sources...")
    from image_service import get_image_source_for_style
    df_a["image_source"] = df_a[COL_STYLE].apply(get_image_source_for_style)

    # 2. Read and clean File B
    print("[INFO] Reading File B (Design Rm Detail)...")
    df_b = pd.read_excel(
        EXCEL_FILE_B,
        usecols=[COL_RM_DSG, COL_RM_CTG, COL_RM_SUBCTG, COL_RM_LN1, COL_RM_LN2, COL_RM_QTY, COL_RM_WT]
    )
    df_b[COL_RM_DSG] = df_b[COL_RM_DSG].astype(str).str.strip()
    df_b[COL_RM_CTG] = df_b[COL_RM_CTG].apply(clean_val)
    df_b[COL_RM_SUBCTG] = df_b[COL_RM_SUBCTG].apply(clean_val)
    df_b[COL_RM_LN1] = pd.to_numeric(df_b[COL_RM_LN1], errors="coerce").fillna(0.0)
    df_b[COL_RM_LN2] = pd.to_numeric(df_b[COL_RM_LN2], errors="coerce").fillna(0.0)
    df_b[COL_RM_QTY] = pd.to_numeric(df_b[COL_RM_QTY], errors="coerce").fillna(0).astype(int)
    df_b[COL_RM_WT] = pd.to_numeric(df_b[COL_RM_WT], errors="coerce").fillna(0.0)

    # Aggregate total stone weight and quantity strictly for Categories 'C' and 'D'
    df_b_stones_only = df_b[df_b[COL_RM_CTG].str.upper().isin(["C", "D"])].copy()

    rm_agg = df_b_stones_only.groupby(COL_RM_DSG).agg(
        rm_stones_wt=(COL_RM_WT, lambda s: round(float(s.sum()), 3)),
        rm_stones_qty=(COL_RM_QTY, "sum")
    ).reset_index()

    df_a = df_a.merge(rm_agg, left_on=COL_STYLE, right_on=COL_RM_DSG, how="left")
    df_a["rm_stones_wt"] = df_a["rm_stones_wt"].fillna(0.0)
    df_a["rm_stones_qty"] = df_a["rm_stones_qty"].fillna(0).astype(int)
    if COL_RM_DSG in df_a.columns:
        df_a.drop(columns=[COL_RM_DSG], inplace=True)

    # Convert timestamps to string formatted YYYY-MM-DD for fast SQLite B-Tree sorting
    df_a["created_date_str"] = df_a[COL_DATE].dt.strftime("%Y-%m-%d").fillna("")
    df_a["date_display"] = df_a[COL_DATE].dt.strftime("%d-%m-%Y").fillna("-")

    # 3. Write directly into SQLite
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception:
            pass

    conn = get_db_connection()
    with conn:
        print("[INFO] Writing styles table to database...")
        df_a.to_sql("styles", conn, if_exists="replace", index=False)

        print("[INFO] Writing stone_items table to database...")
        df_b.to_sql("stone_items", conn, if_exists="replace", index=False)

        print("[INFO] Creating binary B-Tree indexes for instantaneous querying...")
        indexes = [
            f"CREATE INDEX IF NOT EXISTS idx_styles_style ON styles ({COL_STYLE});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_date ON styles (created_date_str DESC);",
            f"CREATE INDEX IF NOT EXISTS idx_styles_ctg ON styles ({COL_CTG_DESC});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_sal1 ON styles ({COL_SAL_CTG1});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_sal2 ON styles ({COL_SAL_CTG2});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_cust ON styles ({COL_CUSTOMER});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_metal ON styles ({COL_METAL});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_size ON styles ({COL_SIZE});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_wax ON styles (wax_value);",
            f"CREATE INDEX IF NOT EXISTS idx_styles_totwt ON styles ({COL_TOTAL_WT});",
            f"CREATE INDEX IF NOT EXISTS idx_styles_img ON styles (image_source);",
            f"CREATE INDEX IF NOT EXISTS idx_stone_dsg_ctg ON stone_items ({COL_RM_DSG}, {COL_RM_CTG});",
            f"CREATE INDEX IF NOT EXISTS idx_stone_subctg ON stone_items ({COL_RM_SUBCTG});",
            f"CREATE INDEX IF NOT EXISTS idx_stone_sieve ON stone_items ({COL_RM_LN1}, {COL_RM_LN2});",
        ]
        for sql in indexes:
            conn.execute(sql)

    conn.close()
    print("[INFO] Database build complete!")


def load_data(force_reload: bool = False):
    """Ensures database is ready, building it only if missing or if Excel files changed."""
    global _filter_options_cache

    with _lock:
        mtime_a = os.path.getmtime(EXCEL_FILE_A) if os.path.exists(EXCEL_FILE_A) else 0
        mtime_b = os.path.getmtime(EXCEL_FILE_B) if os.path.exists(EXCEL_FILE_B) else 0
        db_mtime = os.path.getmtime(DB_PATH) if os.path.exists(DB_PATH) else 0

        needs_build = (
            not os.path.exists(DB_PATH)
            or force_reload
            or mtime_a > db_mtime
            or mtime_b > db_mtime
        )

        if needs_build:
            build_sqlite_database()
            _filter_options_cache.clear()

        if not _filter_options_cache:
            conn = get_db_connection()
            cur = conn.cursor()

            def fetch_uniques(col, tbl="styles"):
                cur.execute(f"SELECT DISTINCT {col} FROM {tbl} WHERE {col} IS NOT NULL AND {col} != '' ORDER BY {col} ASC;")
                return [r[0] for r in cur.fetchall()]

            ranges = cur.execute(f"""
                SELECT 
                    MIN(created_date_str), MAX(created_date_str),
                    MIN({COL_TOTAL_WT}), MAX({COL_TOTAL_WT}),
                    MIN(wax_value), MAX(wax_value)
                FROM styles;
            """).fetchone()

            stone_ranges = cur.execute(f"""
                SELECT 
                    MIN({COL_RM_LN1}), MAX({COL_RM_LN1}),
                    MIN({COL_RM_LN2}), MAX({COL_RM_LN2}),
                    MIN({COL_RM_WT}), MAX({COL_RM_WT})
                FROM stone_items;
            """).fetchone()

            _filter_options_cache = {
                "categories": fetch_uniques(COL_CTG_DESC),
                "sales_categories1": fetch_uniques(COL_SAL_CTG1),
                "sales_categories2": fetch_uniques(COL_SAL_CTG2),
                "brands": fetch_uniques(COL_BRAND),
                "tones": fetch_uniques(COL_TONE),
                "customers": fetch_uniques(COL_CUSTOMER),
                "metals": fetch_uniques(COL_METAL),
                "colors": fetch_uniques(COL_COLOR),
                "set_codes": fetch_uniques(COL_SET_CD),
                "sizes": fetch_uniques(COL_SIZE),
                "concept_designers": fetch_uniques(COL_CON_BY_DESC),
                "creative_designers": fetch_uniques(COL_CREAT_BY_DESC),
                "weight_designers": fetch_uniques(COL_WET_BY_DESC),
                "rm_categories": fetch_uniques(COL_RM_CTG, "stone_items"),
                "rm_subcategories": fetch_uniques(COL_RM_SUBCTG, "stone_items"),
                "ranges": {
                    "min_date": ranges[0], "max_date": ranges[1],
                    "min_total_wt": ranges[2] or 0.0, "max_total_wt": ranges[3] or 0.0,
                    "min_wax_wt": ranges[4] or 0.0, "max_wax_wt": ranges[5] or 0.0,
                    "min_ln1": stone_ranges[0] or 0.0, "max_ln1": stone_ranges[1] or 0.0,
                    "min_ln2": stone_ranges[2] or 0.0, "max_ln2": stone_ranges[3] or 0.0,
                    "min_rm_wt": stone_ranges[4] or 0.0, "max_rm_wt": stone_ranges[5] or 0.0,
                }
            }
            conn.close()

    return DB_PATH


def get_rm_details(style_code: str):
    """Retrieves stone breakdown rows from SQLite in sub-millisecond time."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"""
        SELECT 
            {COL_RM_CTG} as Ctg, {COL_RM_SUBCTG} as SubCtg,
            {COL_RM_LN1} as Ln1, {COL_RM_LN2} as Ln2,
            {COL_RM_QTY} as RmQty, {COL_RM_WT} as RmWt
        FROM stone_items 
        WHERE {COL_RM_DSG} = ?;
    """, (str(style_code).strip(),))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    # Only sum weight and qty for categories C and D
    stone_rows = [r for r in rows if str(r.get("Ctg", "")).strip().upper() in ["C", "D"]]
    tot_wt = round(sum(r["RmWt"] for r in stone_rows), 3)
    tot_qty = sum(r["RmQty"] for r in stone_rows)
    return {"items": rows, "total_stones_wt": tot_wt, "total_stones_qty": tot_qty}

def get_filter_options():
    global _filter_options_cache
    if not _filter_options_cache:
        load_data()
    return _filter_options_cache