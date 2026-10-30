from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, List
from contextlib import asynccontextmanager
from pydantic import BaseModel
import threading
import uuid
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from data_loader import load_data, get_rm_details
from filters import get_unique_filter_options, apply_filters_and_paginate
from image_service import (
    index_image_directories, find_image_for_style,
    get_cropped_image_bytes, generate_shortlist_excel, generate_catalogue_excel
)

# Locate the frontend dist directory
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
FRONTEND_ASSETS = os.path.join(FRONTEND_DIST, "assets")

sync_status = {
    "is_ready": False,
    "step": "Initializing engine...",
    "records": 0,
    "images": 0
}

def background_initial_sync():
    global sync_status
    try:
        sync_status["step"] = "Reading and indexing Excel files..."
        df = load_data(force_reload=True)
        sync_status["records"] = len(df)

        sync_status["step"] = "Indexing jewelry image directories..."
        index_image_directories()
        from image_service import _primary_index, _fallback_files
        sync_status["images"] = len(_primary_index) + len(_fallback_files)

        sync_status["step"] = "Ready"
        sync_status["is_ready"] = True
        print("[INFO] Background initial sync complete! Application ready.")
    except Exception as e:
        sync_status["step"] = f"Error: {e}"
        print(f"[ERROR] Initial sync failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=background_initial_sync, daemon=True)
    t.start()
    yield

app = FastAPI(title="Design Catalog Dashboard", lifespan=lifespan)


# Mount compiled assets and original static folder (for caches/images)
if os.path.exists(FRONTEND_ASSETS):
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="assets")

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_home():
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return FileResponse("static/index.html")

@app.get("/api/status")
def api_get_status():
    return sync_status

@app.get("/api/image/{style_code}")
def api_get_product_image(style_code: str, full: bool = False):
    matched_path = find_image_for_style(style_code)
    if not matched_path:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        img_bytes = get_cropped_image_bytes(matched_path, full_resolution=full)
        media_type = "image/png" if full else "image/jpeg"
        return Response(content=img_bytes, media_type=media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/filters")
def api_get_filters():
    return get_unique_filter_options()

@app.get("/api/rm-details/{style_code}")
def api_get_rm_details(style_code: str):
    """Returns the stone & raw material breakdown rows from File B for this design."""
    return get_rm_details(style_code)

@app.get("/api/products")
def api_get_products(
    search: Optional[str] = None,
    # File A Filters
    category: Optional[List[str]] = Query(None),
    sales_cat1: Optional[List[str]] = Query(None),
    sales_cat2: Optional[List[str]] = Query(None),
    brand: Optional[List[str]] = Query(None),
    tone: Optional[List[str]] = Query(None),
    customer: Optional[List[str]] = Query(None),
    metal: Optional[List[str]] = Query(None),
    color: Optional[List[str]] = Query(None),
    set_cd: Optional[List[str]] = Query(None),
    concept_by: Optional[List[str]] = Query(None),
    creative_by: Optional[List[str]] = Query(None),    
    weight_by: Optional[List[str]] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    lab_grown: Optional[str] = Query(None),
    # File B Filters
    rm_category: Optional[List[str]] = Query(None),
    rm_subcategory: Optional[List[str]] = Query(None),
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=12, le=96)
):
    df = load_data()
    return apply_filters_and_paginate(
        df=df,
        search_query=search,
        categories=category,
        sales_cat1=sales_cat1,
        sales_cat2=sales_cat2,
        brands=brand,
        tones=tone,
        customers=customer,
        metals=metal,
        colors=color,
        set_codes=set_cd,
        concept_designers=concept_by,
        creative_designers=creative_by,              
        weight_designers=weight_by,
        start_date=start_date,
        end_date=end_date,
        min_total_wt=min_total_wt,
        max_total_wt=max_total_wt,
        lab_grown=lab_grown,
        rm_categories=rm_category,
        rm_subcategories=rm_subcategory,
        ln1=ln1,
        ln2=ln2,
        min_rm_wt=min_rm_wt,
        max_rm_wt=max_rm_wt,
        page=page,
        page_size=page_size
    )

@app.get("/api/products/all-filtered")
def api_get_all_filtered_products(
    search: Optional[str] = None,
    category: Optional[List[str]] = Query(None),
    sales_cat1: Optional[List[str]] = Query(None),
    sales_cat2: Optional[List[str]] = Query(None),
    brand: Optional[List[str]] = Query(None),
    tone: Optional[List[str]] = Query(None),
    customer: Optional[List[str]] = Query(None),
    metal: Optional[List[str]] = Query(None),
    color: Optional[List[str]] = Query(None),
    set_cd: Optional[List[str]] = Query(None),
    concept_by: Optional[List[str]] = Query(None),
    creative_by: Optional[List[str]] = Query(None),   
    weight_by: Optional[List[str]] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    lab_grown: Optional[str] = Query(None),
    rm_category: Optional[List[str]] = Query(None),
    rm_subcategory: Optional[List[str]] = Query(None),
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None
):
    df = load_data()
    res = apply_filters_and_paginate(
        df=df,
        search_query=search,
        categories=category,
        sales_cat1=sales_cat1,
        sales_cat2=sales_cat2,
        brands=brand,
        tones=tone,
        customers=customer,
        metals=metal,
        colors=color,
        set_codes=set_cd,
        concept_designers=concept_by,
        creative_designers=creative_by,
        weight_designers=weight_by,
        start_date=start_date,
        end_date=end_date,
        min_total_wt=min_total_wt,
        max_total_wt=max_total_wt,
        lab_grown=lab_grown,
        rm_categories=rm_category,
        rm_subcategories=rm_subcategory,
        ln1=ln1,
        ln2=ln2,
        min_rm_wt=min_rm_wt,
        max_rm_wt=max_rm_wt,
        page=1,
        page_size=300000
    )
    return {"items": res["items"]}

@app.post("/api/refresh")
def api_force_refresh():
    df = load_data(force_reload=True)
    return {"status": "success", "total_records": len(df)}

# Export Endpoints
class ExportPayload(BaseModel):
    items: List[dict]
    per_row: Optional[int] = 4

export_jobs = {}

def process_export_job(job_id: str, export_type: str, items: List[dict], per_row: int):
    try:
        def update_progress(current, total):
            if job_id in export_jobs:
                percent = int((current / total) * 100) if total > 0 else 0
                export_jobs[job_id]["current"] = current
                export_jobs[job_id]["total"] = total
                export_jobs[job_id]["percent"] = percent

        if export_type == "catalogue":
            stream = generate_catalogue_excel(items, per_row=per_row, progress_cb=update_progress)
            filename = f"Catalogue_{per_row}_per_row.xlsx"
        else:
            stream = generate_shortlist_excel(items, progress_cb=update_progress)
            filename = "Shortlisted_Products.xlsx"

        export_jobs[job_id]["data"] = stream.getvalue()
        export_jobs[job_id]["filename"] = filename
        export_jobs[job_id]["status"] = "completed"
        export_jobs[job_id]["percent"] = 100
    except Exception as e:
        export_jobs[job_id]["status"] = "failed"
        export_jobs[job_id]["error"] = str(e)

@app.post("/api/export-job/start")
def api_start_export_job(payload: ExportPayload, export_type: str = Query("row")):
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items to export")

    job_id = str(uuid.uuid4())
    per_row = payload.per_row if payload.per_row in [3, 4, 5] else 4

    export_jobs[job_id] = {
        "status": "processing",
        "current": 0,
        "total": len(payload.items),
        "percent": 0,
        "data": None,
        "filename": ""
    }

    thread = threading.Thread(
        target=process_export_job,
        args=(job_id, export_type, payload.items, per_row),
        daemon=True
    )
    thread.start()
    return {"job_id": job_id, "total": len(payload.items)}

@app.get("/api/export-job/{job_id}/progress")
def api_get_export_progress(job_id: str):
    if job_id not in export_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = export_jobs[job_id]
    return {
        "status": job["status"],
        "current": job["current"],
        "total": job["total"],
        "percent": job["percent"],
        "error": job.get("error")
    }

@app.get("/api/export-job/{job_id}/download")
def api_download_export_file(job_id: str):
    if job_id not in export_jobs or export_jobs[job_id]["status"] != "completed":
        raise HTTPException(status_code=404, detail="File not ready")
    job = export_jobs.pop(job_id)
    headers = {'Content-Disposition': f'attachment; filename="{job["filename"]}"'}
    return Response(
        content=job["data"],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)