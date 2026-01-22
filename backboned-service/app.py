# app.py
import io
import os
import secrets
import time
import urllib.parse
from collections import deque
import json
import logging
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Tuple, Union
from typing_extensions import TypedDict

import httpx
import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from torchvision import transforms

from model import CLASS_NAMES, hybrid_model
from visualizer import VisualizationConfig, generate_gradcam

# ===== 1) 加载模型 =====
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "best_model.pth"  # 训练时保存的模型路径
WECHAT_APPID = os.getenv("WECHAT_APPID", "")
WECHAT_SECRET = os.getenv("WECHAT_SECRET", "")
WECHAT_LOGIN_API = "https://api.weixin.qq.com/sns/jscode2session"
WECHAT_TIMEOUT = float(os.getenv("WECHAT_TIMEOUT", "5"))
WECHAT_TOKEN_API = "https://api.weixin.qq.com/cgi-bin/token"
WECHAT_PHONE_API = "https://api.weixin.qq.com/wxa/business/getuserphonenumber"
WECHAT_WEB_APPID = os.getenv("WECHAT_WEB_APPID", "")
WECHAT_WEB_SECRET = os.getenv("WECHAT_WEB_SECRET", "")
WECHAT_WEB_REDIRECT = os.getenv("WECHAT_WEB_REDIRECT", "")
WECHAT_WEB_SCOPE = os.getenv("WECHAT_WEB_SCOPE", "snsapi_login")
WEB_LOGIN_EXPIRES = int(os.getenv("WECHAT_WEB_LOGIN_EXPIRES", "300"))
LLM_API_BASE = os.getenv("LLM_API_BASE", "")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "15"))
ENABLE_VISUALIZATION = os.getenv("ENABLE_VISUALIZATION", "true").lower() in {"1", "true", "yes"}
VISUALIZATION_RETURN_TYPE = os.getenv("VISUALIZATION_RETURN_TYPE", "file")
VISUALIZATION_FORMAT = os.getenv("VISUALIZATION_FORMAT", "png")
VISUALIZATION_MAX_SIZE = int(os.getenv("VISUALIZATION_MAX_SIZE", "512"))
VISUALIZATION_OVERLAY_ALPHA = float(os.getenv("VISUALIZATION_OVERLAY_ALPHA", "0.45"))
VISUALIZATION_PUBLIC_PATH = os.getenv("VISUALIZATION_PUBLIC_PATH", "/static/visualizations")
GRADCAM_TARGET_LAYER = os.getenv("GRADCAM_TARGET_LAYER", "backbone.layer4")
STATIC_DIR = Path(os.getenv("STATIC_DIR", "static"))
STATIC_DIR = (Path(__file__).parent / STATIC_DIR).resolve()
VISUALIZATION_DIR = STATIC_DIR / "visualizations"
VISUALIZATION_MAX_FILES = int(os.getenv("VISUALIZATION_MAX_FILES", "200"))
VISUALIZATION_MAX_AGE_HOURS = int(os.getenv("VISUALIZATION_MAX_AGE_HOURS", "24"))

logger = logging.getLogger(__name__)

# 内置报告提示词与分类说明
CLASS_EXPLANATIONS: Dict[str, str] = {
    "normal": "未见明确异常征象；AI 未检出可疑肿块/结节，仍建议结合临床与既往影像综合评估。",
    "malignant": "恶性可能：常见影像学特征包括边缘分叶、毛刺征、胸膜牵拉、空泡征或纵隔/肺门淋巴结肿大等，需尽快进一步检查与 MDT 评估。",
    "benign": "良性可能：如钙化结节、平滑边界、脂肪密度提示错构瘤等，但仍需动态复查以排除进展。",
}

LLM_PROMPT_SYSTEM = (
    "你是一名胸部影像与肿瘤 MDT 专家。基于给定的 AI 影像分类 TopK 结果与元信息，"
    "生成结构化、专业且谨慎的中文医学报告。严格遵循以下规则：\n"
    "1) 用语客观，避免绝对化结论；突出不确定性与建议的后续检查。\n"
    "2) 仅依据提供的数据与常规指南知识进行推断，勿臆测未提供的信息。\n"
    "3) 输出 Markdown，包含这些分节：\n"
    "   - 检查信息\n"
    "   - AI 概要（逐项列出 TopK 标签与概率，并给出标签含义）\n"
    "   - 影像所见（结合常见征象给出可能的解释，避免过度诊断）\n"
    "   - 诊断结论（给出最可能诊断方向与置信度范围）\n"
    "   - 鉴别诊断（列出 2-4 条可替代解释）\n"
    "   - 建议（进一步影像/随访/实验室/病理的建议，注明时序与阈值）\n"
    "   - 局限性（说明模型与本报告的使用边界）\n"
)
access_token_cache: Dict[str, Union[float, str]] = {
    "value": "",
    "expire_at": 0.0
}
web_login_sessions: Dict[str, Dict[str, Any]] = {}
TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class PredictionItem(TypedDict):
    label: str
    prob: float


history_records: Deque[Dict[str, object]] = deque(maxlen=200)
generated_reports: Deque[Dict[str, object]] = deque(maxlen=200)
followup_plans: Dict[str, List[Dict[str, Any]]] = {}
followup_checkins: Dict[str, List[Dict[str, Any]]] = {}
metrics_state = {
    "date": date.today(),
    "total": 0,
    "today": 0,
    "confidence_sum_today": 0.0,
    "confidence_count_today": 0,
}


def load_model(model: torch.nn.Module, checkpoint: str) -> torch.nn.Module:
    ckpt_path = Path(checkpoint)
    if not ckpt_path.is_file():
        raise FileNotFoundError(f"模型文件 {checkpoint} 不存在")

    state = torch.load(ckpt_path, map_location=DEVICE)
    model.load_state_dict(state, strict=True)
    model.eval().to(DEVICE)
    return model


try:
    model: Optional[torch.nn.Module] = load_model(hybrid_model, MODEL_PATH)
except FileNotFoundError:
    model = None


app = FastAPI(title="肺癌预测系统")

# Static files for visualization artifacts
STATIC_DIR.mkdir(parents=True, exist_ok=True)
VISUALIZATION_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# CORS for local dev and tunneling demos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WeChatAuthRequest(BaseModel):
    code: str


class WeChatAuthResponse(TypedDict, total=False):
    openid: str
    unionid: str
    session_key: str
    expires_in: int


class PhoneNumberRequest(BaseModel):
    code: str
    openid: Optional[str] = None


class PhoneNumberResponse(TypedDict, total=False):
    phoneNumber: str
    purePhoneNumber: str
    countryCode: str


class ReportProviderConfig(BaseModel):
    api_base: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None


class ReportRequest(BaseModel):
    topk: List[PredictionItem]
    meta: Optional[Dict[str, Any]] = None
    provider: Optional[ReportProviderConfig] = None

class ReportResponse(TypedDict, total=False):
    report: str


class FollowupPlanCreate(BaseModel):
    userId: str
    title: str
    startDate: Optional[str] = None
    frequency: str = "daily"  # daily/weekly/custom
    days: int = 30
    notes: Optional[str] = None
    targets: Optional[Dict[str, Any]] = None


class FollowupCheckinCreate(BaseModel):
    userId: str
    planId: Optional[str] = None
    temperature: Optional[float] = None
    weight: Optional[float] = None
    symptoms: Optional[str] = None
    medication: Optional[str] = None
    notes: Optional[str] = None


def _clean_expired_sessions() -> None:
    now = time.time()
    expired = [state for state, session in web_login_sessions.items() if now - session.get("created_at", 0) > WEB_LOGIN_EXPIRES]
    for state in expired:
        web_login_sessions.pop(state, None)


def _require_wechat_web_config() -> None:
    if not (WECHAT_WEB_APPID and WECHAT_WEB_SECRET and WECHAT_WEB_REDIRECT):
        raise HTTPException(status_code=500, detail="未配置网页微信登录凭证")

# ===== 2) 推理函数 =====
def inference(pil_img: Image.Image, topk: int = 3) -> Tuple[List[PredictionItem], Dict[str, float]]:
    if model is None:
        raise RuntimeError("模型尚未加载")

    with torch.no_grad(), torch.cuda.amp.autocast(enabled=(DEVICE == "cuda")):
        x = TRANSFORM(pil_img).unsqueeze(0).to(DEVICE)  # [1,3,224,224]
        logits = model(x)
        prob = F.softmax(logits, dim=1).squeeze(0)      # [C]
        probabilities = {CLASS_NAMES[i]: float(prob[i]) for i in range(len(CLASS_NAMES))}
        p, idx = torch.topk(prob, k=min(topk, len(CLASS_NAMES)))
        topk_items = [{"label": CLASS_NAMES[i], "prob": float(pj)} for pj, i in zip(p.tolist(), idx.tolist())]
        return topk_items, probabilities


def _build_probabilities(probabilities: Dict[str, float]) -> Dict[str, float]:
    return {
        "normal": float(probabilities.get("normal", 0.0)),
        "benign": float(probabilities.get("benign", 0.0)),
        "malignant": float(probabilities.get("malignant", 0.0)),
    }


def _cleanup_visualizations() -> None:
    if not VISUALIZATION_DIR.exists():
        return
    now = time.time()
    max_age_seconds = max(VISUALIZATION_MAX_AGE_HOURS, 0) * 3600
    files = []
    for entry in VISUALIZATION_DIR.iterdir():
        if not entry.is_file():
            continue
        try:
            mtime = entry.stat().st_mtime
        except OSError:
            continue
        files.append((entry, mtime))

    if max_age_seconds > 0:
        for entry, mtime in files:
            if now - mtime > max_age_seconds:
                try:
                    entry.unlink()
                except OSError:
                    pass

    if VISUALIZATION_MAX_FILES > 0:
        files = []
        for entry in VISUALIZATION_DIR.iterdir():
            if entry.is_file():
                try:
                    files.append((entry, entry.stat().st_mtime))
                except OSError:
                    continue
        files.sort(key=lambda item: item[1], reverse=True)
        for entry, _ in files[VISUALIZATION_MAX_FILES:]:
            try:
                entry.unlink()
            except OSError:
                pass


def _reset_metrics_if_needed(current: datetime) -> None:
    if metrics_state["date"] != current.date():
        metrics_state["date"] = current.date()
        metrics_state["today"] = 0
        metrics_state["confidence_sum_today"] = 0.0
        metrics_state["confidence_count_today"] = 0


def _record_prediction(topk: List[PredictionItem], filename: Optional[str], when: datetime) -> None:
    if not topk:
        return

    top = topk[0]
    history_records.appendleft({
        "id": when.strftime("%Y%m%d%H%M%S%f"),
        "title": filename or "医学影像诊断",
        "subtitle": f"预测结果：{top['label']}",
        "prob": round(top["prob"] * 100, 1),
        "level": top["label"],
        "time": when.strftime("%Y-%m-%d %H:%M:%S"),
        "topk": topk,
    })

    _reset_metrics_if_needed(when)
    metrics_state["total"] += 1
    metrics_state["today"] += 1
    metrics_state["confidence_sum_today"] += top["prob"]
    metrics_state["confidence_count_today"] += 1

# ===== 3) 上传图片并进行推理 =====
@app.post("/predict")
async def predict(image: Optional[UploadFile] = File(None), file: Optional[UploadFile] = File(None)):
    if model is None:
        raise HTTPException(status_code=503, detail="????????????")

    upload = image or file
    if upload is None:
        raise HTTPException(status_code=400, detail="Missing image file")

    try:
        img_bytes = await upload.read()
        pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="?????????") from exc

    try:
        topk, probabilities = inference(pil, topk=3)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    now = datetime.now()
    _record_prediction(topk, upload.filename, now)

    gradcam_url = None
    attention_url = None
    if ENABLE_VISUALIZATION:
        _cleanup_visualizations()
        try:
            viz_config = VisualizationConfig(
                return_type=VISUALIZATION_RETURN_TYPE,
                output_dir=str(VISUALIZATION_DIR),
                image_format=VISUALIZATION_FORMAT,
                overlay_alpha=VISUALIZATION_OVERLAY_ALPHA,
                max_size=VISUALIZATION_MAX_SIZE,
            )
            image_tensor = TRANSFORM(pil).unsqueeze(0).to(DEVICE)
            name = f"gradcam_{now.strftime('%Y%m%d%H%M%S%f')}"
            gradcam_artifact = generate_gradcam(
                model,
                image_tensor,
                target_layer=GRADCAM_TARGET_LAYER,
                config=viz_config,
                target_class=None,
                name=name,
            )
            if gradcam_artifact.data_url:
                gradcam_url = gradcam_artifact.data_url
            elif gradcam_artifact.file_path:
                filename = Path(gradcam_artifact.file_path).name
                gradcam_url = f"{VISUALIZATION_PUBLIC_PATH}/{filename}"
        except Exception as exc:
            logger.warning("Visualization generation failed: %s", exc)

    top = topk[0] if topk else {"label": "unknown", "prob": 0.0}
    return JSONResponse(content={
        "classification": top["label"],
        "confidence": float(top["prob"]),
        "probabilities": _build_probabilities(probabilities),
        "gradcam_url": gradcam_url,
        "attention_url": attention_url,
    })


@app.get("/summary")
async def summary():
    _reset_metrics_if_needed(datetime.now())
    avg_conf = 0.0
    if metrics_state["confidence_count_today"]:
        avg_conf = metrics_state["confidence_sum_today"] / metrics_state["confidence_count_today"]

    payload = {
        "today": metrics_state["today"],
        "total": metrics_state["total"],
        "avgConfidence": f"{avg_conf * 100:.1f}%",
    }
    return JSONResponse(content=payload)


@app.get("/history")
async def history():
    # 不包含大型内容时可直接返回；当前包含 topk，前端如需详情可调用 /history/detail
    items: List[Dict[str, Any]] = []
    for it in history_records:
        copy: Dict[str, Any] = dict(it)
        if "topk" in copy:
            copy.pop("topk")
        items.append(copy)
    return JSONResponse(content={"history": items})


@app.get("/history/detail")
async def history_detail(id: Optional[str] = None):
    if not id:
        raise HTTPException(status_code=400, detail="缺少 id")
    for it in history_records:
        if str(it.get("id")) == str(id):
            topk = it.get("topk")
            if not topk:
                raise HTTPException(status_code=404, detail="未找到该记录的详细结果")
            return JSONResponse(content={"id": it.get("id"), "topk": topk})
    raise HTTPException(status_code=404, detail="未找到记录")


@app.post("/auth/wechat")
async def auth_wechat(payload: WeChatAuthRequest):
    if not payload.code:
        raise HTTPException(status_code=400, detail="缺少登录 code")
    if not WECHAT_APPID or not WECHAT_SECRET:
        raise HTTPException(status_code=500, detail="未配置微信小程序凭证")

    params = {
        "appid": WECHAT_APPID,
        "secret": WECHAT_SECRET,
        "js_code": payload.code,
        "grant_type": "authorization_code"
    }

    async with httpx.AsyncClient(timeout=WECHAT_TIMEOUT) as client:
        resp = await client.get(WECHAT_LOGIN_API, params=params)
    data = resp.json()
    errcode = data.get("errcode")
    if errcode:
        detail = data.get("errmsg", "微信接口调用失败")
        raise HTTPException(status_code=400, detail={"errcode": errcode, "errmsg": detail})

    result: WeChatAuthResponse = {
        "openid": data.get("openid", ""),
        "unionid": data.get("unionid", ""),
        "session_key": data.get("session_key", ""),
        "expires_in": data.get("expires_in") or 0
    }
    if not result["openid"]:
        raise HTTPException(status_code=502, detail="微信返回数据异常：缺少 openid")

    return JSONResponse(content=result)


async def get_access_token() -> str:
    if not WECHAT_APPID or not WECHAT_SECRET:
        raise HTTPException(status_code=500, detail="未配置微信小程序凭证")
    now = time.time()
    cached = access_token_cache.get("value")
    expire_at = float(access_token_cache.get("expire_at") or 0)
    if cached and expire_at - now > 60:
        return str(cached)

    params = {
        "grant_type": "client_credential",
        "appid": WECHAT_APPID,
        "secret": WECHAT_SECRET
    }
    async with httpx.AsyncClient(timeout=WECHAT_TIMEOUT) as client:
        resp = await client.get(WECHAT_TOKEN_API, params=params)
    data = resp.json()
    if "access_token" not in data:
        detail = data.get("errmsg") or "获取 access_token 失败"
        errcode = data.get("errcode")
        raise HTTPException(status_code=502, detail={"errcode": errcode, "errmsg": detail})
    token = data["access_token"]
    expires_in = float(data.get("expires_in") or 7200)
    access_token_cache["value"] = token
    access_token_cache["expire_at"] = now + expires_in
    return token


@app.post("/auth/phone")
async def auth_phone(payload: PhoneNumberRequest):
    if not payload.code:
        raise HTTPException(status_code=400, detail="缺少手机号授权 code")
    token = await get_access_token()
    query = {"access_token": token}
    req_body: Dict[str, str] = {"code": payload.code}
    if payload.openid:
        req_body["openid"] = payload.openid

    async with httpx.AsyncClient(timeout=WECHAT_TIMEOUT) as client:
        resp = await client.post(WECHAT_PHONE_API, params=query, json=req_body)
    data = resp.json()
    errcode = data.get("errcode")
    if errcode:
        errmsg = data.get("errmsg", "微信手机号接口失败")
        raise HTTPException(status_code=400, detail={"errcode": errcode, "errmsg": errmsg})

    phone_info = data.get("phone_info") or {}
    if not phone_info.get("phoneNumber") and not phone_info.get("purePhoneNumber"):
        raise HTTPException(status_code=502, detail="微信返回数据异常：缺少手机号信息")

    result: PhoneNumberResponse = {
        "phoneNumber": phone_info.get("phoneNumber", ""),
        "purePhoneNumber": phone_info.get("purePhoneNumber", ""),
        "countryCode": str(phone_info.get("countryCode", ""))
    }
    return JSONResponse(content={"phone_info": result})


@app.get("/auth/wechat/web-qr")
async def auth_wechat_web_qr():
    _clean_expired_sessions()
    _require_wechat_web_config()
    state = secrets.token_urlsafe(16)
    web_login_sessions[state] = {"status": "pending", "created_at": time.time()}
    redirect = urllib.parse.quote_plus(WECHAT_WEB_REDIRECT)
    qr_url = (
        "https://open.weixin.qq.com/connect/qrconnect"
        f"?appid={WECHAT_WEB_APPID}&redirect_uri={redirect}&response_type=code"
        f"&scope={WECHAT_WEB_SCOPE}&state={state}#wechat_redirect"
    )
    return JSONResponse(content={"state": state, "qr_url": qr_url, "expires_in": WEB_LOGIN_EXPIRES})


@app.get("/auth/wechat/web-callback")
async def auth_wechat_web_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    _clean_expired_sessions()
    if not state or state not in web_login_sessions:
        return HTMLResponse(
            "<html><body><p>登录状态无效或已过期，请重新扫码。</p><script>setTimeout(()=>window.close(),2000);</script></body></html>",
            status_code=400
        )

    session = web_login_sessions[state]

    if error:
        session.update({
            "status": "error",
            "message": error_description or error,
            "created_at": time.time()
        })
        return HTMLResponse(
            "<html><body><p>登录已取消或失败，请返回页面重试。</p><script>setTimeout(()=>window.close(),1500);</script></body></html>",
            status_code=400
        )

    if not code:
        session.update({
            "status": "error",
            "message": "缺少授权 code",
            "created_at": time.time()
        })
        return HTMLResponse(
            "<html><body><p>缺少授权信息，请返回重新扫码。</p><script>setTimeout(()=>window.close(),1500);</script></body></html>",
            status_code=400
        )

    _require_wechat_web_config()

    token_params = {
        "appid": WECHAT_WEB_APPID,
        "secret": WECHAT_WEB_SECRET,
        "code": code,
        "grant_type": "authorization_code"
    }

    try:
        async with httpx.AsyncClient(timeout=WECHAT_TIMEOUT) as client:
            token_resp = await client.get("https://api.weixin.qq.com/sns/oauth2/access_token", params=token_params)
        token_data = token_resp.json()
    except httpx.HTTPError as exc:
        session.update({
            "status": "error",
            "message": f"请求微信接口失败: {exc}",
            "created_at": time.time()
        })
        return HTMLResponse(
            "<html><body><p>网络异常，请返回重试。</p><script>setTimeout(()=>window.close(),1500);</script></body></html>",
            status_code=502
        )

    if token_data.get("errcode"):
        session.update({
            "status": "error",
            "message": token_data.get("errmsg", "微信认证失败"),
            "created_at": time.time()
        })
        return HTMLResponse(
            "<html><body><p>微信认证失败，请返回重试。</p><script>setTimeout(()=>window.close(),1500);</script></body></html>",
            status_code=400
        )

    access_token = token_data.get("access_token")
    openid = token_data.get("openid")
    if not access_token or not openid:
        session.update({
            "status": "error",
            "message": "微信返回数据异常",
            "created_at": time.time()
        })
        return HTMLResponse(
            "<html><body><p>微信返回数据异常，请返回重试。</p><script>setTimeout(()=>window.close(),1500);</script></body></html>",
            status_code=502
        )

    async with httpx.AsyncClient(timeout=WECHAT_TIMEOUT) as client:
        userinfo_resp = await client.get(
            "https://api.weixin.qq.com/sns/userinfo",
            params={"access_token": access_token, "openid": openid}
        )
    userinfo = userinfo_resp.json()
    if userinfo.get("errcode"):
        session.update({
            "status": "error",
            "message": userinfo.get("errmsg", "读取用户信息失败"),
            "created_at": time.time()
        })
        return HTMLResponse(
            "<html><body><p>读取用户信息失败，请返回重试。</p><script>setTimeout(()=>window.close(),1500);</script></body></html>",
            status_code=400
        )

    session.update({
        "status": "success",
        "created_at": time.time(),
        "user": {
            "id": f"wechat-web-{openid}",
            "openid": openid,
            "unionid": userinfo.get("unionid", ""),
            "nickname": userinfo.get("nickname", "微信用户"),
            "avatar": userinfo.get("headimgurl", ""),
            "gender": userinfo.get("sex"),
            "province": userinfo.get("province"),
            "city": userinfo.get("city"),
            "country": userinfo.get("country")
        }
    })

    return HTMLResponse(
        "<html><body><p>扫码成功，请返回网页继续。</p><script>setTimeout(()=>window.close(),1500);</script></body></html>")


@app.get("/auth/wechat/web-result")
async def auth_wechat_web_result(state: Optional[str] = None):
    if not state:
      return JSONResponse(content={"status": "invalid"}, status_code=400)
    _clean_expired_sessions()
    session = web_login_sessions.get(state)
    if not session:
        return JSONResponse(content={"status": "not_found"})

    status = session.get("status", "pending")
    if status in {"pending"}:
        return JSONResponse(content={"status": "pending"})

    web_login_sessions.pop(state, None)

    if status == "success":
        return JSONResponse(content={"status": "success", "user": session.get("user", {})})

    return JSONResponse(content={"status": "error", "message": session.get("message", "登录失败")})


@app.post("/report/generate")
async def generate_report(payload: ReportRequest):
    if not payload.topk:
        raise HTTPException(status_code=400, detail="缺少分析结果 topk")

    api_base = (payload.provider and payload.provider.api_base) or LLM_API_BASE
    api_key = (payload.provider and payload.provider.api_key) or LLM_API_KEY
    model = (payload.provider and payload.provider.model) or LLM_MODEL
    if not (api_base and api_key and model):
        raise HTTPException(status_code=400, detail="未配置大模型服务（api_base/api_key/model）")

    sys_prompt = LLM_PROMPT_SYSTEM
    user_content = {
        "ai_topk": payload.topk,
        "meta": payload.meta or {},
        "class_explanations": CLASS_EXPLANATIONS,
        "notes": {
            "label_space": CLASS_NAMES,
            "interpretation_hint": "标签取值限定为 normal/benign/malignant；概率为 softmax 输出，非校准值，仅作相对参考。"
        }
    }

    # 规范化 API Base，避免用户填写携带 /v1 或尾随斜杠造成重复路径
    base = (api_base or "").strip()
    # 去掉末尾的 /v1 或 /v1/（OpenAI 兼容接口会在后面拼接 /v1/...）
    base = re.sub(r"/v1/*$", "", base)
    url = base.rstrip("/") + "/v1/chat/completions"
    req = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": (
                "请基于如下 JSON 生成规范化报告：\n" +
                json.dumps(user_content, ensure_ascii=False)
            )},
        ],
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            resp = await client.post(url, json=req, headers=headers)
        # 尝试解析 JSON；若上游返回非 JSON（如 HTML/纯文本），优雅回退
        data: Any = None
        try:
            data = resp.json()
        except Exception:
            data = None
    except httpx.HTTPError as exc:
        # 提供更详细的错误信息（包含异常类型）
        raise HTTPException(status_code=502, detail=f"请求大模型失败: {exc!r}") from exc

    if resp.status_code >= 400:
        # 透传上游 JSON 错误；若为非 JSON，则附带状态码与响应文本片段
        if isinstance(data, (dict, list)):
            raise HTTPException(status_code=resp.status_code, detail=data)
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "error": "upstream_error",
                "status_code": resp.status_code,
                "url": url,
                "text": (resp.text[:2000] if getattr(resp, "text", None) else "")
            }
        )

    choices = data.get("choices") or []
    content = ""
    if choices:
        msg = (choices[0] or {}).get("message") or {}
        content = msg.get("content") or ""
    if not content:
        content = data.get("text") or ""
    if not content:
        raise HTTPException(status_code=502, detail="大模型未返回内容")

    now = datetime.now()
    rid = now.strftime("%Y%m%d%H%M%S%f")
    record = {
        "id": rid,
        "time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "report": content,
        "fromHistoryId": (payload.meta or {}).get("historyId") if payload.meta else None,
    }
    generated_reports.appendleft(record)

    return JSONResponse(content={"id": rid, "report": content})


@app.get("/reports")
async def list_reports():
    items: List[Dict[str, Any]] = []
    for it in generated_reports:
        items.append({
            "id": it.get("id"),
            "time": it.get("time"),
            "fromHistoryId": it.get("fromHistoryId"),
            "excerpt": (str(it.get("report"))[:120] + "…") if it.get("report") else ""
        })
    return JSONResponse(content={"reports": items})


@app.delete("/history/{item_id}")
async def delete_history(item_id: str):
    removed = False
    items = list(history_records)
    history_records.clear()
    for it in items:
        if not removed and str(it.get("id")) == str(item_id):
            removed = True
            continue
        history_records.append(it)
    if not removed:
        raise HTTPException(status_code=404, detail="记录不存在")
    return JSONResponse(content={"ok": True})


@app.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    removed = False
    items = list(generated_reports)
    generated_reports.clear()
    for it in items:
        if not removed and str(it.get("id")) == str(report_id):
            removed = True
            continue
        generated_reports.append(it)
    if not removed:
        raise HTTPException(status_code=404, detail="报告不存在")
    return JSONResponse(content={"ok": True})


@app.get("/followup/plans")
async def list_followup_plans(userId: Optional[str] = None):
    if not userId:
        return JSONResponse(content={"plans": []})
    return JSONResponse(content={"plans": list(followup_plans.get(userId, []))})


@app.post("/followup/plan")
async def create_followup_plan(payload: FollowupPlanCreate):
    now = datetime.now()
    pid = now.strftime("%Y%m%d%H%M%S%f")
    plan = {
        "id": pid,
        "userId": payload.userId,
        "title": payload.title,
        "startDate": payload.startDate or now.strftime("%Y-%m-%d"),
        "frequency": payload.frequency,
        "days": payload.days,
        "notes": payload.notes or "",
        "targets": payload.targets or {},
        "createdAt": now.strftime("%Y-%m-%d %H:%M:%S"),
    }
    arr = followup_plans.get(payload.userId) or []
    followup_plans[payload.userId] = [plan] + arr
    return JSONResponse(content={"plan": plan})


@app.delete("/followup/plan/{plan_id}")
async def delete_followup_plan(plan_id: str, userId: Optional[str] = None):
    if not userId or userId not in followup_plans:
        raise HTTPException(status_code=404, detail="未找到计划")
    items = followup_plans[userId]
    next_items = [p for p in items if str(p.get("id")) != str(plan_id)]
    if len(next_items) == len(items):
        raise HTTPException(status_code=404, detail="计划不存在")
    followup_plans[userId] = next_items
    # 同时清理该计划的随访记录
    if userId in followup_checkins:
        followup_checkins[userId] = [c for c in followup_checkins[userId] if str(c.get("planId")) != str(plan_id)]
    return JSONResponse(content={"ok": True})


@app.get("/followup/checkins")
async def list_followup_checkins(userId: Optional[str] = None, planId: Optional[str] = None):
    if not userId:
        return JSONResponse(content={"checkins": []})
    items = list(followup_checkins.get(userId, []))
    if planId:
        items = [c for c in items if str(c.get("planId")) == str(planId)]
    return JSONResponse(content={"checkins": items})


@app.post("/followup/checkin")
async def create_followup_checkin(payload: FollowupCheckinCreate):
    now = datetime.now()
    cid = now.strftime("%Y%m%d%H%M%S%f")
    record = {
        "id": cid,
        "userId": payload.userId,
        "planId": payload.planId,
        "time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "temperature": payload.temperature,
        "weight": payload.weight,
        "symptoms": payload.symptoms or "",
        "medication": payload.medication or "",
        "notes": payload.notes or "",
    }
    arr = followup_checkins.get(payload.userId) or []
    followup_checkins[payload.userId] = [record] + arr
    return JSONResponse(content={"checkin": record})


@app.delete("/followup/checkin/{checkin_id}")
async def delete_followup_checkin(checkin_id: str, userId: Optional[str] = None):
    if not userId or userId not in followup_checkins:
        raise HTTPException(status_code=404, detail="未找到记录")
    items = followup_checkins[userId]
    next_items = [c for c in items if str(c.get("id")) != str(checkin_id)]
    if len(next_items) == len(items):
        raise HTTPException(status_code=404, detail="记录不存在")
    followup_checkins[userId] = next_items
    return JSONResponse(content={"ok": True})
