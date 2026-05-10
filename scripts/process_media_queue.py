#!/usr/bin/env python3
"""Deterministic Iron Log media queue processor.

This handles the reliable path without needing an agent to reason through the
queue. It is intentionally conservative: it processes videos from spoken audio
or typed clarification, and images only when clarification contains enough data.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JOBS_DIR = ROOT / "data" / "photo-drafts" / "jobs"

NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
}

COMMON_EXERCISES = [
    "bench press",
    "squat",
    "deadlift",
    "overhead press",
    "shoulder press",
    "lat pulldown",
    "row",
    "barbell row",
    "dumbbell row",
    "bicep curl",
    "tricep pushdown",
    "leg press",
    "leg extension",
    "leg curl",
    "hip thrust",
    "pull up",
    "push up",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(value) -> str:
    return str(value or "").strip()


def parse_number(value):
    text = clean(value).lower()
    if not text:
        return None
    if text in NUMBER_WORDS:
        return NUMBER_WORDS[text]
    match = re.search(r"\d+(?:\.\d+)?", text)
    if not match:
        return None
    number = float(match.group(0))
    return int(number) if number.is_integer() else number


def title_exercise(name: str) -> str:
    return " ".join(part.capitalize() for part in clean(name).split())


def transcribe_video(video_path: Path) -> str:
    if not shutil.which("ffmpeg") or not shutil.which("whisper"):
        return ""

    with tempfile.TemporaryDirectory(prefix="iron-log-audio-") as tmp:
      tmp_path = Path(tmp)
      wav_path = tmp_path / "audio.wav"
      subprocess.run(
          ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(video_path), "-vn", "-ac", "1", "-ar", "16000", str(wav_path)],
          check=True,
      )
      subprocess.run(
          ["whisper", str(wav_path), "--model", "tiny", "--language", "English", "--output_format", "txt", "--output_dir", str(tmp_path)],
          check=True,
          stdout=subprocess.DEVNULL,
          stderr=subprocess.DEVNULL,
      )
      transcript_path = tmp_path / "audio.txt"
      return transcript_path.read_text(encoding="utf-8").strip() if transcript_path.exists() else ""


def detect_exercise(text: str) -> str | None:
    lower = text.lower()
    for exercise in COMMON_EXERCISES:
        if exercise in lower:
            return title_exercise(exercise)
    return None


def parse_workout_text(text: str) -> dict:
    lower = text.lower().replace("×", "x")
    weight = None
    reps = None
    set_number = None

    weight_matches = list(re.finditer(r"(\d+(?:\.\d+)?)\s*(kg|kilograms?|lb|lbs|pounds?)", lower))
    if weight_matches:
        # Use the last spoken weight. Workout videos often mention setup plates first,
        # then summarize the actual logged set at the end.
        weight = parse_number(weight_matches[-1].group(1))

    reps_match = re.search(r"(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(?:reps?|rep|x)", lower)
    if reps_match:
        reps = parse_number(reps_match.group(1))

    x_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|lb|lbs|pounds?)?\s*x\s*(\d+)", lower)
    if x_match:
        weight = weight if weight is not None else parse_number(x_match.group(1))
        reps = reps if reps is not None else parse_number(x_match.group(2))

    set_match = re.search(r"set\s*(\d+|one|two|three|four|five)", lower)
    if set_match:
        set_number = parse_number(set_match.group(1))

    return {
        "exercise": detect_exercise(lower),
        "weight": weight,
        "reps": reps,
        "setNumber": set_number,
    }


def build_draft(job: dict, transcript: str = "") -> tuple[dict | None, str | None]:
    clarification = job.get("clarification") or {}
    combined_text = " ".join(
        clean(value)
        for value in [
            clarification.get("quickNote"),
            clarification.get("exercise"),
            clarification.get("weight"),
            clarification.get("reps"),
            clarification.get("setNumber"),
            transcript,
        ]
        if clean(value)
    )
    parsed = parse_workout_text(combined_text)

    exercise = clean(clarification.get("exercise")) or parsed["exercise"]
    weight = parse_number(clarification.get("weight"))
    reps = parse_number(clarification.get("reps"))
    set_number = parse_number(clarification.get("setNumber")) or parsed["setNumber"]

    if weight is None:
        weight = parsed["weight"]
    if reps is None:
        reps = parsed["reps"]

    if not exercise or weight is None or reps is None:
        return None, "Not enough workout data found. Say/type exercise, weight, and reps."

    note_bits = []
    if set_number:
        note_bits.append(f"Set {set_number}.")
    if transcript:
        note_bits.append(f"Audio transcript: {transcript}")
    if job.get("mediaType") == "video":
        note_bits.append("Processed deterministically from spoken/typed info; visual rep counting is not used in this cron-safe processor.")

    return {
        "bodyWeight": parse_number(clarification.get("bodyWeight")),
        "bodyWeightUnit": "kg",
        "exercises": [
            {
                "name": title_exercise(exercise),
                "notes": " ".join(note_bits).strip(),
                "sets": [
                    {
                        "weight": weight,
                        "reps": reps,
                        "notes": (f"Set {set_number}. " if set_number else "") + "Review before saving.",
                    }
                ],
            }
        ],
        "notes": "Imported media draft. Review before saving.",
    }, None


def process_job(path: Path) -> dict:
    job = json.loads(path.read_text(encoding="utf-8"))
    if job.get("status") != "pending":
        return {"id": job.get("id"), "status": "skipped"}

    transcript = ""
    try:
        if (job.get("mediaType") == "video" or job.get("videoPath")) and job.get("videoPath"):
            transcript = transcribe_video(Path(job["videoPath"]))

        draft, error = build_draft(job, transcript)
        job["processedAt"] = now_iso()
        if draft:
            job["status"] = "processed"
            job["draft"] = draft
            job["error"] = None
        else:
            job["status"] = "failed"
            job["draft"] = None
            job["error"] = error
    except Exception as exc:  # keep queue moving and surface clear app error
        job["status"] = "failed"
        job["draft"] = None
        job["error"] = str(exc)
        job["processedAt"] = now_iso()

    path.write_text(json.dumps(job, indent=2) + "\n", encoding="utf-8")
    return {"id": job.get("id"), "status": job.get("status"), "error": job.get("error")}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--jobs-dir", default=str(JOBS_DIR))
    args = parser.parse_args()

    jobs_dir = Path(args.jobs_dir)
    jobs_dir.mkdir(parents=True, exist_ok=True)
    results = [process_job(path) for path in sorted(jobs_dir.glob("*.json"))]
    pending_results = [result for result in results if result.get("status") != "skipped"]
    print(json.dumps({"ok": True, "processed": pending_results, "processedCount": len(pending_results)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
