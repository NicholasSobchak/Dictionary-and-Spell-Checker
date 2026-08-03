#!/usr/bin/env bash
#
# QuickQuill production deploy script (runs on the VPS, invoked by deploy.yml
# after the Docker images are built and pushed to Docker Hub).
#
# Expected environment (passed by the GitHub Actions ssh step):
#   DB_URL, DB_USERNAME, DB_PASSWORD   - host PostgreSQL credentials
#   DOCKER_TAG                         - git SHA the images were built from
#   DOCKER_IMAGE_BACKEND / _FRONTEND   - Docker Hub image names
#   DOCKER_USERNAME / DOCKER_PASSWORD   - Docker Hub login (use an access token, not the account password)
#
# The VPS stack is fully Dockerized (backend + nginx containers on host
# networking). User data stays in the host PostgreSQL instance, which the
# backend container reaches over localhost. The previous systemd/nginx deploy
# is stopped and disabled; on failure this script rolls back to the previous
# image tag, and as a last resort re-enables the old systemd stack.
set -euo pipefail

APP_DIR=/var/www/quickquill
cd "$APP_DIR"

log() { printf '\n=== %s ===\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

DOCKER_TAG="${DOCKER_TAG:-latest}"
DOCKER_IMAGE_BACKEND="${DOCKER_IMAGE_BACKEND:-nicksobchak/quickquill-backend}"
DOCKER_IMAGE_FRONTEND="${DOCKER_IMAGE_FRONTEND:-nicksobchak/quickquill-frontend}"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
PREV_TAG_FILE=/tmp/qq_prev_tag

[ -f "$COMPOSE_FILE" ] || die "docker-compose.prod.yml not found in $APP_DIR"

# ---------- 0. Docker: install if missing, make sure the daemon is up ----------
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker"
  sudo dnf install -y docker docker-compose-plugin >/dev/null 2>&1 \
    || sudo apt-get update >/dev/null 2>&1 \
    && sudo apt-get install -y docker.io docker-compose-plugin >/dev/null 2>&1 \
    || die "could not install docker (tried dnf and apt)"
fi
sudo systemctl enable --now docker >/dev/null 2>&1 || true
docker info >/dev/null 2>&1 || die "docker daemon not reachable"

# Ensure the docker compose v2 plugin exists BEFORE anything is stopped or
# started: a pre-existing docker install may lack it, which makes every
# "docker compose ..." call below fail ("unknown shorthand flag: 'f'").
if ! sudo docker compose version >/dev/null 2>&1; then
  log "Installing docker compose v2 plugin"
  sudo dnf install -y docker-compose-plugin >/dev/null 2>&1 \
    || (sudo apt-get update >/dev/null 2>&1 \
        && sudo apt-get install -y docker-compose-plugin docker-compose-v2 >/dev/null 2>&1) \
    || (sudo mkdir -p /usr/lib/docker/cli-plugins \
        && sudo curl -fsSL -o /usr/lib/docker/cli-plugins/docker-compose \
             "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
        && sudo chmod +x /usr/lib/docker/cli-plugins/docker-compose)
  sudo docker compose version >/dev/null 2>&1 \
    || die "docker compose v2 is not available (install the compose plugin on the VPS)"
fi

# Pulling requires auth for private repos; skip if no credentials were provided.
if [ -n "${DOCKER_USERNAME:-}" ] && [ -n "${DOCKER_PASSWORD:-}" ]; then
  log "Logging in to Docker Hub"
  echo "$DOCKER_PASSWORD" | sudo docker login -u "$DOCKER_USERNAME" --password-stdin >/dev/null \
    || die "docker login failed"
fi

# ---------- 1. Host PostgreSQL: ensure running + role/db exist ----------
# The dockerized backend uses host networking, so it connects to this instance
# via localhost — existing user data is preserved untouched.
[ -n "${DB_USERNAME:-}" ] || die "DB_USERNAME not set"
[ -n "${DB_PASSWORD:-}" ] || die "DB_PASSWORD not set"
[ -n "${DB_URL:-}" ] || die "DB_URL not set"
DB_NAME=$(printf '%s' "$DB_URL" | sed 's|.*/||')
[ -n "$DB_NAME" ] || die "could not derive DB name from DB_URL"

if ! command -v pg_isready >/dev/null 2>&1; then
  log "Installing PostgreSQL"
  sudo apt-get update >/dev/null 2>&1
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql >/dev/null 2>&1
fi
pg_isready -h localhost -p 5432 >/dev/null 2>&1 || sudo systemctl start postgresql 2>/dev/null || true
for i in $(seq 1 12); do
  pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
  sleep 5
done
pg_isready -h localhost -p 5432 >/dev/null 2>&1 || die "PostgreSQL not reachable on localhost:5432"

case "$DB_USERNAME" in *[!a-zA-Z0-9_]*) die "DB_USERNAME contains invalid characters" ;; esac
case "$DB_NAME" in *[!a-zA-Z0-9_]*) die "DB_NAME contains invalid characters" ;; esac
DB_PASS_SQL=$(printf '%s' "$DB_PASSWORD" | sed "s/'/''/g")

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USERNAME'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE \"$DB_USERNAME\" LOGIN"
sudo -u postgres psql -c "ALTER ROLE \"$DB_USERNAME\" WITH PASSWORD '$DB_PASS_SQL'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USERNAME" "$DB_NAME"

# ---------- 2. Dictionary database ----------
DICT=$(find "$APP_DIR" /var/www /srv /opt /home /root -maxdepth 4 -name 'dictionary.db' 2>/dev/null | head -n1 || true)
[ -n "$DICT" ] || die "dictionary.db not found on VPS"
log "Using dictionary: $DICT"

# ---------- 3. Stop the legacy (systemd/apt-nginx) stack ----------
# The docker containers must own 80/443/8080. The old artifacts and systemd
# unit are left in place so rollback can bring them back.
sudo systemctl stop quickquill-backend 2>/dev/null || true
sudo systemctl disable quickquill-backend 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl disable nginx 2>/dev/null || true
sudo docker compose -f "$APP_DIR/docker-compose.yml" down 2>/dev/null || true
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y psmisc >/dev/null 2>&1 || true
sudo fuser -k 80/tcp 443/tcp 8080/tcp >/dev/null 2>&1 || true

# ---------- 4. Pull the freshly built images and start the stack ----------
PREV_TAG=""
[ -f "$PREV_TAG_FILE" ] && PREV_TAG=$(cat "$PREV_TAG_FILE") || true

log "Pulling images (tag $DOCKER_TAG)"
sudo docker compose -f "$COMPOSE_FILE" pull backend nginx \
  || rollback "image pull failed"

log "Starting stack"
sudo docker compose -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
sudo docker compose -f "$COMPOSE_FILE" up -d --no-deps backend \
  || rollback "backend container start failed"

# Make certbot reload the dockerized nginx after renewal instead of the
# (now disabled) system nginx.
if [ -d /etc/letsencrypt/renewal-hooks/deploy ]; then
  sudo tee /etc/letsencrypt/renewal-hooks/deploy/qq-nginx-reload.sh >/dev/null <<'HOOK'
#!/usr/bin/env bash
docker restart quickquill-nginx-1 >/dev/null 2>&1 || true
HOOK
  sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/qq-nginx-reload.sh
  # Neutralize any per-cert renew_hook that reloads the now-disabled system
  # nginx; the deploy hook above restarts the dockerized nginx instead.
  sudo sed -i 's|renew_hook *= *systemctl reload nginx|renew_hook = docker restart quickquill-nginx-1|' /etc/letsencrypt/renewal/*.conf 2>/dev/null || true
fi

sudo docker compose -f "$COMPOSE_FILE" up -d --no-deps nginx \
  || rollback "nginx container start failed"

# ---------- 5. Health checks ----------
rollback() {
  echo "ERROR: $*" >&2
  sudo docker compose -f "$COMPOSE_FILE" logs --tail 80 backend nginx 2>/dev/null || true
  sudo docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
  if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$DOCKER_TAG" ]; then
    echo "Attempting rollback to previous image tag: $PREV_TAG"
    if sudo DOCKER_TAG="$PREV_TAG" docker compose -f "$COMPOSE_FILE" pull backend nginx \
        && sudo DOCKER_TAG="$PREV_TAG" docker compose -f "$COMPOSE_FILE" up -d --no-deps backend nginx; then
      sleep 15
      WORD_CODE=$(curl -s -o /tmp/word.json -w "%{http_code}" http://127.0.0.1:8080/api/word/test 2>/dev/null || true)
      [ "$WORD_CODE" = "200" ] && { echo "Rollback to $PREV_TAG is serving"; exit 1; }
    fi
    sudo docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
  fi
  echo "Restoring systemd stack"
  sudo systemctl enable nginx >/dev/null 2>&1 || true
  sudo systemctl start nginx 2>/dev/null || true
  sudo systemctl enable quickquill-backend >/dev/null 2>&1 || true
  sudo systemctl start quickquill-backend 2>/dev/null || true
  exit 1
}

# Backend must bind 8080 (boot can take minutes on a cold start).
JAVA_ON_8080=""
for i in $(seq 1 60); do
  # Host networking means the backend JVM binds 8080 directly; grep for the
  # java process specifically so a stale listener can't false-pass this check.
  INFO=$(sudo ss -ltnp 'sport = :8080' 2>/dev/null || true)
  if echo "$INFO" | grep -q 'java'; then
    JAVA_ON_8080=yes
    break
  fi
  [ $((i % 6)) -eq 0 ] && echo "  waiting for backend to bind port 8080... $((i * 5))s elapsed"
  sleep 5
done
[ -n "$JAVA_ON_8080" ] || rollback "backend did not bind port 8080 within 5 minutes"

WORD_CODE=""
for i in $(seq 1 36); do
  WORD_CODE=$(curl -s -o /tmp/word.json -w "%{http_code}" http://127.0.0.1:8080/api/word/test 2>/dev/null || true)
  [ "$WORD_CODE" = "200" ] && break
  sleep 5
done
[ "$WORD_CODE" = "200" ] || rollback "word lookup failed (got $WORD_CODE): $(cat /tmp/word.json 2>/dev/null || true)"

AUTH_CODE=""
for i in $(seq 1 12); do
  AUTH_CODE=$(curl -s -o /tmp/auth.json -w "%{http_code}" -X POST \
    http://127.0.0.1:8080/api/auth/login \
    -d "email=probe@quickquill.ink" -d "password=probe" 2>/dev/null || true)
  [ "$AUTH_CODE" = "401" ] && break
  sleep 5
done
[ "$AUTH_CODE" = "401" ] || rollback "auth endpoint missing (got $AUTH_CODE)"

SIGNUP_CODE=""
for i in $(seq 1 12); do
  SIGNUP_CODE=$(curl -s -o /tmp/signup.json -w "%{http_code}" -X POST \
    http://127.0.0.1:8080/api/auth/signup 2>/dev/null || true)
  [ "$SIGNUP_CODE" = "400" ] && break
  sleep 5
done
[ "$SIGNUP_CODE" = "400" ] || rollback "signup endpoint missing (got $SIGNUP_CODE)"

# End-to-end through the dockerized nginx (localhost to avoid hairpin NAT).
curl -fsS -o /dev/null --resolve quickquill.ink:443:127.0.0.1 https://quickquill.ink/ \
  || rollback "SPA not served by dockerized nginx"
PUB=$(curl -s -o /tmp/pub.json -w "%{http_code}" -X POST \
  --resolve quickquill.ink:443:127.0.0.1 https://quickquill.ink/api/auth/login \
  -d "email=probe@quickquill.ink" -d "password=probe" || true)
[ "$PUB" = "401" ] || rollback "auth not reachable via nginx (got $PUB)"

# ---------- 6. Record the now-current tag for the next rollback ----------
echo "$DOCKER_TAG" | sudo tee "$PREV_TAG_FILE" >/dev/null

log "Deploy complete: docker stack live (tag $DOCKER_TAG)"
