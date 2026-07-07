#!/usr/bin/env bash
# =============================================================================
# deploy.sh — deploy latest code to the production server
#
# Run ON the server (as the deploy user):
#   cd /home/deploy/string-theory && bash scripts/deploy.sh
#
# What it does:
#   1. Pulls latest code from main
#   2. Installs npm dependencies
#   3. Builds the production bundle into dist/ (nginx serves this directly —
#      no PHP-FPM/queue worker to restart, this is a static SPA)
#   4. Runs a smoke test (HTTP 200 on the live site)
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/home/deploy/string-theory}"
SITE_URL="${SITE_URL:-https://string-theory.thijssensoftware.nl}"

cd "$APP_DIR"

step() { echo; echo "▶ $*"; }
ok()   { echo "  ✓ $*"; }

START=$(date +%s)
echo "════════════════════════════════════════════"
echo "  Deploying string-theory  —  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
step "Pulling from origin/main"
git fetch origin
git reset --hard origin/main
ok "$(git log -1 --format='%h %s')"

# ── 2. npm dependencies ───────────────────────────────────────────────────────
step "Installing npm dependencies"
npm ci --no-audit --no-fund
ok "Dependencies installed"

# ── 3. Build ───────────────────────────────────────────────────────────────────
step "Building production bundle"
npm run build
ok "Build complete"

# ── 4. Smoke test ─────────────────────────────────────────────────────────────
step "Smoke test"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SITE_URL/" || echo "000")

if [[ "$HTTP_CODE" == "200" ]]; then
  ok "GET $SITE_URL/ → $HTTP_CODE"
else
  echo "  ✗ GET $SITE_URL/ → $HTTP_CODE" >&2
  echo "  Check /var/log/nginx/string-theory-error.log" >&2
  exit 1
fi

END=$(date +%s)
echo
echo "════════════════════════════════════════════"
echo "  Deploy complete in $((END - START))s"
echo "════════════════════════════════════════════"
