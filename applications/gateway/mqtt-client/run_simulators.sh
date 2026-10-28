#!/bin/bash

# Run multiple inverter simulators
# Usage: ./run_simulators.sh
# Device IDs and intervals are configured from the data seeder

echo "🚀 Starting 5 inverter simulators with different intervals..."

# Kill existing simulators
pkill -f inverter_simulator.py 2>/dev/null
sleep 1

# Device configurations from seeder data (Tenant → Site → Device)
# 5 devices with intervals: 5, 10, 15, 20, 25 seconds

# 1. PT Telkom - Jakarta Plant A - Inverter (SMA Charge Controller 799)
DEVICE_1="2c8d3252-8819-40d3-91bb-db289efd438a"
INTERVAL_1=5

# 2. PT Indosat - Bali Plant A - Smart Meter (Huawei Smart Meter 780)
DEVICE_2="eeb00e48-f41d-4ed1-a55c-61044b9c86dc"
INTERVAL_2=10

# 3. PT Telkom - Jakarta Plant B - Inverter (Schneider Electric Inverter 759)
DEVICE_3="e3156a37-784c-402c-b993-0a050825c6a2"
INTERVAL_3=15

# 4. PT Indosat - Pekanbaru Plant A - Inverter (Growatt Inverter 760)
DEVICE_4="174157c4-3528-4500-9a30-936f657a63a5"
INTERVAL_4=20

# 5. PT Mitratel - Jakarta Plant D - Data Logger (ABB Data Logger 430)
DEVICE_5="eb4bd1d8-bf0f-4514-aa5b-7c8c1204ffe8"
INTERVAL_5=25

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_FILE="$SCRIPT_DIR/inverter_simulator.py"

echo "📱 Device Configurations:"
echo "  1. PT Telkom / Jakarta Plant A / $DEVICE_1 (interval: ${INTERVAL_1}s)"
echo "  2. PT Indosat / Bali Plant A / $DEVICE_2 (interval: ${INTERVAL_2}s)"
echo "  3. PT Telkom / Jakarta Plant B / $DEVICE_3 (interval: ${INTERVAL_3}s)"
echo "  4. PT Indosat / Pekanbaru Plant A / $DEVICE_4 (interval: ${INTERVAL_4}s)"
echo "  5. PT Mitratel / Jakarta Plant D / $DEVICE_5 (interval: ${INTERVAL_5}s)"
echo ""

# Start simulators
python3 "$SCRIPT_FILE" --device-id "$DEVICE_1" --interval "$INTERVAL_1" &
PID_1=$!
echo "  ✅ Started simulator 1 (PID: $PID_1, interval: ${INTERVAL_1}s)"
sleep 0.5

python3 "$SCRIPT_FILE" --device-id "$DEVICE_2" --interval "$INTERVAL_2" &
PID_2=$!
echo "  ✅ Started simulator 2 (PID: $PID_2, interval: ${INTERVAL_2}s)"
sleep 0.5

python3 "$SCRIPT_FILE" --device-id "$DEVICE_3" --interval "$INTERVAL_3" &
PID_3=$!
echo "  ✅ Started simulator 3 (PID: $PID_3, interval: ${INTERVAL_3}s)"
sleep 0.5

python3 "$SCRIPT_FILE" --device-id "$DEVICE_4" --interval "$INTERVAL_4" &
PID_4=$!
echo "  ✅ Started simulator 4 (PID: $PID_4, interval: ${INTERVAL_4}s)"
sleep 0.5

python3 "$SCRIPT_FILE" --device-id "$DEVICE_5" --interval "$INTERVAL_5" &
PID_5=$!
echo "  ✅ Started simulator 5 (PID: $PID_5, interval: ${INTERVAL_5}s)"

echo ""
echo "✅ All 5 simulators started!"
echo "📊 Subscribe to see data: mosquitto_sub -h localhost -t 'energy/#' -u admin -P Pltsapp2026**"
echo "📝 PIDs: $PID_1 $PID_2 $PID_3 $PID_4 $PID_5"
echo "🛑 To stop all: kill $PID_1 $PID_2 $PID_3 $PID_4 $PID_5"

# Wait for all background processes
wait
