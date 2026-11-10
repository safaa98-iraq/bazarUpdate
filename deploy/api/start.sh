#!/bin/sh
# Boot sequence for the preview container: MariaDB → schema → seed → API.
set -e

DATADIR=/var/lib/mysql
mkdir -p /run/mysqld && chown mysql:mysql /run/mysqld

if [ ! -d "$DATADIR/mysql" ]; then
  echo "▶ Initialising MariaDB data directory"
  mariadb-install-db --user=mysql --datadir="$DATADIR" --skip-test-db > /dev/null
fi

echo "▶ Starting MariaDB"
# App files (APK/IPA) are stored as blobs, so allow large packets
mariadbd --user=mysql --datadir="$DATADIR" --max-allowed-packet=256M &

for i in $(seq 1 60); do
  mariadb-admin ping --silent 2>/dev/null && break
  sleep 1
done
mariadb-admin ping --silent || { echo "MariaDB did not start"; exit 1; }

DB_PASS="${PREVIEW_DB_PASSWORD:-bazar-preview}"
mariadb -uroot <<SQL
CREATE DATABASE IF NOT EXISTS bazar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'bazar'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON bazar.* TO 'bazar'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
export DATABASE_URL="mysql://bazar:${DB_PASS}@127.0.0.1:3306/bazar"

echo "▶ Applying Prisma schema"
npx prisma db push --skip-generate --schema packages/database/prisma/schema.prisma

echo "▶ Seeding admin + demo merchant"
npm run db:seed

# Preview only: give the demo merchant a plan so plan-gated features can be tried.
if [ -n "${PREVIEW_DEMO_PLAN:-}" ]; then
  mariadb -uroot bazar -e "UPDATE User SET plan='${PREVIEW_DEMO_PLAN}' WHERE email='merchant@demo.com'; UPDATE Store SET currency='IQD' WHERE slug='demo-store';"
fi

echo "▶ Starting API on port ${PORT}"
export NODE_ENV=production
exec node apps/api/dist/index.js
