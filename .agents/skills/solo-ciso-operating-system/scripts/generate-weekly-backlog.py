#!/usr/bin/env python3
"""Generate a weekly markdown backlog from pulse + trend JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def build_markdown(pulse: dict[str, Any], trends: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    lines.append("# Weekly Solo CISO Backlog")
    lines.append("")
    lines.append(f"- Captured at: {pulse.get('capturedAt', 'unknown')}")
    lines.append(f"- Open tasks: {pulse.get('openTasks', 0)}")
    lines.append(f"- Critical tasks: {pulse.get('criticalTasks', 0)}")
    lines.append(f"- Overdue tasks: {pulse.get('overdueTasks', 0)}")
    lines.append(f"- Expiring exceptions (7d): {pulse.get('expiringExceptionsNext7Days', 0)}")
    lines.append("")
    lines.append("## Priority Actions")
    lines.append("")

    action_count = 0
    for trend in trends:
        for action in trend.get("operatorActions", [])[:2]:
            action_count += 1
            lines.append(f"{action_count}. [{trend.get('severity', 'medium').upper()}] {action}")
            lines.append(f"   - Trend: {trend.get('title', 'Unknown trend')}")

    if action_count == 0:
        lines.append("1. No trend actions supplied.")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate weekly solo-ciso backlog markdown.")
    parser.add_argument("--pulse", required=True, help="Path to pulse JSON file.")
    parser.add_argument("--trends", required=True, help="Path to trends JSON file.")
    parser.add_argument("--out", required=True, help="Output markdown file path.")
    args = parser.parse_args()

    pulse = load_json(Path(args.pulse))
    trends_payload = load_json(Path(args.trends))
    trends = trends_payload.get("trends", trends_payload if isinstance(trends_payload, list) else [])
    markdown = build_markdown(pulse, trends)
    Path(args.out).write_text(markdown, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

