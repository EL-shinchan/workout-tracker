#!/usr/bin/env python3
"""Import new media from the macOS Photos album "Iron Log" into the Iron Log queue.

This script is intentionally conservative:
- reads only album named Iron Log by default
- never deletes/edits Photos items
- copies/exported media into local ignored data folders
- tracks seen Photos IDs to avoid duplicate queue jobs
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from secrets import token_hex

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
QUEUE_ROOT = DATA_DIR / "photo-drafts"
UPLOAD_DIR = QUEUE_ROOT / "uploads"
JOB_DIR = QUEUE_ROOT / "jobs"
IMPORT_DIR = DATA_DIR / "icloud-import"
EXPORT_DIR = IMPORT_DIR / "exports"
SEEN_PATH = IMPORT_DIR / "seen.json"
DEFAULT_ALBUM = "Iron Log"


def ensure_dirs() -> None:
    for directory in (UPLOAD_DIR, JOB_DIR, EXPORT_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def run_osascript(script: str, timeout: int = 45) -> str:
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(
            "Photos did not respond. Open Photos on the Mac mini and approve automation/Photos access if prompted."
        ) from exc

    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "Photos AppleScript failed.").strip()
        raise RuntimeError(detail)

    return result.stdout.strip()


def apple_quote(value: str) -> str:
    return value.replace('\\', '\\\\').replace('"', '\\"')



def photos_library_path() -> Path:
    return Path.home() / "Pictures" / "Photos Library.photoslibrary"


def sqlite_album_items(album: str) -> list[dict[str, str]]:
    """Fallback for shared albums that Photos AppleScript does not expose as albums."""
    library = photos_library_path()
    db_path = library / "database" / "Photos.sqlite"
    if not db_path.exists():
        return []

    query = """
      SELECT
        asset.ZUUID,
        asset.ZFILENAME,
        asset.ZDIRECTORY,
        asset.ZUNIFORMTYPEIDENTIFIER
      FROM ZASSET asset
      JOIN Z_29ASSETS joiner ON joiner.Z_3ASSETS = asset.Z_PK
      JOIN ZGENERICALBUM album ON album.Z_PK = joiner.Z_29ALBUMS
      WHERE album.ZTITLE = ?
      ORDER BY asset.ZADDEDDATE ASC, asset.ZDATECREATED ASC
    """
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(query, (album,)).fetchall()

    items = []
    for uuid, filename, directory, uti in rows:
        filename = filename or f"{uuid}"
        candidates = []
        if directory:
            candidates.extend([
                library / "originals" / directory / filename,
                library / "resources" / "derivatives" / directory / filename,
                library / "scopes" / "cloudsharing" / "data" / directory / filename,
            ])
        candidates.extend(library.glob(f"**/{uuid}*"))
        is_video = "video" in (uti or "").lower() or filename.lower().endswith((".mov", ".mp4", ".m4v"))
        if is_video:
            local_path = next((path for path in candidates if path.is_file() and path.suffix.lower() in {".mov", ".mp4", ".m4v"}), None)
        else:
            local_path = next((path for path in candidates if path.is_file() and not path.name.endswith(".plist") and "poster" not in path.name.lower()), None)
        poster_path = next((path for path in candidates if path.is_file() and "poster" in path.name.lower()), None)
        items.append({
            "id": uuid,
            "filename": filename,
            "uti": uti or "",
            "localPath": str(local_path) if local_path else "",
            "posterPath": str(poster_path) if poster_path else "",
        })
    return items

def load_seen() -> set[str]:
    if not SEEN_PATH.exists():
        return set()
    try:
        data = json.loads(SEEN_PATH.read_text())
    except json.JSONDecodeError:
        return set()
    return set(data.get("seenPhotoIds", []))


def save_seen(seen: set[str]) -> None:
    IMPORT_DIR.mkdir(parents=True, exist_ok=True)
    SEEN_PATH.write_text(json.dumps({"seenPhotoIds": sorted(seen)}, indent=2) + "\n")


def list_album_items(album: str) -> list[dict[str, str]]:
    script = f'''
set albumName to "{apple_quote(album)}"
tell application "Photos"
  set targetAlbum to missing value
  repeat with candidateAlbum in albums
    if name of candidateAlbum is albumName then
      set targetAlbum to candidateAlbum
      exit repeat
    end if
  end repeat
  if targetAlbum is missing value then error "Album not found: " & albumName
  set outputLines to {{}}
  repeat with mediaItem in media items of targetAlbum
    set itemId to id of mediaItem as text
    set itemName to filename of mediaItem as text
    set end of outputLines to itemId & tab & itemName
  end repeat
  set AppleScript's text item delimiters to linefeed
  return outputLines as text
end tell
'''
    try:
        output = run_osascript(script)
    except RuntimeError as error:
        if "Album not found" in str(error):
            return sqlite_album_items(album)
        raise
    items = []
    for line in output.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t", 1)
        item_id = parts[0].strip()
        filename = parts[1].strip() if len(parts) > 1 else f"photos-{item_id}"
        if item_id:
            items.append({"id": item_id, "filename": filename})
    return items


def export_item(album: str, item_id: str, export_dir: Path) -> list[Path]:
    export_dir.mkdir(parents=True, exist_ok=True)
    before = {path.name for path in export_dir.iterdir()} if export_dir.exists() else set()
    script = f'''
set albumName to "{apple_quote(album)}"
set targetId to "{apple_quote(item_id)}"
set exportFolder to POSIX file "{apple_quote(str(export_dir))}"
tell application "Photos"
  set targetAlbum to missing value
  repeat with candidateAlbum in albums
    if name of candidateAlbum is albumName then
      set targetAlbum to candidateAlbum
      exit repeat
    end if
  end repeat
  if targetAlbum is missing value then error "Album not found: " & albumName
  set targetItems to {{}}
  repeat with mediaItem in media items of targetAlbum
    if (id of mediaItem as text) is targetId then
      set end of targetItems to mediaItem
      exit repeat
    end if
  end repeat
  if (count of targetItems) is 0 then error "Media item not found: " & targetId
  export targetItems to exportFolder with using originals
end tell
'''
    run_osascript(script, timeout=120)
    after = list(export_dir.iterdir())
    new_files = [path for path in after if path.name not in before and path.is_file()]
    if not new_files:
        # Photos may overwrite or reuse original names. Fall back to most recent file.
        files = [path for path in after if path.is_file()]
        if files:
            new_files = [max(files, key=lambda path: path.stat().st_mtime)]
    return new_files


def media_type_for(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    if mime and mime.startswith("video/"):
        return "video"
    return "image"


def safe_suffix(path: Path) -> str:
    suffix = path.suffix.lower()
    return suffix if re.fullmatch(r"\.[a-z0-9]{1,8}", suffix) else ".jpg"


def create_queue_job(source_path: Path, original_name: str, photo_id: str, album: str) -> dict:
    job_id = f"{datetime.now(timezone.utc).isoformat().replace(':', '-').replace('.', '-')}-{token_hex(4)}"
    media_type = media_type_for(source_path)
    target_path = UPLOAD_DIR / f"{job_id}{safe_suffix(source_path)}"
    shutil.copy2(source_path, target_path)

    job = {
        "id": job_id,
        "status": "pending",
        "mediaType": media_type,
        "source": "icloud-photos",
        "sourceAlbum": album,
        "sourcePhotoId": photo_id,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "originalName": original_name or source_path.name,
        "mimeType": mimetypes.guess_type(target_path.name)[0] or "application/octet-stream",
        "imagePath": str(target_path) if media_type == "image" else None,
        "videoPath": str(target_path) if media_type == "video" else None,
        "clarification": {
            "quickNote": "",
            "exercise": "",
            "weight": "",
            "reps": "",
            "setNumber": "",
            "bodyWeight": "",
        },
        "draft": None,
        "error": None,
        "processedAt": None,
    }
    (JOB_DIR / f"{job_id}.json").write_text(json.dumps(job, indent=2) + "\n")
    return job


def import_album(album: str, limit: int) -> list[dict]:
    ensure_dirs()
    seen = load_seen()
    imported = []
    items = list_album_items(album)

    for item in items:
        if len(imported) >= limit:
            break
        if item["id"] in seen:
            continue

        if item.get("localPath"):
            exported_files = [Path(item["localPath"])]
        elif item.get("uti", "").lower().startswith("public.mpeg") or "video" in item.get("uti", "").lower() or item.get("filename", "").lower().endswith((".mov", ".mp4", ".m4v")):
            print(json.dumps({"warning": "Video original is not downloaded locally yet", "id": item["id"], "filename": item.get("filename")}), file=sys.stderr)
            continue
        else:
            item_export_dir = EXPORT_DIR / re.sub(r"[^A-Za-z0-9_.-]", "_", item["id"])
            exported_files = export_item(album, item["id"], item_export_dir)
        if not exported_files:
            continue

        for exported_file in exported_files[:1]:
            job = create_queue_job(exported_file, item["filename"], item["id"], album)
            imported.append(job)

        seen.add(item["id"])
        save_seen(seen)

    return imported


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--album", default=DEFAULT_ALBUM)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    try:
        imported = import_album(args.album, args.limit)
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}))
        return 1

    print(json.dumps({"ok": True, "imported": len(imported), "jobs": [{"id": job["id"], "mediaType": job["mediaType"], "originalName": job["originalName"]} for job in imported]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
