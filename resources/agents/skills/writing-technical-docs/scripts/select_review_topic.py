#!/usr/bin/env python3
"""Select a reproducible or random technical-document review topic."""

import argparse
import json
import random
import sys
from pathlib import Path


REQUIRED_FIELDS = {
    "id",
    "title",
    "document_type",
    "decision",
    "audience",
    "prompt",
    "constraints",
}
DOCUMENT_TYPES = {"one-pager", "hld", "prfaq", "lld"}


def load_bank(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot load topic bank {path}: {exc}") from exc

    if not isinstance(data, list) or not data:
        raise ValueError("topic bank must be a non-empty JSON array")

    seen = set()
    for index, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"topic {index} must be an object")
        missing = REQUIRED_FIELDS - item.keys()
        if missing:
            raise ValueError(f"topic {index} missing fields: {sorted(missing)}")
        if item["id"] in seen:
            raise ValueError(f"duplicate topic id: {item['id']}")
        if item["document_type"] not in DOCUMENT_TYPES:
            raise ValueError(
                f"topic {item['id']} has invalid document_type "
                f"{item['document_type']!r}"
            )
        if not isinstance(item["constraints"], list) or not item["constraints"]:
            raise ValueError(f"topic {item['id']} constraints must be a non-empty list")
        seen.add(item["id"])
    return data


def main():
    skill_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bank",
        type=Path,
        default=skill_root / "evaluations" / "topic-bank.json",
    )
    parser.add_argument(
        "--document-type",
        choices=["auto", *sorted(DOCUMENT_TYPES)],
        default="auto",
    )
    parser.add_argument("--seed")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    try:
        topics = load_bank(args.bank)
        if args.document_type != "auto":
            topics = [
                item for item in topics
                if item["document_type"] == args.document_type
            ]
        if not topics:
            raise ValueError(
                f"no topics available for document type {args.document_type!r}"
            )

        rng = random.Random(args.seed) if args.seed is not None else random.SystemRandom()
        selected = dict(rng.choice(topics))
        selected["selection"] = {
            "seed": args.seed,
            "bank": str(args.bank.resolve()),
        }

        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(selected, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(f"selected {selected['id']} -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
