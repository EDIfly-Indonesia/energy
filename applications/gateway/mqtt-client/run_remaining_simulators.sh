#!/bin/bash
# Daftar perangkat ONLINE yang belum disimulasikan
DEVICES=(
"0301fed5-bb55-416b-97f1-a8a322a548d6" "039208de-7959-4be6-9132-f3bdfd20cefd" "053f7ca7-16ab-48c3-b275-af90b104a304"
"0ff949b6-36a3-4f43-8f73-7e54d5a9fea4" "12cb2e18-3558-4cf0-9429-aa93262abd2c" "15bc4bca-29f4-423b-974e-31069d0e0856"
"1b5dbcd6-95a5-4cc4-ba94-40602c1f0408" "2eb82f56-b8a7-4e54-a550-7d4025fa4745" "30a78cac-9729-40ff-aaf0-306d0d49bd1c"
"32111cbf-a1f0-40c4-b4d2-dfb7aff0ed7d" "3cd6029e-18d4-4608-bfd7-f848fb1f9118" "745688cd-1b19-466d-86ee-8346e5f73ee8"
"79354dbb-d18b-4ca7-925a-d436f5154465" "7beea683-fa94-4d25-84e2-11bd3475e42d" "824002a3-d9db-4440-ac06-13f73acf0f00"
"9e913da1-21c9-411c-8b66-2eb5bd2a9603" "a6ce7a44-988a-4bcb-9d16-424917c4a3ca" "a73751b4-b02f-4290-af17-c4e3f706587a"
"b5325af0-3bab-46c0-b9c9-9cbebc6dea1f" "b9fb696c-43c0-4221-9ce7-3663488453b2" "ca6e474a-3a27-4c61-9342-2d6ba89a8e04"
"d0d478f3-342d-4686-9264-c192e6f71254" "dac64d90-148e-43ba-887b-dfccedefdf19" "daf71384-9365-4741-a8ae-cdb9f5f11845"
"e775c0d4-d67e-4829-87a2-75ddd9a87e65" "f5ce2b28-88bb-45b4-93b0-1d27463ba997" "fd026ec2-4e40-4116-b6dc-121336db0413"
)

SCRIPT_DIR="/opt/energy/applications/gateway/mqtt-client"
SCRIPT_FILE="$SCRIPT_DIR/inverter_simulator.py"

echo "🚀 Starting simulators for ${#DEVICES[@]} remaining devices..."

for dev in "${DEVICES[@]}"; do
    python3 "$SCRIPT_FILE" --device-id "$dev" --interval 30 &
    sleep 0.2
done

echo "✅ All simulators started!"
