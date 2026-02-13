from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://act_user:act_secure_pass_2024@postgres:5432/act_db"
    REDIS_URL: str = "redis://redis:6379"
    SECRET_KEY: str = "change_this_in_production"
    ENVIRONMENT: str = "development"

    # Email alerts
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    ALERT_EMAIL_FROM: str = "alerts@act-system.local"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
