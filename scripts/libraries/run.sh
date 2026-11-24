#!/bin/sh
# Runs the library check on the Pi (cron, monthly) and sends a message when something needs a look.
# Deployed next to check.mjs, parseHours.mjs, serviceHours.mjs, service.mjs, service_extract.py, requirements.txt and
# libraries.json, see docs/library-data.md.
#
# Silent when everything matches. A message goes out when
#   - hours differ, hours are missing or a link is dead (check.mjs exit code 1),
#   - the number of unreadable pages changed (berlin.de changed a template, the parser needs a look),
#   - the check itself failed (any other exit code),
#   - the service hours (staffed times) changed or Gemini's reading of a page failed a guard (service.mjs),
#   - Gemini was unavailable for some pages even after a retry (a separate, lower-key message),
#   - the service step itself failed.
# Channel: ntfy. Put NTFY_TOPIC=<hard to guess name> into .env next to this script and subscribe to that topic
# in the ntfy app. Without a topic the result is only written to last-run.txt and run.log.
# DRY_RUN=1 prints the messages instead of sending them.
#
# The service step reads the pages with Gemini: it needs a Python with the packages of requirements.txt (SERVICE_PYTHON,
# default ./venv/bin/python3, made with `python3 -m venv venv && venv/bin/pip install -r requirements.txt`) and the
# keys GOOGLE_API_KEY, GOOGLE_API_KEY2, ... in the .env next to this script. Without that Python the step is skipped.
cd "$(dirname "$0")" || exit 1
[ -f .env ] && . ./.env

notify() { # title, message
  if [ -n "$DRY_RUN" ]; then
    printf 'DRY RUN, would send "%s":\n%s\n' "$1" "$2"
  elif [ -n "$NTFY_TOPIC" ]; then
    curl -s -m 20 -H "Title: $1" -d "$2" "https://ntfy.sh/$NTFY_TOPIC" > /dev/null && echo "sent to ntfy"
  else
    echo "no NTFY_TOPIC set, message not sent"
  fi
}

# CHECK_ARGS is for tests (--only <id>). A crash also exits with 1, so a run without the summary line counts as failed.
node check.mjs --data libraries.json --json report.json --texts texts.json $CHECK_ARGS > last-run.txt 2>&1
code=$?
summary=$(tail -n 1 last-run.txt)
case "$summary" in *" libraries: "*) ;; *) code=99 ;; esac

unreadable=$(printf '%s' "$summary" | sed -n 's/.*[ :,]\([0-9][0-9]*\) unreadable.*/\1/p')
previous=$(cat unreadable.count 2>/dev/null)
[ -n "$unreadable" ] && printf '%s\n' "$unreadable" > unreadable.count

title=""
body=""
if [ "$code" -eq 1 ]; then
  title="Bibliotheksdaten: Abweichungen"
  body="$(grep -A4 '^!!' last-run.txt | head -n 40)"
elif [ "$code" -ne 0 ]; then
  title="Bibliotheks-Check fehlgeschlagen (Exit $code)"
  body="$(tail -n 15 last-run.txt)"
elif [ -n "$previous" ] && [ -n "$unreadable" ] && [ "$previous" != "$unreadable" ]; then
  title="Bibliotheks-Check: unlesbare Seiten $previous -> $unreadable"
  body="$(grep '^ ~' last-run.txt | head -n 20)"
fi

echo "$(date '+%Y-%m-%d %H:%M') exit=$code ${title:-no message} | $summary"
[ -n "$title" ] && notify "$title" "$summary
$body"

# Service hours: Gemini reads the hours text of the libraries with service-free times, service.mjs checks the answer
python="${SERVICE_PYTHON:-./venv/bin/python3}"
if [ ! -s texts.json ] || ! command -v "$python" > /dev/null 2>&1; then
  echo "service step skipped (no texts.json or no $python)"
  exit 0
fi
"$python" service_extract.py texts.json extractions.json > last-service.txt 2>&1
extract=$?
if [ "$extract" -ne 0 ] || [ ! -s extractions.json ]; then
  echo "$(date '+%Y-%m-%d %H:%M') service step failed (extract exit=$extract)"
  notify "Servicezeiten-Check fehlgeschlagen (Exit $extract)" "$(tail -n 15 last-service.txt)"
  exit 0
fi
node service.mjs --data libraries.json --texts texts.json --extractions extractions.json >> last-service.txt 2>&1
service=$?
service_summary=$(tail -n 1 last-service.txt)
echo "$(date '+%Y-%m-%d %H:%M') service exit=$service | $service_summary"
if [ "$service" -eq 1 ]; then
  notify "Bibliotheksdaten: Servicezeiten" "$service_summary
$(grep -A3 '^!!' last-service.txt | head -n 40)"
elif [ "$service" -eq 3 ]; then
  notify "Servicezeiten: Gemini-Lauf unvollständig" "$service_summary
$(grep -A1 '^!!' last-service.txt | head -n 20)"
elif [ "$service" -ne 0 ]; then
  notify "Servicezeiten-Check fehlgeschlagen (Exit $service)" "$(tail -n 15 last-service.txt)"
fi
exit 0
