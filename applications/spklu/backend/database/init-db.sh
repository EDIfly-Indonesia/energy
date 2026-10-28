#!/bin/bash
set -e

echo "Importing /init-sql/db.sql into ${MYSQL_DATABASE}..."
mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < /init-sql/db.sql
echo "Import complete."