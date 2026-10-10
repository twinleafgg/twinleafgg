#!/usr/bin/env python3
"""Dump PTCGO gameplay AnimationClip / particle name catalog from resources.assets."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import UnityPy
from UnityPy.enums import ClassIDType

PTCGO_DATA = Path(
    "/Applications/Pokemon Trading Card Game Online.app/Contents/Resources/Data"
)
ASSETS = PTCGO_DATA / "resources.assets"
OUT_DIR = Path(__file__).resolve().parent / "out"

# In-game focus: KO, evolution, hit reactions, particle-ish names (skip menu/UI chrome).
NAME_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"knock.?out",
        r"knockout",
        r"evolut",
        r"deevolut|devolution",
        r"getHit",
        r"cardPathAnimations",
        r"Particle",
        r"Glitter",
        r"orbs?",
        r"Warp",
        r"Explosion",
        r"AnimationLookup",
        r"CardZoomEvolution",
        r"AttachEnergy",
    )
]

SKIP_PATTERNS = [
    re.compile(p, re.I)
    for p in (
        r"^UI",
        r"Button",
        r"Menu",
        r"Hover",
        r"Tooltip",
        r"Lobby",
        r"Shop",
        r"CheckmarkLanding",  # UI confirm FX
    )
]


def name_matches(name: str) -> bool:
    if not name:
        return False
    if any(p.search(name) for p in SKIP_PATTERNS):
        return False
    return any(p.search(name) for p in NAME_PATTERNS)


def curve_summary(clip) -> dict:
    """Best-effort summary of AnimationClip curves across UnityPy versions."""
    summary: dict = {
        "duration": None,
        "legacy": None,
        "floatCurveCount": 0,
        "pptrCurveCount": 0,
        "sampleBindings": [],
    }
    try:
        summary["duration"] = float(getattr(clip, "m_MuscleClip", None) and 0)
    except Exception:
        pass

    for attr in ("m_Duration", "duration", "length"):
        if hasattr(clip, attr):
            try:
                summary["duration"] = float(getattr(clip, attr))
                break
            except Exception:
                pass

    # UnityPy AnimationClip often exposes m_MuscleClip.m_StopTime for duration
    muscle = getattr(clip, "m_MuscleClip", None)
    if muscle is not None:
        for attr in ("m_StopTime", "m_StartTime", "duration"):
            if hasattr(muscle, attr) and summary["duration"] in (None, 0):
                try:
                    val = float(getattr(muscle, attr))
                    if attr == "m_StopTime" and val > 0:
                        summary["duration"] = val
                except Exception:
                    pass

    if hasattr(clip, "m_Legacy"):
        summary["legacy"] = bool(clip.m_Legacy)

    float_curves = getattr(clip, "m_FloatCurves", None) or getattr(clip, "m_FloatCurve", None) or []
    try:
        summary["floatCurveCount"] = len(float_curves)
    except TypeError:
        summary["floatCurveCount"] = 0

    pptr_curves = getattr(clip, "m_PPtrCurves", None) or []
    try:
        summary["pptrCurveCount"] = len(pptr_curves)
    except TypeError:
        pass

    bindings = []
    for curve in list(float_curves)[:24]:
        path = getattr(curve, "path", None) or getattr(curve, "attribute", None) or ""
        attr = getattr(curve, "attribute", "") or ""
        curve_data = getattr(curve, "curve", None)
        keys = []
        if curve_data is not None:
            keyframes = getattr(curve_data, "m_Curve", None) or getattr(curve_data, "keys", None) or []
            for kf in list(keyframes)[:8]:
                try:
                    keys.append(
                        {
                            "t": float(getattr(kf, "time", getattr(kf, "m_Time", 0))),
                            "v": float(getattr(kf, "value", getattr(kf, "m_Value", 0))),
                        }
                    )
                except Exception:
                    continue
        bindings.append({"path": str(path), "attribute": str(attr), "keys": keys})
    summary["sampleBindings"] = bindings
    return summary


def categorize(name: str) -> str:
    n = name.lower()
    if "knock" in n:
        return "knockout"
    if "evolut" in n or "deevolut" in n or "devolution" in n:
        return "evolution"
    if "gethit" in n:
        return "getHit"
    if "particle" in n or "glitter" in n or "orb" in n or "warp" in n or "explosion" in n:
        return "particle"
    if "cardpath" in n or "attachenergy" in n:
        return "cardPath"
    return "other"


def main() -> int:
    if not ASSETS.is_file():
        print(f"Missing assets: {ASSETS}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Loading {ASSETS} …")
    env = UnityPy.load(str(ASSETS))

    clips: list[dict] = []
    particles: list[dict] = []
    other: list[dict] = []

    for obj in env.objects:
        try:
            typ = obj.type
        except Exception:
            continue

        type_name = typ.name if hasattr(typ, "name") else str(typ)
        try:
            data = obj.read()
        except Exception:
            continue

        name = getattr(data, "m_Name", None) or getattr(data, "name", None) or ""
        if not name_matches(str(name)):
            continue

        entry = {
            "name": str(name),
            "type": type_name,
            "pathId": getattr(obj, "path_id", None),
            "category": categorize(str(name)),
        }

        if typ == ClassIDType.AnimationClip or type_name == "AnimationClip":
            entry["clip"] = curve_summary(data)
            clips.append(entry)
        elif "Particle" in type_name or "particle" in str(name).lower():
            # ParticleSystem / GameObject names — store lightweight metadata
            entry["meta"] = {
                "hasDuration": hasattr(data, "length") or hasattr(data, "duration"),
            }
            particles.append(entry)
        else:
            other.append(entry)

    clips.sort(key=lambda e: e["name"].lower())
    particles.sort(key=lambda e: e["name"].lower())
    other.sort(key=lambda e: e["name"].lower())

    catalog = {
        "source": str(ASSETS),
        "unityHint": "2018.4.11f1",
        "clipCount": len(clips),
        "particleCount": len(particles),
        "otherCount": len(other),
        "clips": clips,
        "particles": particles,
        "other": other,
    }

    catalog_path = OUT_DIR / "gameplay_anims_catalog.json"
    catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")

    # Timing table for remake
    ko_clips = [c for c in clips if c["category"] == "knockout"]
    evo_clips = [c for c in clips if c["category"] == "evolution"]
    hit_clips = [c for c in clips if c["category"] == "getHit"]

    def fmt_clip(c: dict) -> str:
        dur = (c.get("clip") or {}).get("duration")
        ncurves = (c.get("clip") or {}).get("floatCurveCount")
        return f"| `{c['name']}` | {dur if dur is not None else '—'} | {ncurves} |"

    lines = [
        "# PTCGO gameplay anim timing (extracted)",
        "",
        f"Source: `{ASSETS}`",
        "",
        "## Knock Out clips",
        "",
        "| Name | Duration (s) | Float curves |",
        "|------|-------------:|-------------:|",
        *[fmt_clip(c) for c in ko_clips],
        "",
        "## Evolution clips",
        "",
        "| Name | Duration (s) | Float curves |",
        "|------|-------------:|-------------:|",
        *[fmt_clip(c) for c in evo_clips],
        "",
        "## Get-hit clips",
        "",
        "| Name | Duration (s) | Float curves |",
        "|------|-------------:|-------------:|",
        *[fmt_clip(c) for c in hit_clips],
        "",
        "## Twinleaf remake targets (initial)",
        "",
        "| Twinleaf | Current | PTCGO-inspired target |",
        "|----------|--------:|----------------------:|",
        "| KO discard travel | 0.48s | ~0.55–0.70s arc + warp burst |",
        "| Evolution total | 1.50s | Match extracted evo clip duration |",
        "| Attack hit VFX | none (React) | Type-tinted particle burst ~1.2s |",
        "",
    ]
    (OUT_DIR / "timing_table.md").write_text("\n".join(lines), encoding="utf-8")

    print(
        f"Wrote {catalog_path} "
        f"({len(clips)} clips, {len(particles)} particle objs, {len(other)} other)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
