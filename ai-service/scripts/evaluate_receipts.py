import argparse
import json
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

FIELDS = ("merchant", "spent_at", "amount", "suggested_category_id")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate receipt extraction without printing OCR text."
    )
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--minimum-accuracy", type=float, default=0.8)
    return parser.parse_args()


def normalized(value: Any) -> Any:
    return value.strip().casefold() if isinstance(value, str) else value


def main() -> int:
    arguments = parse_arguments()
    token = os.environ.get("AI_INTERNAL_API_TOKEN", "")
    if not token:
        raise SystemExit("AI_INTERNAL_API_TOKEN is required.")

    cases = json.loads(arguments.manifest.read_text(encoding="utf-8"))
    matched = {field: 0 for field in FIELDS}
    total = {field: 0 for field in FIELDS}

    with httpx.Client(timeout=30) as client:
        for case in cases:
            image_path = arguments.manifest.parent / case["image"]
            payload = {
                "job_id": str(uuid4()),
                "image_key": f"evaluation/{case['name']}",
                "mime_type": case["mime_type"],
                "language": "ja",
                "category_candidates": case["category_candidates"],
            }
            with image_path.open("rb") as image:
                response = client.post(
                    f"{arguments.base_url.rstrip('/')}/v1/receipts/analyze",
                    headers={"X-Internal-Token": token},
                    data={"payload": json.dumps(payload, ensure_ascii=False)},
                    files={"image": (image_path.name, image, case["mime_type"])},
                )
            response.raise_for_status()
            actual = response.json()
            expected = case["expected"]
            expected_fields = [field for field in FIELDS if field in expected]

            case_matches = 0
            for field in expected_fields:
                total[field] += 1
                if normalized(actual.get(field)) == normalized(expected[field]):
                    matched[field] += 1
                    case_matches += 1

            print(f"{case['name']}: {case_matches}/{len(expected_fields)} fields matched")

    total_fields = sum(total.values())
    total_matches = sum(matched.values())
    accuracy = total_matches / total_fields if total_fields else 0.0
    print(f"overall: {total_matches}/{total_fields} ({accuracy:.1%})")
    for field in FIELDS:
        field_accuracy = matched[field] / total[field] if total[field] else 0.0
        print(f"{field}: {matched[field]}/{total[field]} ({field_accuracy:.1%})")

    return 0 if accuracy >= arguments.minimum_accuracy else 1


if __name__ == "__main__":
    raise SystemExit(main())
