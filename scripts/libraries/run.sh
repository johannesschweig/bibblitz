#!/bin/sh
# Runs the library check on the Pi (cron, monthly) and sends a message when something needs a look.
# Deployed next to check.mjs, parseHours.mjs and libraries.json, see docs/library-data.md.
#
# Silent when everything matches. A message goes out when
#   - hours differ, hours are missing or a link is dead (check.mjs exit code 1),
#   - the number of unreadable pages changed (berlin.de changed a template, the parser needs a look),
#   - the check itself failed (any other exit code).
# Channel: ntfy. Put NTFY_TOPIC=<hard to guess name> into .env next to this script and subscribe to that topic
# in the ntfy app. Without a topic the result is only written to last-run.txt and run.log.
# DRY_RUN=1 prints the message instead of sending it.
cd "$(dirname "$0")" || exit 1
[ -f .env ] && . ./.env

# CHECK_ARGS is for tests (--only <id>). A crash also exits with 1, so a run without the summary line counts as failed.
node check.mjs --data libraries.json --json report.json $CHECK_ARGS > last-run.txt 2>&1
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
[ -z "$title" ] && exit 0

message="$summary
$body"
if [ -n "$DRY_RUN" ]; then
  printf 'DRY RUN, would send "%s":\n%s\n' "$title" "$message"
elif [ -n "$NTFY_TOPIC" ]; then
  curl -s -m 20 -H "Title: $title" -d "$message" "https://ntfy.sh/$NTFY_TOPIC" > /dev/null && echo "sent to ntfy"
else
  echo "no NTFY_TOPIC set, message not sent"
fi
