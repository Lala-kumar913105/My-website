from app import models


def get_exchange_rate(settings: models.PlatformSettings, currency: str) -> float:
    if currency == "USD":
        return settings.exchange_rate_usd
    if currency == "INR":
        return settings.exchange_rate_inr
    return settings.exchange_rate_inr


def convert_price(amount: float, settings: models.PlatformSettings, currency: str) -> float:
    rate = get_exchange_rate(settings, currency)
    return round(amount / rate, 2) if currency == "USD" else round(amount * rate, 2)