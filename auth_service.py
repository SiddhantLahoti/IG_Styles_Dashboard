import sqlite3
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from config import (
    AUTH_DB_PATH, ADMIN_USERNAME, ADMIN_PASSWORD,
    JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
)

DEFAULT_ADMIN_USERNAME = ADMIN_USERNAME
DEFAULT_ADMIN_PASSWORD = ADMIN_PASSWORD

def get_auth_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(AUTH_DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def init_auth_db():
    """Initializes auth.db, adds is_active column if missing, and seeds default admin."""
    conn = get_auth_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Migration: Add is_active column if the database was already created previously
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(users);")
        columns = [col[1] for col in cur.fetchall()]
        if "is_active" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;")

        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);")

        cur.execute("SELECT id FROM users WHERE username = ?;", (DEFAULT_ADMIN_USERNAME,))
        admin = cur.fetchone()
        if not admin:
            pw_hash = hash_password(DEFAULT_ADMIN_PASSWORD)
            conn.execute(
                "INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, 1);",
                (DEFAULT_ADMIN_USERNAME, pw_hash, "admin")
            )
            print(f"[AUTH] Created default admin account: '{DEFAULT_ADMIN_USERNAME}'")
    conn.close()

def create_access_token(username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": username,
        "role": role,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def authenticate_user(username: str, password: str) -> Optional[Dict]:
    conn = get_auth_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, password_hash, role, is_active FROM users WHERE username = ?;",
        (username.strip(),)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    if not bool(row["is_active"]):
        return {"error": "ACCOUNT_DISABLED", "username": row["username"]}

    return {
        "id": row["id"],
        "username": row["username"],
        "role": row["role"],
        "is_active": bool(row["is_active"])
    }

def list_all_users() -> List[Dict]:
    conn = get_auth_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, role, is_active, created_at FROM users ORDER BY id ASC;")
    rows = [
        {
            "id": r["id"],
            "username": r["username"],
            "role": r["role"],
            "is_active": bool(r["is_active"]),
            "created_at": r["created_at"]
        }
        for r in cur.fetchall()
    ]
    conn.close()
    return rows

def create_new_user(username: str, password: str, role: str = "user") -> bool:
    clean_user = username.strip()
    clean_role = role.strip().lower()
    if clean_role not in ["admin", "user"]:
        clean_role = "user"

    pw_hash = hash_password(password)
    conn = get_auth_connection()
    try:
        with conn:
            conn.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?);",
                (clean_user, pw_hash, clean_role)
            )
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def delete_user_by_username(username: str) -> bool:
    clean_user = username.strip()
    # Prevent deleting the master admin account
    if clean_user.lower() == DEFAULT_ADMIN_USERNAME.lower():
        return False

    conn = get_auth_connection()
    with conn:
        cur = conn.execute("DELETE FROM users WHERE username = ?;", (clean_user,))
        deleted = cur.rowcount > 0
    conn.close()
    return deleted

def update_user_password(username: str, new_password: str) -> bool:
    """Updates password hash for a given user."""
    clean_user = username.strip()
    new_hash = hash_password(new_password)
    conn = get_auth_connection()
    with conn:
        cur = conn.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?;",
            (new_hash, clean_user)
        )
        updated = cur.rowcount > 0
    conn.close()
    return updated

def set_user_active_status(username: str, is_active: bool) -> bool:
    """Activates or suspends access for a user. Prevents deactivating master admin."""
    clean_user = username.strip()
    if clean_user.lower() == DEFAULT_ADMIN_USERNAME.lower() and not is_active:
        return False  # Master admin cannot be deactivated

    conn = get_auth_connection()
    with conn:
        cur = conn.execute(
            "UPDATE users SET is_active = ? WHERE username = ?;",
            (1 if is_active else 0, clean_user)
        )
        updated = cur.rowcount > 0
    conn.close()
    return updated

def is_user_still_active(username: str) -> bool:
    """Quick lookup to verify if an active token's owner is still active in auth.db."""
    conn = get_auth_connection()
    cur = conn.cursor()
    cur.execute("SELECT is_active FROM users WHERE username = ?;", (username.strip(),))
    row = cur.fetchone()
    conn.close()
    return bool(row["is_active"]) if row else False