#!/usr/bin/env bash
# One-command installer for self-hosting this Postiz fork with docker compose.
#
#   ./install.sh                  ask a couple of questions, then build and start everything
#   ./install.sh --non-interactive  use defaults / flags, never ask
#   ./install.sh --url https://postiz.example.com
#
# Safe to run again: existing secrets in .env are kept, the stack is simply rebuilt and restarted.
# Step-by-step help (including how to connect each social platform): docs/SETUP.md

set -eu

cd "$(dirname "$0")"

DEFAULT_URL="http://localhost:4007"
DEFAULT_PG_PASSWORD="postiz-password"
DEFAULT_REDIS_PASSWORD="postiz-redis-password"
JWT_PLACEHOLDER="random string for your JWT secret, make it long"

INTERACTIVE=1
START=1
URL=""

usage() {
  cat <<'EOF'
Usage: ./install.sh [options]

  --non-interactive, -y   do not ask questions, use defaults (or --url)
  --url URL               public URL you will open Postiz on (default: http://localhost:4007)
  --no-start              only prepare .env, do not build / start the containers
  --help, -h              show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --non-interactive | -y | --yes) INTERACTIVE=0 ;;
    --url)
      [ $# -ge 2 ] || { echo "--url needs a value" >&2; exit 1; }
      URL="$2"
      shift
      ;;
    --url=*) URL="${1#--url=}" ;;
    --no-start) START=0 ;;
    --help | -h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

# Without a terminal we cannot ask anything.
[ -t 0 ] || INTERACTIVE=0

say() { printf '%s\n' "$*"; }
fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# 1. Prerequisites
# ---------------------------------------------------------------------------
command -v docker >/dev/null 2>&1 || fail "docker is not installed. Install Docker first: https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1 || fail "cannot talk to the docker daemon. Is Docker running, and is your user allowed to use it?"
docker compose version >/dev/null 2>&1 || fail "docker compose v2 is missing. Update Docker or install the compose plugin: https://docs.docker.com/compose/install/"
[ -f docker-compose.yaml ] || fail "docker-compose.yaml not found. Run this script from the root of the repository."
[ -f .env.example ] || fail ".env.example not found. Run this script from the root of the repository."

# ---------------------------------------------------------------------------
# 2. Helpers to read / write .env
# ---------------------------------------------------------------------------
get_var() {
  # prints the value of KEY from .env without quotes (empty if missing)
  sed -n "s/^$1=//p" .env | head -n 1 | sed -e 's/[[:space:]]#.*$//' -e 's/^"//' -e 's/"[[:space:]]*$//'
}

set_var() {
  # set_var KEY VALUE : replace "KEY=..." (or the first commented "#KEY=..."), else append
  _key="$1"
  _val="$2"
  _tmp="$(mktemp)"
  KEY="$_key" VAL="$_val" awk '
    BEGIN { key = ENVIRON["KEY"]; val = ENVIRON["VAL"]; done = 0 }
    {
      if (!done && (index($0, key "=") == 1 || index($0, "#" key "=") == 1)) {
        print key "=\"" val "\""
        done = 1
      } else if (index($0, key "=") == 1) {
        # drop duplicate active definitions
      } else {
        print
      }
    }
    END { if (!done) print key "=\"" val "\"" }
  ' .env >"$_tmp"
  cat "$_tmp" >.env
  rm -f "$_tmp"
}

disable_var() {
  # comment out an active "KEY=..." line
  _tmp="$(mktemp)"
  KEY="$1" awk '
    BEGIN { key = ENVIRON["KEY"] }
    { if (index($0, key "=") == 1) print "#" $0; else print }
  ' .env >"$_tmp"
  cat "$_tmp" >.env
  rm -f "$_tmp"
}

random_string() {
  # random_string LENGTH : letters and digits only, so the value is safe inside URLs
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$(($1 / 2 + 1))" | cut -c "1-$1"
  else
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"
  fi
}

# ---------------------------------------------------------------------------
# 3. Create .env and generate secrets
# ---------------------------------------------------------------------------
if [ -f .env ]; then
  say "Found an existing .env, keeping your settings."
else
  cp .env.example .env
  say "Created .env from .env.example."
fi

# JWT secret
jwt="$(get_var JWT_SECRET)"
if [ -z "$jwt" ] || [ "$jwt" = "$JWT_PLACEHOLDER" ]; then
  set_var JWT_SECRET "$(random_string 64)"
  say "Generated a new JWT_SECRET."
fi

# Redis password (not persisted anywhere, always safe to generate)
if [ "$(get_var REDIS_PASSWORD)" = "$DEFAULT_REDIS_PASSWORD" ] || [ -z "$(get_var REDIS_PASSWORD)" ]; then
  set_var REDIS_PASSWORD "$(random_string 32)"
  say "Generated a new REDIS_PASSWORD."
fi

# Postgres password: it is stored in the postgres volume the first time the database is created,
# so never change it when a database from a previous install already exists.
project="${COMPOSE_PROJECT_NAME:-$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]//g')}"
if [ "$(get_var POSTGRES_PASSWORD)" = "$DEFAULT_PG_PASSWORD" ] || [ -z "$(get_var POSTGRES_PASSWORD)" ]; then
  if docker volume inspect "${project}_postgres-volume" >/dev/null 2>&1; then
    say "Existing database volume found, keeping the current POSTGRES_PASSWORD so your data stays reachable."
  else
    set_var POSTGRES_PASSWORD "$(random_string 32)"
    say "Generated a new POSTGRES_PASSWORD."
  fi
fi

# ---------------------------------------------------------------------------
# 4. Public URL
# ---------------------------------------------------------------------------
current_url="$(get_var FRONTEND_URL)"
[ -n "$current_url" ] || current_url="$DEFAULT_URL"
# .env.example ships with the default URL, a previously chosen one is kept as the default answer.
if [ -z "$URL" ]; then
  URL="$current_url"
  if [ "$INTERACTIVE" = 1 ]; then
    say ""
    say "Which URL will you open Postiz on? Use your domain if it runs behind a reverse proxy"
    say "(for example https://postiz.example.com), or the server address (http://192.168.1.20:4007)."
    printf 'Public URL [%s]: ' "$URL"
    read -r answer || answer=""
    [ -z "$answer" ] || URL="$answer"
  fi
fi

URL="${URL%/}"
case "$URL" in
  http://* | https://*) ;;
  *) fail "The URL must start with http:// or https:// (got: $URL)" ;;
esac

set_var MAIN_URL "$URL"
set_var FRONTEND_URL "$URL"
set_var NEXT_PUBLIC_BACKEND_URL "$URL/api"
set_var BACKEND_INTERNAL_URL "http://localhost:3000"

# Host part, used to decide about the published port and secure cookies.
hostport="${URL#*://}"
hostport="${hostport%%/*}"
host="${hostport%%:*}"
port=""
case "$hostport" in *:*) port="${hostport##*:}" ;; esac

# An explicit port on localhost / an IP address means "publish Postiz on that port".
is_ip=0
case "$host" in
  "" | *[!0-9.]*) ;;
  *) is_ip=1 ;;
esac
if [ -n "$port" ] && { [ "$host" = "localhost" ] || [ "$is_ip" = 1 ]; }; then
  set_var POSTIZ_PORT "$port"
fi

# Plain http on anything but localhost needs NOT_SECURED, otherwise the login cookie is dropped.
case "$URL" in
  https://*) disable_var NOT_SECURED ;;
  *)
    if [ "$host" != "localhost" ] && [ "$host" != "127.0.0.1" ]; then
      set_var NOT_SECURED "true"
      say "Note: $URL is plain http on a non-local address, enabled NOT_SECURED so logins work. Use https if the server is on the internet."
    fi
    ;;
esac

chmod 600 .env 2>/dev/null || true

if [ "$START" = 0 ]; then
  say ""
  say ".env is ready. Start Postiz later with: docker compose up -d --build"
  exit 0
fi

# ---------------------------------------------------------------------------
# 5. Build and start
# ---------------------------------------------------------------------------
say ""
say "Building and starting Postiz. The first build compiles the whole app and can take 10-20 minutes."
docker compose up -d --build

cat <<EOF

Postiz is starting.

  Open:        $URL
  First start: give it 1-3 minutes (database setup + Temporal). Watch it with:
               docker compose logs -f postiz

Next steps
  1. Open $URL and create your account (the first user becomes the admin).
  2. Afterwards set DISABLE_REGISTRATION="true" in .env and run: docker compose up -d
  3. Add your social platform keys to .env and restart with: docker compose up -d
     (how to create the developer apps for each platform: docs/SETUP.md)
  4. Update later with ./update.sh. Back up the database before big updates (docs/SETUP.md).
EOF
