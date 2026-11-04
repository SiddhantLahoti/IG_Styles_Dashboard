import math
from typing import Optional, List
from config import (
    COL_STYLE, COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2,
    COL_BRAND, COL_TONE, COL_CUSTOMER, COL_DATE,
    COL_METAL, COL_COLOR, COL_TOTAL_WT,
    COL_RM_DSG, COL_RM_CTG, COL_RM_SUBCTG, COL_RM_LN1, COL_RM_LN2, COL_RM_WT,
    COL_SET_CD, COL_SIZE, COL_CON_BY_DESC, COL_CON_BY_DESC1,
    COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1, COL_WET_BY_DESC, COL_WET_BY_DESC1
)
import data_loader
from data_loader import get_db_connection, get_filter_options


def get_unique_filter_options(df=None) -> dict:
    return get_filter_options()


def _build_where_clause(
    search_query: Optional[str] = None,
    lab_grown: Optional[str] = None,
    image_source: Optional[str] = None,
    sieve_match_mode: Optional[str] = "any",
    categories: Optional[List[str]] = None,
    sales_cat1: Optional[List[str]] = None,
    sales_cat2: Optional[List[str]] = None,
    brands: Optional[List[str]] = None,
    tones: Optional[List[str]] = None,
    customers: Optional[List[str]] = None,
    metals: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    set_codes: Optional[List[str]] = None,
    has_set: Optional[bool] = None,
    sizes: Optional[List[str]] = None,
    concept_designers: Optional[List[str]] = None,
    creative_designers: Optional[List[str]] = None,
    weight_designers: Optional[List[str]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    min_wax_wt: Optional[float] = None,
    max_wax_wt: Optional[float] = None,
    rm_categories: Optional[List[str]] = None,
    rm_subcategories: Optional[List[str]] = None,
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
    exclude_dim: Optional[str] = None
):
    """Builds parameterized SQL WHERE conditions, optionally excluding a dimension for cascading dropdowns."""
    where_clauses = ["1=1"]
    params = []

    # Text Search
    if search_query and search_query.strip():
        q = f"%{search_query.strip().lower()}%"
        where_clauses.append(f"""(
            LOWER({COL_STYLE}) LIKE ? OR LOWER({COL_CTG_DESC}) LIKE ? OR
            LOWER({COL_SAL_CTG1}) LIKE ? OR LOWER({COL_CUSTOMER}) LIKE ? OR
            LOWER({COL_BRAND}) LIKE ?
        )""")
        params.extend([q, q, q, q, q])

    # Origin & Image
    if lab_grown == "lab_grown":
        where_clauses.append(f"UPPER({COL_STYLE}) LIKE 'L-%'")
    elif lab_grown == "natural":
        where_clauses.append(f"UPPER({COL_STYLE}) NOT LIKE 'L-%'")

    if image_source in ["primary", "secondary", "none"]:
        where_clauses.append("image_source = ?")
        params.append(image_source)

    # Multi-select dimensions (respecting exclude_dim for Excel cascade)
    dim_map = {
        "categories": (COL_CTG_DESC, categories),
        "sizes": (COL_SIZE, sizes),
        "sales_categories1": (COL_SAL_CTG1, sales_cat1),
        "sales_categories2": (COL_SAL_CTG2, sales_cat2),
        "brands": (COL_BRAND, brands),
        "tones": (COL_TONE, tones),
        "customers": (COL_CUSTOMER, customers),
        "metals": (COL_METAL, metals),
        "colors": (COL_COLOR, colors),
        "set_codes": (COL_SET_CD, set_codes),
    }

    for dim_name, (col_name, val_list) in dim_map.items():
        if val_list and exclude_dim != dim_name:
            placeholders = ",".join(["?"] * len(val_list))
            where_clauses.append(f"{col_name} IN ({placeholders})")
            params.extend(val_list)

    # Has Set Code (Part of a Set)
    if has_set:
        where_clauses.append(f"({COL_SET_CD} IS NOT NULL AND {COL_SET_CD} != '' AND {COL_SET_CD} != '-')")
    elif set_codes and exclude_dim != "set_codes":
        placeholders = ",".join(["?"] * len(set_codes))
        where_clauses.append(f"{COL_SET_CD} IN ({placeholders})")
        params.extend(set_codes)
        
    # Designers
    if concept_designers and exclude_dim != "concept_designers":
        p = ",".join(["?"] * len(concept_designers))
        where_clauses.append(f"({COL_CON_BY_DESC} IN ({p}) OR {COL_CON_BY_DESC1} IN ({p}))")
        params.extend(concept_designers * 2)

    if creative_designers and exclude_dim != "creative_designers":
        p = ",".join(["?"] * len(creative_designers))
        where_clauses.append(f"({COL_CREAT_BY_DESC} IN ({p}) OR {COL_CREAT_BY_DESC1} IN ({p}))")
        params.extend(creative_designers * 2)

    if weight_designers and exclude_dim != "weight_designers":
        p = ",".join(["?"] * len(weight_designers))
        where_clauses.append(f"({COL_WET_BY_DESC} IN ({p}) OR {COL_WET_BY_DESC1} IN ({p}))")
        params.extend(weight_designers * 2)

    # Dates and Weights
    if start_date:
        where_clauses.append("created_date_str >= ?")
        params.append(start_date)
    if end_date:
        where_clauses.append("created_date_str <= ?")
        params.append(end_date)

    if min_total_wt is not None:
        where_clauses.append(f"{COL_TOTAL_WT} >= ?")
        params.append(min_total_wt)
    if max_total_wt is not None:
        where_clauses.append(f"{COL_TOTAL_WT} <= ?")
        params.append(max_total_wt)

    if min_wax_wt is not None:
        where_clauses.append("wax_value >= ?")
        params.append(min_wax_wt)
    if max_wax_wt is not None:
        where_clauses.append("wax_value <= ?")
        params.append(max_wax_wt)

    # File B Raw Material (Stone) Constraints
    rm_active = any([rm_categories, rm_subcategories, ln1 is not None, ln2 is not None, min_rm_wt is not None, max_rm_wt is not None])
    if rm_active:
        # Category and SubCategory checks
        if rm_categories and exclude_dim != "rm_categories":
            p = ",".join(["?"] * len(rm_categories))
            where_clauses.append(f"""{COL_STYLE} IN (
                SELECT DISTINCT {COL_RM_DSG} FROM stone_items WHERE {COL_RM_CTG} IN ({p})
            )""")
            params.extend(rm_categories)

        if rm_subcategories and exclude_dim != "rm_subcategories":
            sub_clauses = []
            for item in rm_subcategories:
                if " : " in item:
                    # Item is in composite format: "OVAL : D" -> Shape: OVAL, Stone Category: D
                    parts = item.split(" : ")
                    shape_val = parts[0].strip()
                    ctg_val = parts[1].strip()
                    sub_clauses.append(f"({COL_RM_SUBCTG} = ? AND {COL_RM_CTG} = ?)")
                    params.extend([shape_val, ctg_val])
                else:
                    # Fallback for plain shape string
                    sub_clauses.append(f"({COL_RM_SUBCTG} = ?)")
                    params.append(item.strip())

            combined_cond = " OR ".join(sub_clauses)
            where_clauses.append(f"""{COL_STYLE} IN (
                SELECT DISTINCT {COL_RM_DSG} FROM stone_items WHERE ({combined_cond})
            )""")

        # Sieve and stone weight constraints
        has_numeric = any([ln1 is not None, ln2 is not None, min_rm_wt is not None, max_rm_wt is not None])
        if has_numeric:
            if sieve_match_mode == "exclusive" and (ln1 is not None or ln2 is not None):
                # Exclusive mode: every true stone row must match
                sieve_conds = []
                sieve_params = []
                if ln1 is not None:
                    sieve_conds.append(f"ROUND({COL_RM_LN1}, 3) = ?")
                    sieve_params.append(round(ln1, 3))
                if ln2 is not None:
                    sieve_conds.append(f"ROUND({COL_RM_LN2}, 3) = ?")
                    sieve_params.append(round(ln2, 3))
                if min_rm_wt is not None:
                    sieve_conds.append(f"{COL_RM_WT} >= ?")
                    sieve_params.append(min_rm_wt)
                if max_rm_wt is not None:
                    sieve_conds.append(f"{COL_RM_WT} <= ?")
                    sieve_params.append(max_rm_wt)

                cond_str = " AND ".join(sieve_conds)
                where_clauses.append(f"""{COL_STYLE} IN (
                    SELECT {COL_RM_DSG}
                    FROM stone_items
                    WHERE ({COL_RM_LN1} > 0 OR {COL_RM_CTG} IN ('D', 'C'))
                    GROUP BY {COL_RM_DSG}
                    HAVING COUNT(*) = SUM(CASE WHEN {cond_str} THEN 1 ELSE 0 END)
                )""")
                params.extend(sieve_params)
            else:
                # Any / Contains mode
                sieve_conds = []
                sieve_params = []
                if ln1 is not None:
                    sieve_conds.append(f"ROUND({COL_RM_LN1}, 3) = ?")
                    sieve_params.append(round(ln1, 3))
                if ln2 is not None:
                    sieve_conds.append(f"ROUND({COL_RM_LN2}, 3) = ?")
                    sieve_params.append(round(ln2, 3))
                if min_rm_wt is not None:
                    sieve_conds.append(f"{COL_RM_WT} >= ?")
                    sieve_params.append(min_rm_wt)
                if max_rm_wt is not None:
                    sieve_conds.append(f"{COL_RM_WT} <= ?")
                    sieve_params.append(max_rm_wt)

                cond_str = " AND ".join(sieve_conds)
                where_clauses.append(f"""{COL_STYLE} IN (
                    SELECT DISTINCT {COL_RM_DSG} FROM stone_items WHERE {cond_str}
                )""")
                params.extend(sieve_params)

    return " AND ".join(where_clauses), params


def apply_filters_and_paginate(
    df=None,
    search_query: Optional[str] = None,
    lab_grown: Optional[str] = None,
    image_source: Optional[str] = None,
    sieve_match_mode: Optional[str] = "any",
    categories: Optional[List[str]] = None,
    sales_cat1: Optional[List[str]] = None,
    sales_cat2: Optional[List[str]] = None,
    brands: Optional[List[str]] = None,
    tones: Optional[List[str]] = None,
    has_set: Optional[bool] = None,
    customers: Optional[List[str]] = None,
    metals: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    set_codes: Optional[List[str]] = None,
    sizes: Optional[List[str]] = None,
    concept_designers: Optional[List[str]] = None,
    creative_designers: Optional[List[str]] = None,
    weight_designers: Optional[List[str]] = None,
    min_wax_wt: Optional[float] = None,
    max_wax_wt: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    rm_categories: Optional[List[str]] = None,
    rm_subcategories: Optional[List[str]] = None,
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
    page: int = 1,
    page_size: int = 24
) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()

    where_sql, params = _build_where_clause(
        search_query=search_query, lab_grown=lab_grown, image_source=image_source,
        sieve_match_mode=sieve_match_mode, categories=categories, sales_cat1=sales_cat1,
        sales_cat2=sales_cat2, brands=brands, tones=tones, customers=customers,
        metals=metals, colors=colors, set_codes=set_codes,has_set=has_set, sizes=sizes,
        concept_designers=concept_designers, creative_designers=creative_designers,
        weight_designers=weight_designers, start_date=start_date, end_date=end_date,
        min_total_wt=min_total_wt, max_total_wt=max_total_wt, min_wax_wt=min_wax_wt,
        max_wax_wt=max_wax_wt, rm_categories=rm_categories, rm_subcategories=rm_subcategories,
        ln1=ln1, ln2=ln2, min_rm_wt=min_rm_wt, max_rm_wt=max_rm_wt
    )

    # 1. Total matching count
    cur.execute(f"SELECT COUNT(*) FROM styles WHERE {where_sql};", params)
    total_items = cur.fetchone()[0]

    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
    page = max(1, min(page, total_pages))
    offset = (page - 1) * page_size

    # 2. Dynamic Sorting: Cluster matching sets together if set filtering is active
    if has_set or set_codes:
        if min_wax_wt is not None or max_wax_wt is not None:
            order_sql = f"ORDER BY {COL_SET_CD} ASC, wax_value ASC"
        elif min_total_wt is not None or max_total_wt is not None:
            order_sql = f"ORDER BY {COL_SET_CD} ASC, {COL_TOTAL_WT} ASC"
        elif min_rm_wt is not None or max_rm_wt is not None:
            order_sql = f"ORDER BY {COL_SET_CD} ASC, rm_stones_wt ASC"
        else:
            order_sql = f"ORDER BY {COL_SET_CD} ASC, {COL_CTG_DESC} ASC, created_date_str DESC"
    else:
        if min_wax_wt is not None or max_wax_wt is not None:
            order_sql = "ORDER BY wax_value ASC"
        elif min_total_wt is not None or max_total_wt is not None:
            order_sql = f"ORDER BY {COL_TOTAL_WT} ASC"
        elif min_rm_wt is not None or max_rm_wt is not None:
            order_sql = "ORDER BY rm_stones_wt ASC"
        else:
            order_sql = "ORDER BY created_date_str DESC"

    # 3. Retrieve Page Items
    query = f"""
        SELECT *, {COL_STYLE} as drcd, rm_stones_wt as DiaCts, date_display as {COL_DATE}
        FROM styles
        WHERE {where_sql}
        {order_sql}
        LIMIT ? OFFSET ?;
    """
    cur.execute(query, params + [page_size, offset])
    items = [dict(r) for r in cur.fetchall()]

    # Attach Stone Shapes and format date to DD:MM:YYYY
    for item in items:
        # Date cleanup to DD:MM:YYYY
        raw_date = str(item.get(COL_DATE) or "").split(" ")[0].strip()
        if raw_date and raw_date != "-":
            # Handles YYYY-MM-DD or DD-MM-YYYY formats cleanly
            parts = raw_date.replace("/", "-").split("-")
            if len(parts) == 3:
                if len(parts[0]) == 4:  # YYYY-MM-DD
                    item[COL_DATE] = f"{parts[2]}/{parts[1]}/{parts[0]}"
                else:                   # DD-MM-YYYY
                    item[COL_DATE] = f"{parts[0]}/{parts[1]}/{parts[2]}"
            else:
                item[COL_DATE] = raw_date
        else:
            item[COL_DATE] = "-"

        style_cd = item[COL_STYLE]
        cur.execute(f"SELECT DISTINCT {COL_RM_SUBCTG} FROM stone_items WHERE {COL_RM_DSG} = ? AND {COL_RM_SUBCTG} != '';", (style_cd,))
        shapes = [r[0] for r in cur.fetchall()]
        item["rm_subctgs"] = shapes

    conn.close()

    return {
        "page": page,
        "page_size": page_size,
        "total_items": total_items,
        "total_pages": total_pages,
        "items": items
    }


def get_cascading_filter_options(
    df=None,
    search_query: Optional[str] = None,
    lab_grown: Optional[str] = None,
    image_source: Optional[str] = None,
    sieve_match_mode: Optional[str] = "any",
    categories: Optional[List[str]] = None,
    sizes: Optional[List[str]] = None,
    sales_cat1: Optional[List[str]] = None,
    sales_cat2: Optional[List[str]] = None,
    brands: Optional[List[str]] = None,
    tones: Optional[List[str]] = None,
    has_set: Optional[bool] = None,
    customers: Optional[List[str]] = None,
    metals: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    set_codes: Optional[List[str]] = None,
    concept_designers: Optional[List[str]] = None,
    creative_designers: Optional[List[str]] = None,
    weight_designers: Optional[List[str]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    min_wax_wt: Optional[float] = None,
    max_wax_wt: Optional[float] = None,
    rm_categories: Optional[List[str]] = None,
    rm_subcategories: Optional[List[str]] = None,
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
) -> dict:
    """Uses indexed SELECT DISTINCT queries to resolve cascading dropdown options in milliseconds."""
    conn = get_db_connection()
    cur = conn.cursor()

    def get_dim_uniques(col_name: str, dim_name: str) -> List[str]:
        where_sql, params = _build_where_clause(
            search_query=search_query, lab_grown=lab_grown, image_source=image_source,
            sieve_match_mode=sieve_match_mode, categories=categories, sales_cat1=sales_cat1,
            sales_cat2=sales_cat2, brands=brands, tones=tones, customers=customers,
            metals=metals, colors=colors, set_codes=set_codes,has_set=has_set, sizes=sizes,
            concept_designers=concept_designers, creative_designers=creative_designers,
            weight_designers=weight_designers, start_date=start_date, end_date=end_date,
            min_total_wt=min_total_wt, max_total_wt=max_total_wt, min_wax_wt=min_wax_wt,
            max_wax_wt=max_wax_wt, rm_categories=rm_categories, rm_subcategories=rm_subcategories,
            ln1=ln1, ln2=ln2, min_rm_wt=min_rm_wt, max_rm_wt=max_rm_wt,
            exclude_dim=dim_name
        )
        cur.execute(f"SELECT DISTINCT {col_name} FROM styles WHERE {where_sql} AND {col_name} IS NOT NULL AND {col_name} != '' ORDER BY {col_name} ASC;", params)
        return [r[0] for r in cur.fetchall()]

    # Fast indexed cascading queries
    categories_res = get_dim_uniques(COL_CTG_DESC, "categories")
    sizes_res = get_dim_uniques(COL_SIZE, "sizes")
    sales_cat1_res = get_dim_uniques(COL_SAL_CTG1, "sales_categories1")
    sales_cat2_res = get_dim_uniques(COL_SAL_CTG2, "sales_categories2")
    brands_res = get_dim_uniques(COL_BRAND, "brands")
    tones_res = get_dim_uniques(COL_TONE, "tones")
    customers_res = get_dim_uniques(COL_CUSTOMER, "customers")
    metals_res = get_dim_uniques(COL_METAL, "metals")
    colors_res = get_dim_uniques(COL_COLOR, "colors")
    set_codes_res = get_dim_uniques(COL_SET_CD, "set_codes")
    concept_res = get_dim_uniques(COL_CON_BY_DESC, "concept_designers")
    creative_res = get_dim_uniques(COL_CREAT_BY_DESC, "creative_designers")
    weight_res = get_dim_uniques(COL_WET_BY_DESC, "weight_designers")

    # Cascading Stone Types & Shapes (Queried from lightweight stone_shape_categories table)
    # 1. Stone Shapes available for the current stone types, paired as "SHAPE : CTG"
    if rm_categories:
        p = ",".join(["?"] * len(rm_categories))
        cur.execute(
            f"SELECT subctg, ctg FROM stone_shape_categories "
            f"WHERE ctg IN ({p}) "
            f"ORDER BY subctg ASC, ctg ASC;",
            rm_categories
        )
    else:
        cur.execute(
            "SELECT subctg, ctg FROM stone_shape_categories "
            "ORDER BY subctg ASC, ctg ASC;"
        )
    rm_subcategories_res = [f"{r[0]} : {r[1]}" for r in cur.fetchall()]

    # 2. Stone Types available for the current stone shapes
    if rm_subcategories:
        sub_clauses = []
        p_params = []
        for item in rm_subcategories:
            if " : " in item:
                parts = item.split(" : ")
                sub_clauses.append("(subctg = ? AND ctg = ?)")
                p_params.extend([parts[0].strip(), parts[1].strip()])
            else:
                sub_clauses.append("(subctg = ?)")
                p_params.append(item.strip())

        cur.execute(
            f"SELECT DISTINCT ctg FROM stone_shape_categories "
            f"WHERE {' OR '.join(sub_clauses)} "
            f"ORDER BY ctg ASC;",
            p_params
        )
        rm_categories_res = [r[0] for r in cur.fetchall()]
    else:
        cur.execute(
            "SELECT DISTINCT ctg FROM stone_shape_categories "
            "ORDER BY ctg ASC;"
        )
        rm_categories_res = [r[0] for r in cur.fetchall()]

    conn.close()

    return {
        "categories": categories_res,
        "sizes": sizes_res,
        "sales_categories1": sales_cat1_res,
        "sales_categories2": sales_cat2_res,
        "brands": brands_res,
        "tones": tones_res,
        "customers": customers_res,
        "metals": metals_res,
        "colors": colors_res,
        "set_codes": set_codes_res,
        "concept_designers": concept_res,
        "creative_designers": creative_res,
        "weight_designers": weight_res,
        "rm_categories": rm_categories_res,
        "rm_subcategories": rm_subcategories_res,
        "ranges": get_filter_options().get("ranges", {})
    }