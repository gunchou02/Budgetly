from functools import lru_cache

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
    receipt_provider: str = "fake"
    report_provider: str = "fake"

    @model_validator(mode="after")
    def reject_development_token_in_production(self) -> Settings:
        if (
            self.environment not in {"local", "test"}
            and self.internal_api_token.get_secret_value() == "local-ai-secret"
        ):
            raise ValueError(
                "The development internal API token cannot be used outside local or test."
            )

        return self


@lru_cache
def get_settings() -> Settings:
    # BaseSettings supplies the required token from the environment at runtime.
    return Settings()  # type: ignore[call-arg]
