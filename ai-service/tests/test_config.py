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
