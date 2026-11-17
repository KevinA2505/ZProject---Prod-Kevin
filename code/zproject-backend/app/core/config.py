from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    databaseUrl: str = Field(alias="DATABASE_URL")
    secretKey: str = Field(alias="SECRET_KEY")
    algorithm: str = "HS256"
    accessTokenMinutes: int = 30
    uploadDir: str = "uploads"
    maxStlMb: int = 50

    # Correo (opcional): si SMTP_HOST está vacío, no se envían correos
    smtpHost: str = Field(default="", alias="SMTP_HOST")
    smtpPort: int = Field(default=587, alias="SMTP_PORT")
    smtpUser: str = Field(default="", alias="SMTP_USER")
    smtpPassword: str = Field(default="", alias="SMTP_PASSWORD")
    smtpFrom: str = Field(default="", alias="SMTP_FROM")

    corsOrigins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://127.0.0.1",
    ]

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()