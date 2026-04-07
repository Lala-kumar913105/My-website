from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "E-commerce API"
    PROJECT_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./ecommerce.db"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # CORS settings (comma-separated string in .env)
    CORS_ORIGINS: str = ""
    
    # JWT settings
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # Rate limiting (requests per window)
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 120
    RATE_LIMIT_AUTH_MAX_REQUESTS: int = 20
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_nested_delimiter="__",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return [self.FRONTEND_URL]
        sanitized = self.CORS_ORIGINS.strip()
        if sanitized.startswith("[") and sanitized.endswith("]"):
            sanitized = sanitized.strip("[]")
        origins = [origin.strip().strip("\"") for origin in sanitized.split(",") if origin.strip()]
        if self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

settings = Settings()