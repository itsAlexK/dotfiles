#!/usr/bin/env python3
"""Validate independent panel reviews and compute the acceptance decision."""

import argparse
import json
import sys
from pathlib import Path


ROLES = {"argument", "technical", "document"}
DIMENSIONS = {
    "decision_clarity",
    "argument_and_flow",
    "evidence_and_correctness",
    "alternatives_and_tradeoffs",
    "document_fit",
    "prose_and_terms",
}


def load_review(path):
    try:
        review = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path}: cannot read valid JSON: {exc}") from exc

    required = {
        "judge_role",
        "verdict",
        "scores",
        "blocking_findings",
        "advisories",
        "summary",
    }
    missing = required - review.keys()
    if missing:
        raise ValueError(f"{path}: missing fields {sorted(missing)}")
    if review["judge_role"] not in ROLES:
        raise ValueError(f"{path}: invalid judge_role {review['judge_role']!r}")
    if review["verdict"] not in {"ACCEPT", "REVISE"}:
        raise ValueError(f"{path}: invalid verdict {review['verdict']!r}")
    if not isinstance(review["scores"], dict):
        raise ValueError(f"{path}: scores must be an object")
    if set(review["scores"]) != DIMENSIONS:
        raise ValueError(
            f"{path}: scores must contain exactly {sorted(DIMENSIONS)}"
        )
    for dimension, score in review["scores"].items():
        if isinstance(score, bool) or not isinstance(score, int) or not 1 <= score <= 5:
            raise ValueError(f"{path}: {dimension} score must be an integer from 1 to 5")
    if not isinstance(review["blocking_findings"], list):
        raise ValueError(f"{path}: blocking_findings must be an array")
    if not isinstance(review["advisories"], list):
        raise ValueError(f"{path}: advisories must be an array")
    if not isinstance(review["summary"], str) or not review["summary"].strip():
        raise ValueError(f"{path}: summary must be a non-empty string")
    for index, finding in enumerate(review["blocking_findings"]):
        if not isinstance(finding, dict):
            raise ValueError(f"{path}: blocking finding {index} must be an object")
        required_finding_fields = {"location", "problem", "required_change"}
        missing_finding_fields = required_finding_fields - finding.keys()
        if missing_finding_fields:
            raise ValueError(
                f"{path}: blocking finding {index} missing fields "
                f"{sorted(missing_finding_fields)}"
            )
    if review["verdict"] == "ACCEPT" and review["blocking_findings"]:
        raise ValueError(f"{path}: ACCEPT verdict cannot contain blocking findings")
    if review["verdict"] == "REVISE" and not review["blocking_findings"]:
        raise ValueError(f"{path}: REVISE verdict requires a blocking finding")
    return review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reviews-dir", type=Path, required=True)
    parser.add_argument("--threshold", type=int, default=4)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--style-check-passed", action="store_true")
    args = parser.parse_args()

    if not 1 <= args.threshold <= 5:
        print("error: threshold must be from 1 to 5", file=sys.stderr)
        return 2

    try:
        paths = sorted(args.reviews_dir.glob("judge-*.json"))
        reviews = [load_review(path) for path in paths]
        by_role = {review["judge_role"]: review for review in reviews}
        if len(reviews) != len(by_role):
            raise ValueError("duplicate judge roles")
        if set(by_role) != ROLES:
            raise ValueError(
                f"expected roles {sorted(ROLES)}, found {sorted(by_role)}"
            )
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    blockers = []
    judge_summaries = []
    for role in sorted(ROLES):
        review = by_role[role]
        low_scores = {
            dimension: score
            for dimension, score in review["scores"].items()
            if score < args.threshold
        }
        if review["verdict"] != "ACCEPT":
            blockers.append(
                {"judge_role": role, "type": "verdict", "detail": "REVISE"}
            )
        for finding in review["blocking_findings"]:
            blockers.append(
                {"judge_role": role, "type": "finding", "detail": finding}
            )
        for dimension, score in low_scores.items():
            blockers.append(
                {
                    "judge_role": role,
                    "type": "score",
                    "detail": {
                        "dimension": dimension,
                        "score": score,
                        "threshold": args.threshold,
                    },
                }
            )
        judge_summaries.append(
            {
                "judge_role": role,
                "verdict": review["verdict"],
                "scores": review["scores"],
                "summary": review["summary"],
            }
        )

    if not args.style_check_passed:
        blockers.append(
            {
                "judge_role": "deterministic",
                "type": "style_check",
                "detail": "scripts/check_style.py did not pass",
            }
        )

    result = {
        "decision": "ACCEPT" if not blockers else "REVISE",
        "threshold": args.threshold,
        "style_check_passed": args.style_check_passed,
        "judges": judge_summaries,
        "blocking_findings": blockers,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"{result['decision']} -> {args.output}")
    return 0 if result["decision"] == "ACCEPT" else 1


if __name__ == "__main__":
    raise SystemExit(main())
