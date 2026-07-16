from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="AI_",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Budgetly AI Service"
    app_version: str = "0.1.0"
    environment: str = "local"
    internal_api_token: SecretStr = Field(min_length=12)
    receipt_provider: Literal["fake", "openai"] = "fake"
    report_provider: Literal["fake", "openai"] = "fake"
    receipt_max_bytes: int = Field(default=5 * 1024 * 1024, ge=1024, le=20 * 1024 * 1024)
    receipt_max_pixels: int = Field(default=40_000_000, ge=1_000_000, le=100_000_000)
    receipt_max_dimension: int = Field(default=2048, ge=512, le=4096)
    receipt_jpeg_quality: int = Field(default=90, ge=75, le=95)
    openai_api_key: SecretStr | None = None
    openai_model: str = Field(default="gpt-4o-mini", min_length=1, max_length=100)
    openai_timeout_seconds: float = Field(default=20.0, ge=1, le=120)
    openai_max_retries: int = Field(default=0, ge=0, le=2)

    @model_validator(mode="after")
    def validate_runtime_secrets(self) -> Settings:
        if (
            self.environment not in {"local", "test"}
            and self.internal_api_token.get_secret_value() == "local-ai-secret"
        ):
            raise ValueError(
                "The development internal API token cannot be used outside local or test."
            )

        openai_api_key = (
            self.openai_api_key.get_secret_value().strip()
            if self.openai_api_key is not None
            else ""
        )
        if "openai" in {self.receipt_provider, self.report_provider} and not openai_api_key:
            raise ValueError("AI_OPENAI_API_KEY is required when an OpenAI provider is enabled.")

        return self


@lru_cache
def get_settings() -> Settings:
    # BaseSettings supplies the required token from the environment at runtime.
    return Settings()  # type: ignore[call-arg]
