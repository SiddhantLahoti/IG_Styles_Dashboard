import os
import win32com.client
import pandas as pd
from threading import Lock
import pythoncom
from config import (
    EXCEL_FILE_A, EXCEL_FILE_B,
    COL_STYLE, COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2,
    COL_BRAND, COL_TONE, COL_CUSTOMER, COL_DATE,
    COL_METAL, COL_COLOR, COL_TOTAL_WT, COL_CON_BY_DESC, COL_CON_BY_DESC1, COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1, COL_WET_BY_DESC, COL_WET_BY_DESC1,
    COL_RM_DSG, COL_RM_CTG, COL_RM_SUBCTG, COL_RM_LN1, COL_RM_LN2, COL_RM_QTY, COL_RM_WT ,COL_SET_CD
)

_df_cache = None
_rm_map = {}
_filter_options_cache = {}
_last_mtimes = {}
_lock = Lock()

def refresh_excel_file_via_app(filepath: str):
    abs_path = os.path.abspath(filepath)
    if not os.path.exists(abs_path):
        print(f"[WARNING] File not found: {abs_path}")
        return

    pythoncom.CoInitialize()
    excel = None
    wb = None
    try:
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        wb = excel.Workbooks.Open(Filename=abs_path, UpdateLinks=3, ReadOnly=False)
        if wb:
            wb.RefreshAll()
            excel.CalculateUntilAsyncQueriesDone()
            wb.Save()
            print(f"[INFO] Successfully refreshed: {os.path.basename(filepath)}")
    except Exception as e:
        print(f"[WARNING] Auto-refresh skipped for {os.path.basename(filepath)}: {e}")
    finally:
        if wb:
            try:
                wb.Close(SaveChanges=False)
            except Exception:
                pass
        if excel:
            try:
                excel.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

def clean_val(v):
    if pd.isna(v) or v is None:
        return ""
    s = str(v).strip()
    return "" if s in ["-", "nan", "None"] else s

def load_data(force_reload: bool = False):
    global _df_cache, _rm_map, _filter_options_cache, _last_mtimes

    with _lock:
        # if force_reload:
        #     refresh_excel_file_via_app(EXCEL_FILE_A)
        #     refresh_excel_file_via_app(EXCEL_FILE_B)

        mtime_a = os.path.getmtime(EXCEL_FILE_A) if os.path.exists(EXCEL_FILE_A) else 0
        mtime_b = os.path.getmtime(EXCEL_FILE_B) if os.path.exists(EXCEL_FILE_B) else 0

        needs_reload = (
            _df_cache is None
            or force_reload
            or _last_mtimes.get("a") != mtime_a
            or _last_mtimes.get("b") != mtime_b
        )

        if needs_reload:
            print("[INFO] Reading File A (Design Detail & Ana.xlsx)...")
            df_a = pd.read_excel(
                EXCEL_FILE_A,
                usecols=[
                    COL_STYLE, COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2,
                    COL_DATE, COL_METAL, COL_COLOR, COL_TOTAL_WT,
                    COL_BRAND, COL_CUSTOMER, COL_CON_BY_DESC, COL_CON_BY_DESC1, COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1, COL_WET_BY_DESC, COL_WET_BY_DESC1, COL_TONE ,COL_SET_CD
                ]
            )
            df_a[COL_STYLE] = df_a[COL_STYLE].astype(str).str.strip()
            df_a = df_a[df_a[COL_STYLE] != ""].drop_duplicates(subset=[COL_STYLE]).copy()

            # Clean and sanitize strings
            str_cols = [
                COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2, COL_BRAND,
                COL_TONE, COL_CUSTOMER, COL_METAL, COL_COLOR,
                COL_CON_BY_DESC, COL_CON_BY_DESC1, COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1, COL_WET_BY_DESC, COL_WET_BY_DESC1,COL_SET_CD
            ]
            for col in str_cols:
                df_a[col] = df_a[col].apply(clean_val)

            df_a[COL_TOTAL_WT] = pd.to_numeric(df_a[COL_TOTAL_WT], errors="coerce").fillna(0.0)
            df_a[COL_DATE] = pd.to_datetime(df_a[COL_DATE], errors="coerce")

            print("[INFO] Reading File B (Design Rm Detail.xlsx)...")
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

            # Build fast lookup dictionary for File B
            print("[INFO] Building Raw Material lookup index...")
            rm_map = {}
            for dsg, group in df_b.groupby(COL_RM_DSG):
                rows = group[[COL_RM_CTG, COL_RM_SUBCTG, COL_RM_LN1, COL_RM_LN2, COL_RM_QTY, COL_RM_WT]].to_dict(orient="records")
                ctgs = {r[COL_RM_CTG] for r in rows if r[COL_RM_CTG]}
                subctgs = {r[COL_RM_SUBCTG] for r in rows if r[COL_RM_SUBCTG]}
                ln1_list = [r[COL_RM_LN1] for r in rows if r[COL_RM_LN1] > 0]
                ln2_list = [r[COL_RM_LN2] for r in rows if r[COL_RM_LN2] > 0]
                wt_list = [r[COL_RM_WT] for r in rows if r[COL_RM_WT] > 0]

                rm_map[dsg] = {
                    "items": rows,
                    "ctgs": list(ctgs),
                    "subctgs": list(subctgs),
                    "total_stones_wt": round(sum(r[COL_RM_WT] for r in rows), 3),
                    "total_stones_qty": sum(r[COL_RM_QTY] for r in rows),
                    "min_ln1": min(ln1_list) if ln1_list else 0.0,
                    "max_ln1": max(ln1_list) if ln1_list else 0.0,
                    "min_ln2": min(ln2_list) if ln2_list else 0.0,
                    "max_ln2": max(ln2_list) if ln2_list else 0.0,
                    "min_rm_wt": min(wt_list) if wt_list else 0.0,
                    "max_rm_wt": max(wt_list) if wt_list else 0.0,
                }

            _rm_map = rm_map

            # Pre-attach summary attributes to File A for fast filtering & rendering
            df_a["rm_ctgs"] = df_a[COL_STYLE].map(lambda k: rm_map.get(k, {}).get("ctgs", []))
            df_a["rm_subctgs"] = df_a[COL_STYLE].map(lambda k: rm_map.get(k, {}).get("subctgs", []))
            df_a["rm_stones_wt"] = df_a[COL_STYLE].map(lambda k: rm_map.get(k, {}).get("total_stones_wt", 0.0))
            df_a["rm_stones_qty"] = df_a[COL_STYLE].map(lambda k: rm_map.get(k, {}).get("total_stones_qty", 0))

            _df_cache = df_a
            _last_mtimes = {"a": mtime_a, "b": mtime_b}

            # Generate dynamic unique dropdown values
            def get_sorted_uniques(series):
                return sorted([x for x in series.unique() if x])

            _filter_options_cache = {
                "categories": get_sorted_uniques(df_a[COL_CTG_DESC]),
                "sales_categories1": get_sorted_uniques(df_a[COL_SAL_CTG1]),
                "sales_categories2": get_sorted_uniques(df_a[COL_SAL_CTG2]),
                "brands": get_sorted_uniques(df_a[COL_BRAND]),
                "tones": get_sorted_uniques(df_a[COL_TONE]),
                "customers": get_sorted_uniques(df_a[COL_CUSTOMER]),
                "metals": get_sorted_uniques(df_a[COL_METAL]),
                "colors": get_sorted_uniques(df_a[COL_COLOR]),
                "set_codes": get_sorted_uniques(df_a[COL_SET_CD]),
                "concept_designers": sorted([x for x in pd.concat([df_a[COL_CON_BY_DESC], df_a[COL_CON_BY_DESC1]]).unique() if x]),
                "creative_designers": sorted([x for x in pd.concat([df_a[COL_CREAT_BY_DESC], df_a[COL_CREAT_BY_DESC1]]).unique() if x]),
                "weight_designers": sorted([x for x in pd.concat([df_a[COL_WET_BY_DESC], df_a[COL_WET_BY_DESC1]]).unique() if x]),
                "rm_categories": sorted([x for x in df_b[COL_RM_CTG].unique() if x]),
                "rm_subcategories": sorted([x for x in df_b[COL_RM_SUBCTG].unique() if x]),
                "ranges": {
                    "min_date": str(df_a[COL_DATE].min().date()) if pd.notnull(df_a[COL_DATE].min()) else None,
                    "max_date": str(df_a[COL_DATE].max().date()) if pd.notnull(df_a[COL_DATE].max()) else None,
                    "min_total_wt": float(df_a[COL_TOTAL_WT].min()),
                    "max_total_wt": float(df_a[COL_TOTAL_WT].max()),
                    "min_ln1": float(df_b[COL_RM_LN1].min()),
                    "max_ln1": float(df_b[COL_RM_LN1].max()),
                    "min_ln2": float(df_b[COL_RM_LN2].min()),
                    "max_ln2": float(df_b[COL_RM_LN2].max()),
                    "min_rm_wt": float(df_b[COL_RM_WT].min()),
                    "max_rm_wt": float(df_b[COL_RM_WT].max()),
                }
            }
            print(f"[INFO] Engine ready: Loaded {len(df_a):,} unique styles and mapped {len(rm_map):,} RM sets.")

    return _df_cache

def get_rm_details(style_code: str):
    return _rm_map.get(str(style_code).strip(), {"items": [], "total_stones_wt": 0.0, "total_stones_qty": 0})

def get_filter_options():
    global _filter_options_cache
    if not _filter_options_cache:
        load_data()
    return _filter_options_cache