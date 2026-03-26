import os
import requests


FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"
WHATSAPP_URL = "https://graph.facebook.com/v19.0"


def _send_fast2sms(phone: str, message: str) -> None:
    api_key = os.getenv("FAST2SMS_API_KEY")
    if not api_key:
        return

    payload = {
        "route": "q",
        "message": message,
        "numbers": phone,
    }
    headers = {
        "authorization": api_key,
        "Content-Type": "application/json",
    }
    requests.post(FAST2SMS_URL, json=payload, headers=headers, timeout=10)


def _send_whatsapp(phone: str, message: str) -> None:
    token = os.getenv("WHATSAPP_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_ID")
    if not token or not phone_id:
        return

    url = f"{WHATSAPP_URL}/{phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    requests.post(url, json=payload, headers=headers, timeout=10)


def send_order_notification(user_phone: str, message: str) -> None:
    """Send SMS + WhatsApp order notifications. Fail silently if providers error."""
    if not user_phone:
        return
    try:
        _send_fast2sms(user_phone, message)
    except Exception:
        pass

    try:
        _send_whatsapp(user_phone, message)
    except Exception:
        pass