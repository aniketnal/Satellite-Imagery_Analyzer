import json
import os
from functools import lru_cache
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from werkzeug.security import check_password_hash, generate_password_hash


def normalize_email(email):
    return (email or "").strip().lower()


@lru_cache(maxsize=1)
def get_supabase_config():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_service_role_key:
        return None

    return {
        "base_url": supabase_url.rstrip("/") + "/rest/v1",
        "service_role_key": supabase_service_role_key,
    }


def require_supabase_config():
    config = get_supabase_config()
    if config is None:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.")
    return config


def _supabase_request(method, table, *, filters=None, payload=None, select="*", order_by=None, limit=None):
    config = require_supabase_config()
    url = f"{config['base_url']}/{table}"

    params = []
    if select:
        params.append(("select", select))

    if filters:
        for key, value in filters.items():
            params.append((key, value))

    if order_by:
        params.append(("order", order_by))

    if limit is not None:
        params.append(("limit", str(limit)))

    if params:
        url = f"{url}?{urlencode(params)}"

    headers = {
        "apikey": config["service_role_key"],
        "Authorization": f"Bearer {config['service_role_key']}",
        "Accept": "application/json",
    }

    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=representation"
        data = json.dumps(payload).encode("utf-8")

    request = Request(url, data=data, headers=headers, method=method)

    try:
        with urlopen(request) as response:
            body = response.read().decode("utf-8")
            if not body:
                return []
            parsed = json.loads(body)
            return parsed if isinstance(parsed, list) else [parsed]
    except Exception as exc:
        raise RuntimeError(str(exc)) from exc


def _supabase_patch(table, payload, *, filters):
    config = require_supabase_config()
    url = f"{config['base_url']}/{table}"

    params = []
    if filters:
        for key, value in filters.items():
            params.append((key, value))

    if params:
        url = f"{url}?{urlencode(params)}"

    headers = {
        "apikey": config["service_role_key"],
        "Authorization": f"Bearer {config['service_role_key']}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    request = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="PATCH")

    try:
        with urlopen(request) as response:
            body = response.read().decode("utf-8")
            if not body:
                return []
            parsed = json.loads(body)
            return parsed if isinstance(parsed, list) else [parsed]
    except Exception as exc:
        raise RuntimeError(str(exc)) from exc


def serialize_user(row):
    if not row:
        return None

    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "email": row.get("email"),
        "role": row.get("role"),
        "createdAt": row.get("created_at"),
    }


def extract_report_state(row):
    if not row:
        return None

    return row.get("report_state") or {
        "area": row.get("area_shape"),
        "params": row.get("analysis_params") or {},
        "period": row.get("period_value"),
        "analysisData": {
            "vegetation_change_percent": row.get("vegetation_change_percent"),
            "urban_change_percent": row.get("urban_change_percent"),
            "water_change_percent": row.get("water_change_percent"),
            "uss_score": row.get("uss_score"),
            "uss_label": row.get("uss_label"),
            "uss_interpretation": row.get("uss_interpretation"),
            "uss_weights": row.get("uss_weights"),
            "temperature_proxy_percent": row.get("temperature_proxy_percent"),
            "period_years": row.get("period_years"),
            "area_km2": row.get("area_km2"),
            "status": row.get("status") or "completed",
        },
    }


def serialize_analysis(row):
    if not row:
        return None

    return {
        "id": row.get("id"),
        "userId": row.get("user_id"),
        "createdAt": row.get("created_at"),
        "reportState": row.get("report_state"),
        "areaKm2": row.get("area_km2"),
        "periodYears": row.get("period_years"),
        "vegetationChangePercent": row.get("vegetation_change_percent"),
        "urbanChangePercent": row.get("urban_change_percent"),
        "waterChangePercent": row.get("water_change_percent"),
        "ussScore": row.get("uss_score"),
        "ussLabel": row.get("uss_label"),
        "ussInterpretation": row.get("uss_interpretation"),
        "temperatureProxyPercent": row.get("temperature_proxy_percent"),
    }


def seed_default_admin_user():
    config = get_supabase_config()
    if config is None:
        return None

    admin_email = normalize_email(os.getenv("ADMIN_EMAIL", "admin@sia.local"))
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_name = os.getenv("ADMIN_NAME", "System Admin")
    admin_role = os.getenv("ADMIN_ROLE", "Administrator")

    existing = _supabase_request("GET", "app_users", filters={"email": f"eq.{admin_email}"}, select="id", limit=1)
    admin_payload = {
        "name": admin_name,
        "email": admin_email,
        "role": admin_role,
        "password_hash": generate_password_hash(admin_password),
    }

    if existing:
        _supabase_patch(
            "app_users",
            {"name": admin_name, "role": admin_role, "password_hash": admin_payload["password_hash"]},
            filters={"email": f"eq.{admin_email}"},
        )
        return existing[0]

    inserted = _supabase_request("POST", "app_users", payload=admin_payload)
    return inserted[0] if inserted else None


def register_user(name, email, password):
    require_supabase_config()
    normalized_email = normalize_email(email)

    if not name or not normalized_email or not password:
        raise ValueError("Please fill all required fields.")

    if len(password.strip()) < 6:
        raise ValueError("Password must be at least 6 characters.")

    existing = _supabase_request("GET", "app_users", filters={"email": f"eq.{normalized_email}"}, select="id", limit=1)
    if existing:
        raise ValueError("Account already exists for this email.")

    payload = {
        "name": name.strip(),
        "email": normalized_email,
        "role": "Planner",
        "password_hash": generate_password_hash(password.strip()),
    }

    inserted = _supabase_request("POST", "app_users", payload=payload)
    if not inserted:
        raise RuntimeError("Failed to create user.")

    return serialize_user(inserted[0])


def authenticate_user(email, password):
    require_supabase_config()
    normalized_email = normalize_email(email)

    if not normalized_email or not password:
        raise ValueError("Please enter your email and password.")

    found = _supabase_request("GET", "app_users", filters={"email": f"eq.{normalized_email}"}, limit=1)
    if not found:
        raise ValueError("Invalid email or password.")

    user_row = found[0]
    if not check_password_hash(user_row.get("password_hash") or "", password.strip()):
        raise ValueError("Invalid email or password.")

    return serialize_user(user_row)


def build_analysis_record(user_id, report_state, analysis_result):
    analysis_data = (report_state or {}).get("analysisData") or {}
    return {
        "user_id": user_id,
        "area_km2": analysis_result.get("area_km2"),
        "period_years": analysis_result.get("period_years"),
        "period_value": report_state.get("period") if isinstance(report_state, dict) else None,
        "analysis_params": report_state.get("params") if isinstance(report_state, dict) else {},
        "area_shape": report_state.get("area") if isinstance(report_state, dict) else None,
        "vegetation_change_percent": analysis_result.get("vegetation_change_percent"),
        "urban_change_percent": analysis_result.get("urban_change_percent"),
        "water_change_percent": analysis_result.get("water_change_percent"),
        "uss_score": analysis_result.get("uss_score"),
        "uss_label": analysis_result.get("uss_label"),
        "uss_interpretation": analysis_result.get("uss_interpretation"),
        "uss_weights": analysis_result.get("uss_weights"),
        "temperature_proxy_percent": analysis_result.get("temperature_proxy_percent"),
        "status": analysis_result.get("status") or analysis_data.get("status") or "completed",
        "report_state": report_state,
    }


def save_analysis_for_user(user_id, report_state, analysis_result):
    require_supabase_config()

    if not user_id:
        raise ValueError("User id is required.")

    if not isinstance(report_state, dict):
        raise ValueError("Report state is required.")

    if not isinstance(analysis_result, dict):
        raise ValueError("Analysis result is required.")

    payload = build_analysis_record(user_id, report_state, analysis_result)
    inserted = _supabase_request("POST", "analyses", payload=payload)
    if not inserted:
        raise RuntimeError("Failed to save analysis.")

    return serialize_analysis(inserted[0])


def get_user_analyses(user_id):
    if not user_id:
        return []

    rows = _supabase_request("GET", "analyses", filters={"user_id": f"eq.{user_id}"}, order_by="created_at.desc")

    analyses = []
    for row in rows or []:
        analyses.append({
            "id": row.get("id"),
            "userId": row.get("user_id"),
            "createdAt": row.get("created_at"),
            "reportState": row.get("report_state"),
        })
    return analyses


def get_all_analyses():
    rows = _supabase_request("GET", "analyses", order_by="created_at.desc") or []

    analyses = []
    for row in rows:
        analyses.append({
            "id": row.get("id"),
            "userId": row.get("user_id"),
            "createdAt": row.get("created_at"),
            "reportState": row.get("report_state"),
        })
    return analyses


def get_all_users_with_analyses():
    users = _supabase_request("GET", "app_users", order_by="created_at.asc") or []
    analyses = _supabase_request("GET", "analyses", order_by="created_at.desc") or []

    grouped = {}
    for row in analyses:
        grouped.setdefault(row.get("user_id"), []).append({
            "id": row.get("id"),
            "userId": row.get("user_id"),
            "createdAt": row.get("created_at"),
            "reportState": row.get("report_state"),
        })

    results = []
    for user_row in users:
        user = serialize_user(user_row)
        user_analyses = grouped.get(user_row.get("id"), [])
        results.append({
            **user,
            "analyses": user_analyses,
            "analysesCount": len(user_analyses),
        })
    return results


def record_authority_alert(*, analysis_id=None, recipient_email, reasons, delivery_status, smtp_response=None):
    config = get_supabase_config()
    if config is None:
        return None

    payload = {
        "analysis_id": analysis_id,
        "recipient_email": recipient_email,
        "trigger_reasons": reasons,
        "delivery_status": delivery_status,
        "smtp_response": smtp_response,
    }

    inserted = _supabase_request("POST", "authority_alerts", payload=payload)
    return inserted[0] if inserted else None