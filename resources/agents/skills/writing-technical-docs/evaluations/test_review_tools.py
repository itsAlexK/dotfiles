#!/usr/bin/env python3
"""Regression tests for the deterministic review-workflow tools."""

import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parent.parent
SELECTOR = SKILL_ROOT / "scripts" / "select_review_topic.py"
AGGREGATOR = SKILL_ROOT / "scripts" / "aggregate_review_panel.py"
DIMENSIONS = {
    "decision_clarity": 4,
    "argument_and_flow": 4,
    "evidence_and_correctness": 4,
    "alternatives_and_tradeoffs": 4,
    "document_fit": 4,
    "prose_and_terms": 4,
}
GUIDANCE_SECTION_EXAMPLES = {
    "reference/document-types/one-pager.md": [
        "### Metadata",
        "### Decision and recommendation",
        "### Problem and current state",
        "### Goals, non-goals, and criteria",
        "### Proposed direction",
        "### Alternatives and tradeoffs",
        "### Risks, dependencies, and next step",
    ],
    "reference/document-types/hld-framing.md": [
        "## Metadata and review state",
        "## Executive summary",
        "## Context and current state",
        "## Problem statement",
        "## Scope and non-scope",
        "## Stakeholders and ownership",
        "## Requirements and constraints",
        "### Functional requirements",
        "### Non-functional requirements",
        "## Goals, non-goals, and principles",
        "## Success metrics",
        "## Customer or user experience",
    ],
    "reference/document-types/hld-architecture.md": [
        "## Current architecture",
        "## Proposed architecture overview",
        "## Runtime flows",
        "## Components",
        "## Interfaces and dependencies",
        "## Data architecture",
        "## Infrastructure and deployment",
        "## Alternatives",
    ],
    "reference/document-types/hld-delivery.md": [
        "## Cross-cutting concerns",
        "## Capacity and cost",
        "## Failure and recovery",
        "## Migration and compatibility",
        "## Testing and validation",
        "## Effort and sequencing",
        "## Risks",
        "## Rollout and rollback",
        "## Open questions and review outcome",
        "## Appendices",
    ],
    "reference/document-types/prfaq-sections.md": [
        "## Press release",
        "### Heading",
        "### Subheading",
        "### Date and availability",
        "### Summary",
        "### Problem",
        "### Solution and experience",
        "### Quotes",
        "### Getting started",
        "## External FAQ",
        "## Internal FAQ",
        "### Customer evidence",
        "### Opportunity and differentiation",
        "### Economics",
        "### Scope and experience",
        "### Feasibility and dependencies",
        "### Operations and support",
        "### Measurement and stop conditions",
        "### Resources and timeline",
    ],
    "reference/document-types/lld-contracts.md": [
        "## HLD inheritance and scope",
        "## Module decomposition",
        "## Interface contracts",
        "## Data model and invariants",
        "## Runtime behavior",
        "## Error handling",
        "## Concurrency and timing",
        "## Algorithms",
    ],
    "reference/document-types/lld-delivery.md": [
        "## Quality budgets",
        "## Security, privacy, and data handling",
        "## Observability and operations",
        "## Test methodology",
        "## Migration and compatibility",
        "## Launch and rollback",
        "## Technical debt and limitations",
        "## Work breakdown",
    ],
}


def review(role, verdict="ACCEPT", score_overrides=None, blockers=None):
    scores = dict(DIMENSIONS)
    scores.update(score_overrides or {})
    return {
        "judge_role": role,
        "verdict": verdict,
        "scores": scores,
        "blocking_findings": blockers or [],
        "advisories": [],
        "summary": f"{role} review",
    }


class ReviewToolTests(unittest.TestCase):
    def test_published_guidance_sections_have_principle_and_example(self):
        """Check reference quality only; generated documents choose their own sections."""
        failures = []
        for relative_path, headings in GUIDANCE_SECTION_EXAMPLES.items():
            path = SKILL_ROOT / relative_path
            lines = path.read_text(encoding="utf-8").splitlines()
            for heading in headings:
                try:
                    start = lines.index(heading)
                except ValueError:
                    failures.append(f"{relative_path}: missing {heading}")
                    continue
                level = len(heading) - len(heading.lstrip("#"))
                end = len(lines)
                for index in range(start + 1, len(lines)):
                    match = re.match(r"^(#+) ", lines[index])
                    if match and len(match.group(1)) <= level:
                        end = index
                        break
                section = "\n".join(lines[start:end])
                if "**Principle:**" not in section:
                    failures.append(f"{relative_path}: {heading} missing principle")
                if "**Good example:**" not in section:
                    failures.append(f"{relative_path}: {heading} missing example")
        self.assertEqual(failures, [])

    def test_local_markdown_links_resolve(self):
        markdown_files = [
            SKILL_ROOT / "SKILL.md",
            *sorted((SKILL_ROOT / "reference").rglob("*.md")),
            *sorted((SKILL_ROOT / "agent-sops").rglob("*.md")),
        ]
        failures = []
        link_pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
        for markdown_path in markdown_files:
            text = markdown_path.read_text(encoding="utf-8")
            for target in link_pattern.findall(text):
                if "://" in target or target.startswith("#"):
                    continue
                relative_path = target.split("#", 1)[0]
                resolved = (markdown_path.parent / relative_path).resolve()
                if not resolved.exists():
                    failures.append(f"{markdown_path}: {target}")
        self.assertEqual(failures, [])

    def test_seeded_topic_selection_is_reproducible(self):
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.json"
            second = Path(directory) / "second.json"
            command = [
                sys.executable,
                str(SELECTOR),
                "--document-type",
                "hld",
                "--seed",
                "redis-2026",
            ]
            subprocess.run(command + ["--output", str(first)], check=True)
            subprocess.run(command + ["--output", str(second)], check=True)
            self.assertEqual(
                json.loads(first.read_text(encoding="utf-8"))["id"],
                json.loads(second.read_text(encoding="utf-8"))["id"],
            )

    def test_panel_accepts_unanimous_threshold_reviews(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for role in ("argument", "technical", "document"):
                (root / f"judge-{role}.json").write_text(
                    json.dumps(review(role)),
                    encoding="utf-8",
                )
            output = root / "decision.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(AGGREGATOR),
                    "--reviews-dir",
                    str(root),
                    "--threshold",
                    "4",
                    "--output",
                    str(output),
                    "--style-check-passed",
                ],
                check=False,
            )
            self.assertEqual(result.returncode, 0)
            self.assertEqual(
                json.loads(output.read_text(encoding="utf-8"))["decision"],
                "ACCEPT",
            )

    def test_panel_rejects_low_score_and_failed_style_check(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "judge-argument.json").write_text(
                json.dumps(
                    review(
                        "argument",
                        verdict="REVISE",
                        score_overrides={"argument_and_flow": 3},
                        blockers=[
                            {
                                "location": "Alternatives",
                                "problem": "The status quo is absent.",
                                "required_change": "Compare the status quo.",
                            }
                        ],
                    )
                ),
                encoding="utf-8",
            )
            for role in ("technical", "document"):
                (root / f"judge-{role}.json").write_text(
                    json.dumps(review(role)),
                    encoding="utf-8",
                )
            output = root / "decision.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(AGGREGATOR),
                    "--reviews-dir",
                    str(root),
                    "--output",
                    str(output),
                ],
                check=False,
            )
            decision = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(result.returncode, 1)
            self.assertEqual(decision["decision"], "REVISE")
            self.assertTrue(
                any(item["type"] == "style_check" for item in decision["blocking_findings"])
            )


if __name__ == "__main__":
    unittest.main()
