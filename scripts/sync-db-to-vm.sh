#!/bin/bash

# Set variables
VM_USER="userpltsapp"
VM_HOST="10.4.126.252"
DB_NAME="energy_platform"
DB_USER="energy_app"
DUMP_FILE="/tmp/energy_platform_dump_$(date +%Y%m%d_%H%M%S).sql"

echo "🚀 Starting database sync to VM..."

# 1. Export database dari local
echo "📤 Exporting database from local..."
docker exec -it energy-postgres pg_dump -U $DB_USER -d $DB_NAME > $DUMP_FILE

if [ $? -ne 0 ]; then
    echo "❌ Export failed!"
    exit 1
fi

echo "✅ Export completed: $DUMP_FILE"

# 2. Compress file
echo "📦 Compressing..."
gzip $DUMP_FILE
DUMP_FILE_GZ="${DUMP_FILE}.gz"

# 3. Transfer ke VM
echo "📤 Transferring to VM..."
scp $DUMP_FILE_GZ $VM_USER@$VM_HOST:/tmp/

if [ $? -ne 0 ]; then
    echo "❌ Transfer failed!"
    exit 1
fi

echo "✅ Transfer completed"

# 4. Import di VM
echo "📥 Importing to VM..."
ssh $VM_USER@$VM_HOST << ENDSSH
    # Extract file
    gunzip /tmp/$(basename $DUMP_FILE_GZ)
    
    # Drop and recreate database
    docker exec -it energy-postgres psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker exec -it energy-postgres psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    
    # Import
    docker exec -i energy-postgres psql -U $DB_USER -d $DB_NAME < /tmp/$(basename $DUMP_FILE)
    
    # Verify
    echo "✅ Import completed"
    docker exec -it energy-postgres psql -U $DB_USER -d $DB_NAME -c "\dt"
ENDSSH

# 5. Cleanup local
echo "🧹 Cleaning up local files..."
rm -f $DUMP_FILE $DUMP_FILE_GZ

echo "✅ Database sync completed!"
