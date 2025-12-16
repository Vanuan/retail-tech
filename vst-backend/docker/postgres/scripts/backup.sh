#!/bin/sh
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE

# Optional: compress the backup
gzip $BACKUP_FILE

echo "Backup created: ${BACKUP_FILE}.gz"

# Optional: keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
