#!/usr/bin/env bash
#
# QuickQuill production deploy script (runs on the VPS).
#
# Expected layout, created by the GitHub Actions deploy job:
#   /var/www/quickquill/release.tar.gz        -> quickquill-backend.jar,
#                                                libquickquill_engine.so,
#                                                browser/ (Angular build),
#                                                nginx-quickquill-vps.conf,
#                                                quickquill-backend.env
#   /var/www/quickquill/scripts/deploy_prod.sh  -> this script
#
# The script installs/repairs Java 22, PostgreSQL, nginx and the
# quickquill-backend systemd unit, then health-checks the deployment.
set -euo pipefail

APP_DIR=/var/www/quickquill
cd "$APP_DIR"

log() { printf '\n=== %s ===\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

# ---------- 0. Extract release artifacts ----------
log "Extracting release artifacts"
test -f release.tar.gz || die "release.tar.gz not found in $APP_DIR"
tar -xzf release.tar.gz

NGINX_SRC="$APP_DIR/nginx-quickquill-vps.conf"
JAR="$APP_DIR/quickquill-backend.jar"
SO="$APP_DIR/libquickquill_engine.so"
BROWSER="$APP_DIR/browser"
ENV_DROPIN="$APP_DIR/quickquill-backend.env"

test -f "$NGINX_SRC" || die "nginx config missing in release"
test -f "$JAR" || die "backend JAR missing in release"
test -f "$SO" || die "libquickquill_engine.so missing in release"
test -f "$BROWSER/index.html" || die "frontend build missing index.html"

# ---------- 1. Java 22: find or install ----------
JAVA_BIN=$(command -v java || true)
if [ -n "$JAVA_BIN" ] && ! "$JAVA_BIN" -version 2>&1 | grep -qE '2[2-9]'; then
  JAVA_BIN=""
fi
if [ -z "$JAVA_BIN" ]; then
  JAVA_BIN=$(find /usr/lib/jvm /opt /usr/local /home -name java 2>/dev/null | head -n1 || true)
  if [ -n "$JAVA_BIN" ] && ! "$JAVA_BIN" -version 2>&1 | grep -qE '2[2-9]'; then
    JAVA_BIN=""
  fi
fi
if [ -z "$JAVA_BIN" ]; then
  log "Installing Java 22 JRE"
  sudo apt-get update
  sudo apt-get install -y wget gnupg software-properties-common lsb-release 2>/dev/null || true
  sudo mkdir -p /etc/apt/keyrings
  wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public \
    | sudo tee /etc/apt/keyrings/adoptium.asc >/dev/null 2>&1 || true
  CODENAME=$(lsb_release -cs 2>/dev/null || echo bookworm)
  echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $CODENAME main" \
    | sudo tee /etc/apt/sources.list.d/adoptium.list >/dev/null 2>&1 || true
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y temurin-22-jre \
    || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-21-jre default-jre || true
  JAVA_BIN=$(command -v java || find /usr/lib/jvm -name java 2>/dev/null | head -n1 || true)
fi
[ -n "$JAVA_BIN" ] && [ -x "$JAVA_BIN" ] || die "Java executable not found on VPS"
log "Using Java binary: $JAVA_BIN"

# ---------- 2. PostgreSQL: install if missing, ensure role/db exist ----------
if ! command -v pg_isready >/dev/null 2>&1; then
  log "Installing PostgreSQL"
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql
fi
pg_isready -h localhost -p 5432 >/dev/null 2>&1 || sudo systemctl start postgresql 2>/dev/null || true
for i in $(seq 1 12); do
  pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
  sleep 5
done
pg_isready -h localhost -p 5432 >/dev/null 2>&1 || die "PostgreSQL not reachable on localhost:5432"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='quickquill'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE quickquill LOGIN PASSWORD 'quickquill'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='quickquill'" | grep -q 1 \
  || sudo -u postgres createdb -O quickquill quickquill

# ---------- 3. nginx: install managed config, drop stale duplicates ----------
SITE_FILE=/etc/nginx/sites-available/quickquill-vps.conf

# Preserve cert/root paths from the currently active config so they are never guessed.
ACTIVE=$(sudo grep -Rl "quickquill.ink" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -n1 || true)
[ -n "$ACTIVE" ] && sudo cp "$ACTIVE" /tmp/nginx.bak 2>/dev/null || true

ROOT=$(sudo grep -m1 -E '^\s*root ' /tmp/nginx.bak 2>/dev/null | awk '{print $2}' | tr -d ';' || true)
CERT=$(sudo grep -m1 'ssl_certificate ' /tmp/nginx.bak 2>/dev/null | awk '{print $2}' | tr -d ';' || true)
CERT_KEY=$(sudo grep -m1 'ssl_certificate_key ' /tmp/nginx.bak 2>/dev/null | awk '{print $2}' | tr -d ';' || true)
[ -n "$ROOT" ] || ROOT="$BROWSER"
[ -n "$CERT" ] || CERT=/etc/letsencrypt/live/quickquill.ink/fullchain.pem
[ -n "$CERT_KEY" ] || CERT_KEY=/etc/letsencrypt/live/quickquill.ink/privkey.pem

sudo mkdir -p /etc/nginx/sites-available
sudo cp "$NGINX_SRC" "$SITE_FILE"
sudo sed -i "s|@ROOT@|$ROOT|g" "$SITE_FILE"
sudo sed -i "s|@SSL_CERT@|$CERT|g" "$SITE_FILE"
sudo sed -i "s|@SSL_CERT_KEY@|$CERT_KEY|g" "$SITE_FILE"
sudo ln -sf "$SITE_FILE" /etc/nginx/sites-enabled/quickquill-vps.conf

# Remove every other config referencing quickquill.ink to avoid
# duplicate-server-name conflicts; keep only the managed file.
for f in $(sudo grep -Rl "quickquill.ink" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true); do
  case "$f" in
    "$SITE_FILE"|*/quickquill-vps.conf) ;;
    *) echo "Removing old nginx site: $f"; sudo rm -f "$f" ;;
  esac
done

rollback() {
  echo "ERROR: nginx config failed" >&2
  if [ -f /tmp/nginx.bak ]; then
    sudo cp /tmp/nginx.bak "$SITE_FILE"
    sudo nginx -t && sudo systemctl reload nginx
  fi
  exit 1
}

sudo nginx -t || rollback
sudo systemctl reload nginx

# Health check the SPA through nginx before touching the backend.
curl -fsS -o /dev/null --resolve quickquill.ink:443:127.0.0.1 https://quickquill.ink/ \
  || { echo "ERROR: SPA not served after nginx update" >&2; rollback; }

# ---------- 4. Backend: run the Spring Boot JAR ----------
LIBPATH=$(dirname "$SO")

# Reuse the dictionary path from the previous unit if possible.
OLD_EXEC=$(sudo systemctl cat quickquill-backend 2>/dev/null | grep -m1 '^ExecStart=' | sed 's/^ExecStart=//' || true)
DICT=$(echo "$OLD_EXEC" | grep -oE '/[^ ]*dictionary\.db' | head -n1 || true)
[ -n "$DICT" ] && [ -f "$DICT" ] || DICT=$(find "$APP_DIR" /var/www /srv /opt /home /root -maxdepth 4 -name 'dictionary.db' 2>/dev/null | head -n1 || true)
[ -n "$DICT" ] || die "dictionary.db not found on VPS"

# Free port 8080 from any stale process or Docker container. The systemd
# backend MUST own this port, otherwise the health checks below can hit a
# stale Docker-era backend and the deploy rolls back even though the new
# JAR is fine (exactly what happened when /api/auth returned 404 in prod).
free_port_8080() {
  if command -v docker >/dev/null 2>&1; then
    DOCKER_CIDS=$(sudo docker ps -q 2>/dev/null || true)
    for cid in $DOCKER_CIDS; do
      if sudo docker port "$cid" 2>/dev/null | grep -q '8080'; then
        echo "Stopping Docker container publishing 8080: $cid"
        sudo docker stop "$cid" >/dev/null 2>&1 || true
      fi
    done
    sudo docker stop quickquill-dictionary-spellchecker-backend-1 2>/dev/null || true
    sudo docker compose -f "$APP_DIR/docker-compose.yml" down 2>/dev/null || true
  fi
  # Kill any remaining process on the port (fuser is provided by psmisc).
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y psmisc >/dev/null 2>&1 || true
  sudo fuser -k 8080/tcp >/dev/null 2>&1 || true
}
free_port_8080

sudo cp /etc/systemd/system/quickquill-backend.service /tmp/backend.bak 2>/dev/null || true

# Ship DB settings as a systemd drop-in (from deploy/quickquill-backend.env).
sudo mkdir -p /etc/systemd/system/quickquill-backend.service.d
sudo cp "$ENV_DROPIN" /etc/systemd/system/quickquill-backend.service.d/env.conf

sudo tee /etc/systemd/system/quickquill-backend.service > /dev/null <<UNIT
[Unit]
Description=QuickQuill Spring Boot backend
After=network.target postgresql.service

[Service]
WorkingDirectory=$APP_DIR
Environment=SERVER_PORT=8080
Environment=QUICKQUILL_DICTIONARY_PATH=$DICT
EnvironmentFile=/etc/systemd/system/quickquill-backend.service.d/env.conf
ExecStart=$JAVA_BIN --enable-native-access=ALL-UNNAMED -Djava.library.path=$LIBPATH -jar $JAR --quickquill.dictionary-path=$DICT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable quickquill-backend >/dev/null 2>&1 || true
sudo systemctl restart quickquill-backend

backend_fail() {
  echo "ERROR: $*" >&2
  echo "=== systemd status ==="
  sudo systemctl status quickquill-backend --no-pager -l || true
  echo "=== journal (last 100 lines) ==="
  sudo journalctl -u quickquill-backend -n 100 --no-pager || true
  if [ -f /tmp/backend.bak ]; then
    echo "Restoring previous backend service"
    sudo cp /tmp/backend.bak /etc/systemd/system/quickquill-backend.service
    sudo systemctl daemon-reload
    sudo systemctl restart quickquill-backend
  fi
  exit 1
}

# The new JAR must actually own port 8080; if a stale process/container
# still holds it, the API below would be served by the old backend.
JAVA_ON_8080=""
for i in $(seq 1 24); do
  INFO=$(sudo ss -ltnp 'sport = :8080' 2>/dev/null || true)
  if echo "$INFO" | grep -q 'java'; then
    JAVA_ON_8080=yes
    break
  fi
  sleep 5
done
[ -n "$JAVA_ON_8080" ] || backend_fail "port 8080 is not served by the Java backend (stale process/container holds it): $(sudo ss -ltnp 'sport = :8080' 2>/dev/null || true)"

WORD_CODE=""
for i in $(seq 1 36); do
  WORD_CODE=$(curl -s -o /tmp/word.json -w "%{http_code}" http://127.0.0.1:8080/api/word/test 2>/dev/null || true)
  [ "$WORD_CODE" = "200" ] && break
  sleep 5
done
[ "$WORD_CODE" = "200" ] || backend_fail "word lookup failed (got $WORD_CODE): $(cat /tmp/word.json 2>/dev/null || true)"

AUTH_CODE=""
for i in $(seq 1 12); do
  AUTH_CODE=$(curl -s -o /tmp/auth.json -w "%{http_code}" -X POST \
    http://127.0.0.1:8080/api/auth/login \
    -d "email=probe@quickquill.ink" -d "password=probe" 2>/dev/null || true)
  [ "$AUTH_CODE" = "401" ] && break
  sleep 5
done
[ "$AUTH_CODE" = "401" ] || backend_fail "auth endpoint missing (got $AUTH_CODE): $(cat /tmp/auth.json 2>/dev/null || true)"

# Signup must exist too. Probing with no params returns 400 from Spring when
# the route is mapped (and creates no account); 404 means a stale backend.
SIGNUP_CODE=""
for i in $(seq 1 12); do
  SIGNUP_CODE=$(curl -s -o /tmp/signup.json -w "%{http_code}" -X POST \
    http://127.0.0.1:8080/api/auth/signup 2>/dev/null || true)
  [ "$SIGNUP_CODE" = "400" ] && break
  sleep 5
done
[ "$SIGNUP_CODE" = "400" ] || backend_fail "signup endpoint missing (got $SIGNUP_CODE): $(cat /tmp/signup.json 2>/dev/null || true)"

# ---------- 5. End-to-end through nginx (localhost to avoid hairpin NAT) ----------
PUB=$(curl -s -o /tmp/pub.json -w "%{http_code}" -X POST \
  --resolve quickquill.ink:443:127.0.0.1 https://quickquill.ink/api/auth/login \
  -d "email=probe@quickquill.ink" -d "password=probe" || true)
[ "$PUB" = "401" ] || { echo "ERROR: /api/auth not reachable via nginx (got $PUB):" >&2; cat /tmp/pub.json >&2; exit 1; }

log "Deploy complete: auth endpoints live"
