import math
import pandas as pd
from typing import Optional, List
from config import (
    COL_STYLE, COL_CTG_DESC, COL_SAL_CTG1, COL_SAL_CTG2,
    COL_BRAND, COL_TONE, COL_CUSTOMER, COL_DATE,
    COL_METAL, COL_COLOR, COL_TOTAL_WT, 
    COL_RM_LN1, COL_RM_LN2, COL_RM_WT, COL_RM_CTG, COL_RM_SUBCTG ,COL_SET_CD ,COL_CON_BY_DESC, COL_CON_BY_DESC1, COL_CREAT_BY_DESC, COL_CREAT_BY_DESC1, COL_WET_BY_DESC, COL_WET_BY_DESC1
)
import data_loader
from data_loader import get_filter_options

def get_unique_filter_options(df: pd.DataFrame = None) -> dict:
    """Returns dynamic filter dropdown values and ranges from the loaded data."""
    return get_filter_options()

def apply_filters_and_paginate(
    df: pd.DataFrame,
    search_query: Optional[str] = None,
    lab_grown: Optional[str] = None,
    # File A Multi-select Dropdown Filters
    categories: Optional[List[str]] = None,
    sales_cat1: Optional[List[str]] = None,
    sales_cat2: Optional[List[str]] = None,
    brands: Optional[List[str]] = None,
    tones: Optional[List[str]] = None,
    customers: Optional[List[str]] = None,
    metals: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    set_codes: Optional[List[str]] = None,
    concept_designers: Optional[List[str]] = None,
    creative_designers: Optional[List[str]] = None,
    weight_designers: Optional[List[str]] = None,
    # File A Range Filters
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    # File B Raw Material Filters
    rm_categories: Optional[List[str]] = None,
    rm_subcategories: Optional[List[str]] = None,
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
    # Pagination
    page: int = 1,
    page_size: int = 24
) -> dict:
    filtered_df = df

    # 1. Search Query across Style Code, Categories, Customer, and Designers
    if search_query and search_query.strip():
        q = search_query.strip().lower()
        mask = (
            filtered_df[COL_STYLE].str.lower().str.contains(q, na=False) |
            filtered_df[COL_CTG_DESC].str.lower().str.contains(q, na=False) |
            filtered_df[COL_SAL_CTG1].str.lower().str.contains(q, na=False) |
            filtered_df[COL_CUSTOMER].str.lower().str.contains(q, na=False) |
            filtered_df[COL_BRAND].str.lower().str.contains(q, na=False)
        )
        filtered_df = filtered_df[mask]

    # 2. File A Multi-Select Filters
    if categories:
        filtered_df = filtered_df[filtered_df[COL_CTG_DESC].isin(categories)]
    if sales_cat1:
        filtered_df = filtered_df[filtered_df[COL_SAL_CTG1].isin(sales_cat1)]
    if sales_cat2:
        filtered_df = filtered_df[filtered_df[COL_SAL_CTG2].isin(sales_cat2)]
    if brands:
        filtered_df = filtered_df[filtered_df[COL_BRAND].isin(brands)]
    if tones:
        filtered_df = filtered_df[filtered_df[COL_TONE].isin(tones)]
    if customers:
        filtered_df = filtered_df[filtered_df[COL_CUSTOMER].isin(customers)]
    if metals:
        filtered_df = filtered_df[filtered_df[COL_METAL].isin(metals)]
    if colors:
        filtered_df = filtered_df[filtered_df[COL_COLOR].isin(colors)]
    if set_codes:
        filtered_df = filtered_df[filtered_df[COL_SET_CD].isin(set_codes)]
    if concept_designers:
        filtered_df = filtered_df[
            filtered_df[COL_CON_BY_DESC].isin(concept_designers) | 
            filtered_df[COL_CON_BY_DESC1].isin(concept_designers)
        ]
    if creative_designers:
        filtered_df = filtered_df[
            filtered_df[COL_CREAT_BY_DESC].isin(creative_designers) | 
            filtered_df[COL_CREAT_BY_DESC1].isin(creative_designers)
        ]
    if weight_designers:
        filtered_df = filtered_df[
            filtered_df[COL_WET_BY_DESC].isin(weight_designers) | 
            filtered_df[COL_WET_BY_DESC1].isin(weight_designers)
        ]
    # Lab Grown Filter (Styles starting with 'L-')
    if lab_grown == "lab_grown":
        filtered_df = filtered_df[filtered_df[COL_STYLE].str.upper().str.startswith("L-")]
    elif lab_grown == "natural":
        filtered_df = filtered_df[~filtered_df[COL_STYLE].str.upper().str.startswith("L-")]
    # 3. File A Date & Total Weight Range Filters
    if start_date:
        filtered_df = filtered_df[filtered_df[COL_DATE] >= pd.to_datetime(start_date)]
    if end_date:
        filtered_df = filtered_df[filtered_df[COL_DATE] <= pd.to_datetime(end_date)]

    if min_total_wt is not None:
        filtered_df = filtered_df[filtered_df[COL_TOTAL_WT] >= min_total_wt]
    if max_total_wt is not None:
        filtered_df = filtered_df[filtered_df[COL_TOTAL_WT] <= max_total_wt]

    # 4. File B Raw Material (RM) Cross-Filtering
    rm_filter_active = any([
        rm_categories, rm_subcategories,
        ln1 is not None, ln2 is not None,
        min_rm_wt is not None, max_rm_wt is not None
    ])

    if rm_filter_active:
        rm_lookup = data_loader._rm_map  # Always accesses the populated map in real time
        req_ctgs = set(rm_categories) if rm_categories else None
        req_subctgs = set(rm_subcategories) if rm_subcategories else None

        matching_styles = set()
        for dsg, data in rm_lookup.items():
            # Match stone categories / shapes
            if req_ctgs and not (req_ctgs & set(data.get("ctgs", []))):
                continue
            if req_subctgs and not (req_subctgs & set(data.get("subctgs", []))):
                continue

            # Match stone row sieve ranges and weight
            items = data.get("items", [])
            matched_any_stone = False

            has_numeric_rm_constraint = any([
                ln1 is not None, ln2 is not None,
                min_rm_wt is not None, max_rm_wt is not None
            ])

            if not has_numeric_rm_constraint:
                matched_any_stone = True
            else:
                for stone in items:
                    stone_ln1 = stone.get(COL_RM_LN1, 0.0)
                    stone_ln2 = stone.get(COL_RM_LN2, 0.0)
                    wt = stone.get(COL_RM_WT, 0.0)

                    if ln1 is not None and round(stone_ln1, 3) != round(ln1, 3):
                        continue
                    if ln2 is not None and round(stone_ln2, 3) != round(ln2, 3):
                        continue
                    if min_rm_wt is not None and wt < min_rm_wt:
                        continue
                    if max_rm_wt is not None and wt > max_rm_wt:
                        continue

                    matched_any_stone = True
                    break

            if matched_any_stone:
                matching_styles.add(dsg)

        filtered_df = filtered_df[filtered_df[COL_STYLE].isin(matching_styles)]

    # 5. Dynamic Sorting
    if min_total_wt is not None or max_total_wt is not None:
        filtered_df = filtered_df.sort_values(by=COL_TOTAL_WT, ascending=True, na_position="last")
    elif min_rm_wt is not None or max_rm_wt is not None:
        filtered_df = filtered_df.sort_values(by="rm_stones_wt", ascending=True, na_position="last")
    else:
        # Default: Newest date first
        if COL_DATE in filtered_df.columns:
            filtered_df = filtered_df.sort_values(by=COL_DATE, ascending=False, na_position="last")

    # 6. Pagination Slice
    total_items = len(filtered_df)
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
    page = max(1, min(page, total_pages))

    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_items = filtered_df.iloc[start_idx:end_idx].copy()

    # Format date for clean JSON display
    if COL_DATE in page_items.columns:
        page_items[COL_DATE] = page_items[COL_DATE].dt.strftime("%d-%m-%Y").fillna("-")

    # Add backwards-compatible 'drcd' alias for image lookups and shortlist downloads
    page_items["drcd"] = page_items[COL_STYLE]
    page_items["DiaCts"] = page_items["rm_stones_wt"]

    page_items = page_items.fillna("")

    return {
        "page": page,
        "page_size": page_size,
        "total_items": total_items,
        "total_pages": total_pages,
        "items": page_items.to_dict(orient="records")
    }