from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "E-commerce API"
    PROJECT_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "sqlite:///./ecommerce.db"

    # Frontend / CORS
    FRONTEND_URL: str = "https://www.zivolf.com"
    CORS_ORIGINS: str = "https://www.zivolf.com,https://zivolf.com,http://localhost:3000"

    # JWT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # Rate limiting
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 120
    RATE_LIMIT_AUTH_MAX_REQUESTS: int = 20

    # OpenRouter / LLM
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "deepseek/deepseek-v3.2-exp"
    OPENROUTER_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    OPENROUTER_HTTP_REFERER: str = "http://localhost:3000"
    OPENROUTER_APP_TITLE: str = "Zivolf AI Assistant"
    OPENROUTER_TIMEOUT_SECONDS: int = 30

    # Cloudinary (avatar/profile uploads)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_nested_delimiter="__",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        required_origins = [
            "https://www.zivolf.com",
            "https://zivolf.com",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

        if not self.CORS_ORIGINS.strip():
            frontend = self.FRONTEND_URL.strip()
            origins = [frontend] if frontend else []
            for required_origin in required_origins:
                if required_origin not in origins:
                    origins.append(required_origin)
            return origins

        sanitized = self.CORS_ORIGINS.strip()

        if sanitized.startswith("[") and sanitized.endswith("]"):
            sanitized = sanitized[1:-1]

        origins = [
            origin.strip().strip('"').strip("'")
            for origin in sanitized.split(",")
            if origin.strip()
        ]

        frontend = self.FRONTEND_URL.strip()
        if frontend and frontend not in origins:
            origins.append(frontend)

        for required_origin in required_origins:
            if required_origin not in origins:
                origins.append(required_origin)

        return origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()