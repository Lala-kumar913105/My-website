def translate_text(text: str | None, language: str) -> str | None:
    if not text:
        return text
    if language == "en":
        return text
    return f"[{language}] {text}"