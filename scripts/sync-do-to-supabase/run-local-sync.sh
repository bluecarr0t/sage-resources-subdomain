#!/bin/zsh
# Local scheduled runner for the DigitalOcean -> Supabase condensed sync.
# Runs from this machine so connections originate from the IP whitelisted
# in DigitalOcean Trusted Sources (GitHub-hosted runners cannot reach DO).
#
# Invoked by the launchd agent ~/Library/LaunchAgents/com.sage.do-supabase-sync.plist
# Always syncs campings dimensions only (--no-large). Extra args are appended
# (e.g. --replace-snapshots, --continue-on-error). Pass --include-large only
# for an intentional emergency history pull (not the weekly default).

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

REPO="/Users/nickharsell/Documents/sage-resources-subdomain"
LOG_DIR="$HOME/Library/Logs/sage-do-sync"
mkdir -p "$LOG_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/sync-$TS.log"

cd "$REPO" || { echo "repo not found: $REPO" >&2; exit 1; }

# Condensed weekly default: dimensions only — never grow raw sites/propertys history.
SYNC_ARGS=(--databases=campings --no-large "$@")

echo "=== DO -> Supabase condensed sync starting $TS (args: ${SYNC_ARGS[*]}) ===" | tee -a "$LOG"
npm run sync:do -- "${SYNC_ARGS[@]}" >> "$LOG" 2>&1
SYNC_STATUS=$?
if [ $SYNC_STATUS -eq 0 ]; then
  echo "=== Matview snapshot (latest_sites, site_monthly/yearly_analytics) ===" | tee -a "$LOG"
  npm run sync:do:matviews >> "$LOG" 2>&1
  STATUS=$?
else
  STATUS=$SYNC_STATUS
fi
echo "=== finished status=$STATUS at $(date +%Y%m%d-%H%M%S) ===" | tee -a "$LOG"

# Keep ~60 days of logs
find "$LOG_DIR" -name 'sync-*.log' -mtime +60 -delete 2>/dev/null

exit $STATUS
