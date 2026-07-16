import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings


def test_internal_token_must_not_be_empty_or_short() -> None:
    with pytest.raises(ValidationError):
        Settings(internal_api_token=SecretStr("short"))


def test_development_token_is_rejected_in_production() -> None:
    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            internal_api_token=SecretStr("local-ai-secret"),
        )


def test_openai_provider_requires_api_key() -> None:
    with pytest.raises(ValidationError):
        Settings(
            internal_api_token=SecretStr("test-internal-token"),
            receipt_provider="openai",
        )

    with pytest.raises(ValidationError):
        Settings(
            internal_api_token=SecretStr("test-internal-token"),
            receipt_provider="openai",
            openai_api_key=SecretStr("   "),
        )


def test_openai_provider_accepts_api_key_from_secret_setting() -> None:
    settings = Settings(
        internal_api_token=SecretStr("test-internal-token"),
        report_provider="openai",
        openai_api_key=SecretStr("test-openai-key"),
    )

    assert settings.report_provider == "openai"
    assert settings.openai_api_key is not None
