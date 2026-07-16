import warnings
from dataclasses import dataclass
from io import BytesIO
from typing import Annotated

from fastapi import Depends, UploadFile
from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError

from app.core.config import Settings, get_settings
from app.core.errors import InvalidReceiptImageError

_FORMAT_MIME_TYPES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


@dataclass(frozen=True, slots=True)
class ProcessedReceiptImage:
    data: bytes
    mime_type: str
    width: int
    height: int


class ReceiptImagePreprocessor:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def process(
        self,
        upload: UploadFile,
        expected_mime_type: str,
    ) -> ProcessedReceiptImage:
        supplied_mime_type = (upload.content_type or "").split(";", 1)[0].lower()
        if supplied_mime_type != expected_mime_type:
            raise InvalidReceiptImageError

        raw_image = await upload.read(self._settings.receipt_max_bytes + 1)
        if not raw_image or len(raw_image) > self._settings.receipt_max_bytes:
            raise InvalidReceiptImageError

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(BytesIO(raw_image)) as source:
                    actual_mime_type = _FORMAT_MIME_TYPES.get(source.format or "")
                    if actual_mime_type != expected_mime_type:
                        raise InvalidReceiptImageError

                    width, height = source.size
                    if width * height > self._settings.receipt_max_pixels:
                        raise InvalidReceiptImageError

                    source.load()
                    normalized = ImageOps.exif_transpose(source)
                    rgb_image = self._to_rgb(normalized)
        except InvalidReceiptImageError:
            raise
        except (
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
            OSError,
            UnidentifiedImageError,
            ValueError,
        ) as exception:
            raise InvalidReceiptImageError from exception

        rgb_image.thumbnail(
            (self._settings.receipt_max_dimension, self._settings.receipt_max_dimension),
            Image.Resampling.LANCZOS,
        )
        rgb_image = ImageOps.autocontrast(rgb_image, cutoff=1)
        rgb_image = rgb_image.filter(
            ImageFilter.UnsharpMask(radius=1.0, percent=110, threshold=3)
        )

        output = BytesIO()
        rgb_image.save(
            output,
            format="JPEG",
            quality=self._settings.receipt_jpeg_quality,
            optimize=True,
        )

        return ProcessedReceiptImage(
            data=output.getvalue(),
            mime_type="image/jpeg",
            width=rgb_image.width,
            height=rgb_image.height,
        )

    @staticmethod
    def _to_rgb(image: Image.Image) -> Image.Image:
        if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
            rgba_image = image.convert("RGBA")
            background = Image.new("RGB", rgba_image.size, "white")
            background.paste(rgba_image, mask=rgba_image.getchannel("A"))
            return background

        return image.convert("RGB")


def get_receipt_image_preprocessor(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ReceiptImagePreprocessor:
    return ReceiptImagePreprocessor(settings)
