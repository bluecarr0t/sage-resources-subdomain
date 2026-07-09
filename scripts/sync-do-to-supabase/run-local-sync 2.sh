#!/bin/zsh
# Local scheduled runner for the DigitalOcean -> Supabase sync.
# Runs from this machine so connections originate from the IP whitelisted
# in DigitalOcean Trusted Sources (GitHub-hosted runners cannot reach DO).
#
# Invoked by the launchd agent ~/Library/LaunchAgents/com.sage.do-supabase-sync.plist
# Any extra args are passed through to `npm run sync:do` (e.g. --no-large, --replace-snapshots).

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

REPO="/Users/nickharsell/Documents/sage-resources-subdomain"
LOG_DIR="$HOME/Library/Logs/sage-do-sync"
mkdir -p "$LOG_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/sync-$TS.log"

cd "$REPO" || { echo "repo not found: $REPO" >&2; exit 1; }

echo "=== DO -> Supabase sync starting $TS (args: $*) ===" | tee -a "$LOG"
npm run sync:do -- "$@" >> "$LOG" 2>&1
STATUS=$?
echo "=== finished status=$STATUS at $(date +%Y%m%d-%H%M%S) ===" | tee -a "$LOG"

# Keep ~60 days of logs
find "$LOG_DIR" -name 'sync-*.log' -mtime +60 -delete 2>/dev/null

exit $STATUS
