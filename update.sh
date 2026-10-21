#!/usr/bin/env bash
# Update a self-hosted install: pull the latest code of this fork and rebuild the containers.
# Your data (volumes) and your .env are kept. See docs/SETUP.md for backups.

set -eu

cd "$(dirname "$0")"

command -v docker >/dev/null 2>&1 || { echo "Error: docker is not installed." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose v2 is missing." >&2; exit 1; }
[ -f .env ] || { echo "Error: .env not found. Run ./install.sh first." >&2; exit 1; }

if [ -d .git ] && command -v git >/dev/null 2>&1; then
  echo "Pulling the latest code..."
  git pull --ff-only
else
  echo "Not a git checkout, skipping the code update."
fi

echo "Rebuilding and restarting Postiz (this can take a while)..."
docker compose up -d --build

# The previous image becomes an untagged leftover after a rebuild.
docker image prune -f >/dev/null 2>&1 || true

echo ""
echo "Done. Follow the startup with: docker compose logs -f postiz"
