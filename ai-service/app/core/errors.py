import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class ServiceError(RuntimeError):
    status_code = 500
    code = "service_error"
    public_message = "The request could not be completed."


class InvalidReceiptImageError(ServiceError):
    status_code = 422
    code = "invalid_receipt_image"
    public_message = "The receipt image is invalid or unsupported."


class ReceiptSourceUnavailableError(ServiceError):
    status_code = 503
    code = "receipt_source_unavailable"
    public_message = "The receipt image source is temporarily unavailable."


class ProviderUnavailableError(ServiceError):
    status_code = 503
    code = "provider_unavailable"
    public_message = "The analysis provider is temporarily unavailable."


class ProviderResponseError(ServiceError):
    status_code = 502
    code = "invalid_provider_response"
    public_message = "The analysis provider returned an invalid response."


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _error_body(
    request: Request,
    code: str,
    message: str,
    details: Any | None = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details

    return {"error": error, "request_id": _request_id(request)}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ServiceError)
    async def service_exception_handler(
        request: Request,
        exception: ServiceError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exception.status_code,
            content=_error_body(
                request,
                exception.code,
                exception.public_message,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exception: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=jsonable_encoder(
                _error_body(
                    request,
                    "validation_error",
                    "Request validation failed.",
                    exception.errors(),
                )
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exception: HTTPException,
    ) -> JSONResponse:
        detail = exception.detail
        if isinstance(detail, dict):
            code = str(detail.get("code", "http_error"))
            message = str(detail.get("message", "The request could not be completed."))
            details = detail.get("details")
        else:
            code = "http_error"
            message = str(detail)
            details = None

        return JSONResponse(
            status_code=exception.status_code,
            content=jsonable_encoder(_error_body(request, code, message, details)),
            headers=exception.headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exception: Exception,
    ) -> JSONResponse:
        logger.exception(
            "Unhandled AI service error (request_id=%s)",
            _request_id(request),
            exc_info=exception,
        )
        return JSONResponse(
            status_code=500,
            content=_error_body(
                request,
                "internal_error",
                "An unexpected error occurred.",
            ),
        )
