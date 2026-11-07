from fastapi import FastAPI, Query, HTTPException , Depends , Header
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, List
from contextlib import asynccontextmanager
from pydantic import BaseModel
import threading
import uuid
import asyncio
from datetime import datetime, time as dtime, timedelta
import os
import data_loader
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from data_loader import load_data, get_rm_details
from filters import get_unique_filter_options, apply_filters_and_paginate , get_cascading_filter_options
from image_service import (
    index_image_directories, find_image_for_style,
    find_500_image_for_style, find_ld_image_for_style, find_cad_image_for_style,
    get_cropped_image_bytes, generate_shortlist_excel, generate_catalogue_excel
)
from auth_service import (
    init_auth_db, authenticate_user, create_access_token,
    decode_access_token, list_all_users, create_new_user,
    delete_user_by_username, update_user_password,
    set_user_active_status, is_user_still_active
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
        sync_status["step"] = "Indexing jewelry image directories..."
        index_image_directories()
        from image_service import _primary_index, _fallback_index
        sync_status["images"] = len(_primary_index) + len(_fallback_index)

        sync_status["step"] = "Reading and indexing Excel files..."
        load_data(force_reload=True)
        conn = data_loader.get_db_connection()
        total_records = conn.execute("SELECT COUNT(*) FROM styles;").fetchone()[0]
        conn.close()
        sync_status["records"] = total_records

        sync_status["step"] = "Ready"
        sync_status["is_ready"] = True
        print("[INFO] Background initial sync complete! Application ready.")
    except Exception as e:
        sync_status["step"] = f"Error: {e}"
        print(f"[ERROR] Initial sync failed: {e}")

async def schedule_daily_refresh(target_hour: int = 2, target_minute: int = 0):
    """
    Runs in the background and triggers load_data(force_reload=True)
    automatically every day at the target time (default: 02:00 AM).
    """
    while True:
        now = datetime.now()
        # Compute next target run datetime
        target_today = datetime.combine(now.date(), dtime(target_hour, target_minute))
        if now >= target_today:
            next_run = target_today + timedelta(days=1)
        else:
            next_run = target_today

        wait_seconds = (next_run - now).total_seconds()
        print(f"[INFO] Next scheduled daily Excel sync at: {next_run.strftime('%Y-%m-%d %H:%M:%S')} (in {int(wait_seconds/60)} mins)")
        await asyncio.sleep(wait_seconds)

        try:
            print("[INFO] Starting scheduled daily database sync...")
            sync_status["is_ready"] = False
            sync_status["step"] = "Scheduled sync: Updating Excel database..."
            
            # Re-index images and rebuild catalog.db
            index_image_directories()
            load_data(force_reload=True)

            conn = data_loader.get_db_connection()
            total_records = conn.execute("SELECT COUNT(*) FROM styles;").fetchone()[0]
            conn.close()

            sync_status["records"] = total_records
            sync_status["step"] = "Ready"
            sync_status["is_ready"] = True
            print(f"[INFO] Daily sync complete! Re-indexed {total_records:,} records.")
        except Exception as e:
            sync_status["step"] = f"Daily sync error: {e}"
            print(f"[ERROR] Scheduled daily sync failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 0. Initialize authentication database
    init_auth_db()
    # 1. Startup initial sync
    t = threading.Thread(target=background_initial_sync, daemon=True)
    t.start()
    
    # 2. Daily automated schedule (Runs at 02:00 AM every night)
    scheduler_task = asyncio.create_task(schedule_daily_refresh(target_hour=2, target_minute=0))
    
    yield
    
    scheduler_task.cancel()

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

# --- Security Dependency Helpers ---
def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token missing")
    token = authorization.split("Bearer ")[1].strip()
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    # Real-time check: Ensure user hasn't been deactivated or deleted while holding a token
    username = payload.get("sub")
    if not username or not is_user_still_active(username):
        raise HTTPException(status_code=401, detail="Account is disabled or no longer exists")

    return payload

def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    return user


@app.get("/api/image/{style_code}")
def api_get_product_image(
    style_code: str,
    view: Optional[str] = Query(None),   # 'primary', 'secondary', 'cad', or None (card fallback)
    full: bool = False
):
    if view == "cad":
        matched_path = find_cad_image_for_style(style_code)
    elif view == "primary":
        matched_path = find_500_image_for_style(style_code)
    elif view == "secondary":
        matched_path = find_ld_image_for_style(style_code)
    else:
        # Default card priority: 500 -> LD -> None
        matched_path = find_image_for_style(style_code)

    if not matched_path:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        if full:
            # Stream the raw, untouched original file directly from disk without cropping or compression
            ext = matched_path.suffix.lower()
            media_type = "image/png" if ext == ".png" else "image/jpeg"
            return Response(content=matched_path.read_bytes(), media_type=media_type)

        # Thumbnails for grid cards still use cropped preview for speed
        img_bytes = get_cropped_image_bytes(matched_path, full_resolution=False)
        return Response(content=img_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/filters")
def api_get_filters(
    search: Optional[str] = None,
    category: Optional[List[str]] = Query(None),
    size: Optional[List[str]] = Query(None),
    sales_cat1: Optional[List[str]] = Query(None),
    sales_cat2: Optional[List[str]] = Query(None),
    brand: Optional[List[str]] = Query(None),
    tone: Optional[List[str]] = Query(None),
    customer: Optional[List[str]] = Query(None),
    metal: Optional[List[str]] = Query(None),
    color: Optional[List[str]] = Query(None),
    set_cd: Optional[List[str]] = Query(None),
    has_set: Optional[bool] = None,
    concept_by: Optional[List[str]] = Query(None),
    creative_by: Optional[List[str]] = Query(None),
    weight_by: Optional[List[str]] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    min_wax_wt: Optional[float] = None,
    max_wax_wt: Optional[float] = None,
    min_pointed_wt: Optional[float] = None,
    max_pointed_wt: Optional[float] = None,
    lab_grown: Optional[str] = Query(None),
    image_source: Optional[str] = Query(None),
    sieve_match_mode: Optional[str] = Query("any"),
    rm_category: Optional[List[str]] = Query(None),
    rm_subcategory: Optional[List[str]] = Query(None),
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
    only_diamonds: Optional[bool] = None,
    user: dict = Depends(get_current_user)
):
    return get_cascading_filter_options(
        search_query=search,
        lab_grown=lab_grown,
        image_source=image_source,
        sieve_match_mode=sieve_match_mode,
        categories=category,
        sizes=size,
        sales_cat1=sales_cat1,
        sales_cat2=sales_cat2,
        brands=brand,
        tones=tone,
        customers=customer,
        metals=metal,
        colors=color,
        set_codes=set_cd,
        has_set=has_set,
        concept_designers=concept_by,
        creative_designers=creative_by,
        weight_designers=weight_by,
        start_date=start_date,
        end_date=end_date,
        min_total_wt=min_total_wt,
        max_total_wt=max_total_wt,
        min_wax_wt=min_wax_wt,
        max_wax_wt=max_wax_wt,
        min_pointed_wt=min_pointed_wt,
        max_pointed_wt=max_pointed_wt,
        rm_categories=rm_category,
        rm_subcategories=rm_subcategory,
        ln1=ln1,
        ln2=ln2,
        min_rm_wt=min_rm_wt,
        max_rm_wt=max_rm_wt,
        only_diamonds=only_diamonds
    )

@app.get("/api/rm-details/{style_code}")
def api_get_rm_details(style_code: str,user: dict = Depends(get_current_user)):
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
    image_source: Optional[str] = Query(None),
    sieve_match_mode: Optional[str] = Query("any"),
    size: Optional[List[str]] = Query(None),
    has_set: Optional[bool] = None,
    min_wax_wt: Optional[float] = None,      
    max_wax_wt: Optional[float] = None,
    min_pointed_wt: Optional[float] = None,
    max_pointed_wt: Optional[float] = None,
    # File B Filters
    rm_category: Optional[List[str]] = Query(None),
    rm_subcategory: Optional[List[str]] = Query(None),
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
    only_diamonds: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=12, le=96),
    user: dict = Depends(get_current_user)
):
    return apply_filters_and_paginate(
        search_query=search,
        categories=category,
        sales_cat1=sales_cat1,
        sales_cat2=sales_cat2,
        brands=brand,
        tones=tone,
        customers=customer,
        metals=metal,
        has_set=has_set,
        colors=color,
        set_codes=set_cd,
        sizes=size,
        min_wax_wt=min_wax_wt,           
        max_wax_wt=max_wax_wt,
        concept_designers=concept_by,
        creative_designers=creative_by,              
        weight_designers=weight_by,
        start_date=start_date,
        end_date=end_date,
        min_total_wt=min_total_wt,
        max_total_wt=max_total_wt,
        min_pointed_wt=min_pointed_wt, 
        max_pointed_wt=max_pointed_wt,
        only_diamonds=only_diamonds,
        
        lab_grown=lab_grown,
        image_source=image_source,
        sieve_match_mode=sieve_match_mode,
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
    has_set: Optional[bool] = None,
    concept_by: Optional[List[str]] = Query(None),
    creative_by: Optional[List[str]] = Query(None),   
    weight_by: Optional[List[str]] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_total_wt: Optional[float] = None,
    max_total_wt: Optional[float] = None,
    min_pointed_wt: Optional[float] = None,
    max_pointed_wt: Optional[float] = None,
    lab_grown: Optional[str] = Query(None),
    only_diamonds: Optional[bool] = None,
    image_source: Optional[str] = Query(None),
    sieve_match_mode: Optional[str] = Query("any"),
    size: Optional[List[str]] = Query(None),
    min_wax_wt: Optional[float] = None,       
    max_wax_wt: Optional[float] = None,
    rm_category: Optional[List[str]] = Query(None),
    rm_subcategory: Optional[List[str]] = Query(None),
    ln1: Optional[float] = None,
    ln2: Optional[float] = None,
    min_rm_wt: Optional[float] = None,
    max_rm_wt: Optional[float] = None,
    user: dict = Depends(get_current_user)
):
    res = apply_filters_and_paginate(
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
        has_set=has_set,
        concept_designers=concept_by,
        creative_designers=creative_by,
        weight_designers=weight_by,
        start_date=start_date,
        end_date=end_date,
        min_total_wt=min_total_wt,
        max_total_wt=max_total_wt,
        min_pointed_wt=min_pointed_wt, 
        max_pointed_wt=max_pointed_wt,
        lab_grown=lab_grown,
        only_diamonds=only_diamonds,
        image_source=image_source,
        sieve_match_mode=sieve_match_mode,
        sizes=size,
        min_wax_wt=min_wax_wt,          
        max_wax_wt=max_wax_wt,
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
    load_data(force_reload=True)
    conn = data_loader.get_db_connection()
    cnt = conn.execute("SELECT COUNT(*) FROM styles;").fetchone()[0]
    conn.close()
    return {"status": "success", "total_records": cnt}

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
def api_start_export_job(payload: ExportPayload, export_type: str = Query("row"),user: dict = Depends(get_current_user)):
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

# --- Auth Request Payloads ---
class LoginPayload(BaseModel):
    username: str
    password: str

class CreateUserPayload(BaseModel):
    username: str
    password: str
    role: Optional[str] = "user"

class UpdatePasswordPayload(BaseModel):
    new_password: str

class UpdateStatusPayload(BaseModel):
    is_active: bool



# --- Auth Routes ---
@app.post("/api/auth/login")
def api_login(payload: LoginPayload):
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if user.get("error") == "ACCOUNT_DISABLED":
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    token = create_access_token(user["username"], user["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "role": user["role"]
        }
    }

@app.get("/api/auth/me")
def api_get_me(user: dict = Depends(get_current_user)):
    return {"username": user["sub"], "role": user.get("role", "user")}

# --- Admin User Management Routes (Protected) ---
@app.get("/api/admin/users")
def api_list_users(admin: dict = Depends(get_current_admin)):
    return {"users": list_all_users()}

@app.post("/api/admin/users")
def api_create_user(payload: CreateUserPayload, admin: dict = Depends(get_current_admin)):
    if not payload.username.strip() or not payload.password.strip():
        raise HTTPException(status_code=400, detail="Username and password cannot be empty")
    
    success = create_new_user(payload.username, payload.password, payload.role or "user")
    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")
    return {"status": "success", "message": f"User '{payload.username}' created successfully"}

@app.delete("/api/admin/users/{username}")
def api_delete_user(username: str, admin: dict = Depends(get_current_admin)):
    if username.strip().lower() == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete master admin account")
    
    success = delete_user_by_username(username)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": f"User '{username}' deleted successfully"}


@app.put("/api/admin/users/{username}/password")
def api_update_password(
    username: str,
    payload: UpdatePasswordPayload,
    admin: dict = Depends(get_current_admin)
):
    if not payload.new_password.strip():
        raise HTTPException(status_code=400, detail="New password cannot be empty")

    success = update_user_password(username, payload.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": f"Password updated for '{username}'"}

@app.put("/api/admin/users/{username}/status")
def api_update_user_status(
    username: str,
    payload: UpdateStatusPayload,
    admin: dict = Depends(get_current_admin)
):
    if username.strip().lower() == "admin" and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate the master admin account")

    success = set_user_active_status(username, payload.is_active)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    status_str = "activated" if payload.is_active else "suspended"
    return {"status": "success", "message": f"User '{username}' {status_str} successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)