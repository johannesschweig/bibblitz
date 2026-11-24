"""Reads the opening-hours text of library pages with Gemini and writes what it found as JSON.

    python3 service_extract.py texts.json extractions.json

texts.json comes from `node check.mjs --texts texts.json` ({library id: page text window}). Each page is read twice,
on two different models, so service.mjs can compare the runs. The model's answer is never trusted on its own:
service.mjs checks it against the page text and the stored opening hours (see serviceHours.mjs).

Needs `pip install -r requirements.txt` (google-genai, pydantic) and free-tier Gemini keys in the environment or in a
.env file (next to this script, or the repo root): GOOGLE_API_KEY, GOOGLE_API_KEY2, GOOGLE_API_KEY3, ... The same
three keys as fungio; daily quotas are per key and model, so more keys spread the load (about 48 requests a month here).
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Literal

from google import genai
from google.genai import errors as genai_errors
from pydantic import BaseModel

# Two different models: run 1 and run 2 must not share one. These two are the only text models of the free tier with a
# real 500 requests per day (checked in Google AI Studio's quota dashboard for fungio, see its CLAUDE.md); every other
# Flash model caps at 20 a day. Check the dashboard before changing them, the limits have moved several times.
GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]
# Taken when one of the two above is down (503 "high demand" lasted for hours on 23.11.2026): a library is read by
# the first two models that answer. fungio's notes say these cap at 20 requests a day per key; 24 libraries spread
# over three keys are 8 per key and model, so this fits. Checked with a live call on 23.11.2026.
FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash"]


def load_env() -> None:
    """Reads KEY=VALUE lines of a .env next to this script, then of the repo root. Existing variables win."""
    for path in (Path(__file__).with_name(".env"), Path(__file__).resolve().parents[2] / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def api_keys() -> list[str]:
    return [
        value for name, value in sorted(os.environ.items())
        if value and (name == "GOOGLE_API_KEY" or (name.startswith("GOOGLE_API_KEY") and name[len("GOOGLE_API_KEY"):].isdigit()))
    ]


Day = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


class DayHours(BaseModel):
    day: Day
    open: str | None  # "HH:MM-HH:MM", null when closed
    service_free: list[str]  # ranges without staff, "HH:MM-HH:MM"
    restricted: list[str]  # ranges with "eingeschränkter Service" (counted as no staff)
    quote: str  # the sentence or line of the page text that says so, "" when there is none


class Week(BaseModel):
    days: list[DayHours]


PROMPT = """Below is text copied from a Berlin public library's web page. It contains the regular opening hours
and notes about times when no library staff is at the desk.

Return one entry for each of the seven weekdays.

- `open`: the regular opening time of that day as "HH:MM-HH:MM" (24 h clock), or null when the library is closed.
- `service_free`: the time ranges inside the opening time when NO staff is there ("servicefrei", "ohne Service",
  "ohne Personal"). "ab 13 Uhr servicefrei" on a day that closes at 19 Uhr is "13:00-19:00". "ganztags", "komplett"
  or no times at all means the whole opening range of that day. Empty list when staff is there all day.
- `restricted`: ranges with "eingeschränkter Service" (self-service at the machines only). Never put them in
  `service_free`; keep the two lists apart.
- `quote`: copy, character for character, the sentence or line of the text that gives the service-free or
  restricted times for that day. Several days may share one quote. "" when the day has neither.

If the text instead lists the times when staff IS there ("Servicezeiten", "unser Team ist da"), then `service_free`
is the rest of the opening time of that day.

A bracketed range that touches the opening range belongs to the opening time: "12 – 19 Uhr (10 – 12 Uhr
eingeschränkter Service)" means `open` "10:00-19:00" and `restricted` ["10:00-12:00"]. A service-free
range inside the opening time ("9 bis 19 Uhr (9 bis 11 Uhr ohne Service)") changes nothing about `open`.

Rules: use only the regular schedule. Ignore temporary schedules, holidays, closing days and special opening hours.
Do not invent times: if the text does not say it, leave it out. Times are written "HH:MM" with two digits.

TEXT:
"""


class ModelDown(Exception):
    """The model kept answering 5xx through all retries; the rest of the run skips it (see `down`)."""


down: set[str] = set()  # models that failed all retries once in this run: skipped, so an outage costs minutes, not an hour


def run(client: genai.Client, model: str, text: str) -> list[dict]:
    """One extraction; retries on per-minute limits and server errors, raises on a daily quota."""
    if model in down:
        raise ModelDown(f"{model} is down in this run (earlier calls kept failing)")
    last: Exception | None = None
    for attempt in range(6):
        try:
            response = client.models.generate_content(
                model=model,
                contents=PROMPT + text,
                config={"response_mime_type": "application/json", "response_schema": Week, "temperature": 0},
            )
            return [d.model_dump() for d in Week.model_validate_json(response.text).days]
        except genai_errors.ClientError as e:
            if "PerDay" in str(e) or "per_day" in str(e).lower():
                raise
            last = e
            time.sleep(15 * (attempt + 1))
        except genai_errors.ServerError as e:
            last = e
            time.sleep(10 * (attempt + 1))  # "503 high demand" spikes last a minute or so
    if isinstance(last, genai_errors.ServerError):
        down.add(model)
    raise RuntimeError(f"{model}: giving up after retries: {last}")


def main(texts_path: str, out_path: str) -> int:
    load_env()
    keys = api_keys()
    if not keys:
        print("no GOOGLE_API_KEY found in the environment or in a .env file", file=sys.stderr)
        return 2
    with open(texts_path, encoding="utf-8") as f:
        texts: dict[str, str] = json.load(f)

    clients = {key: genai.Client(api_key=key) for key in keys}
    # The two runs of a library are always two different models; keys rotate to spread the daily quota
    results: dict[str, dict] = {}

    def read(lib_id: str, text: str, key: str) -> None:
        results[lib_id] = {"runs": [], "models": [], "error": None}
        if not text:
            results[lib_id]["error"] = "no hours text"
            return
        last_error = None
        for model in GEMINI_MODELS + FALLBACK_MODELS:
            if len(results[lib_id]["runs"]) == 2:
                break
            try:
                results[lib_id]["runs"].append(run(clients[key], model, text))
                results[lib_id]["models"].append(model)
            except ModelDown as e:
                last_error = e
            except Exception as e:  # daily quota, retries used up, bad answer: try the next model
                last_error = e
                if isinstance(e, genai_errors.ClientError):
                    down.add(model)
        if len(results[lib_id]["runs"]) < 2:
            results[lib_id]["error"] = f"{type(last_error).__name__}: {last_error}"[:300]
        error = results[lib_id]["error"]
        print(f"{lib_id}: {len(results[lib_id]['runs'])} runs{' ERROR ' + error if error else ''}", flush=True)

    for index, (lib_id, text) in enumerate(texts.items()):
        read(lib_id, text, keys[index % len(keys)])

    # One more pass over the failed ones after a pause: an overloaded model usually recovers within minutes
    failed = [lib_id for lib_id, r in results.items() if r["error"] and texts[lib_id]]
    if failed:
        print(f"retrying {len(failed)} failed libraries in 120 s", flush=True)
        time.sleep(120)
        down.clear()  # the outage may be over
        for index, lib_id in enumerate(failed):
            read(lib_id, texts[lib_id], keys[(index + 1) % len(keys)])
    failures = sum(1 for r in results.values() if r["error"])

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return 1 if failures == len(texts) and texts else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
