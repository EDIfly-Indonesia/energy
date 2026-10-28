#!/bin/bash

case "$1" in
  start)
    echo "🚀 Starting all MQTT services..."
    sudo systemctl start mqtt-gateway.service
    sudo systemctl start mqtt-influxdb-consumer.service
    ;;
  stop)
    echo "🛑 Stopping all MQTT services..."
    sudo systemctl stop mqtt-gateway.service
    sudo systemctl stop mqtt-influxdb-consumer.service
    pkill -f inverter_simulator.py
    ;;
  restart)
    echo "🔄 Restarting all MQTT services..."
    sudo systemctl restart mqtt-gateway.service
    sudo systemctl restart mqtt-influxdb-consumer.service
    ;;
  status)
    echo "📊 MQTT Services Status"
    echo "═══════════════════════════════════════════"
    sudo systemctl status mqtt-gateway.service --no-pager | grep -E "Active|Main PID"
    sudo systemctl status mqtt-influxdb-consumer.service --no-pager | grep -E "Active|Main PID"
    echo ""
    echo "🐍 Python Processes:"
    ps aux | grep -E "mqtt_|inverter_simulator" | grep -v grep | wc -l | xargs echo "  Total processes:"
    ;;
  logs)
    echo "📝 Last 20 lines of consumer log:"
    echo "─────────────────────────────────────────"
    tail -20 /opt/energy/applications/gateway/logs/mqtt-influxdb-consumer.log
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
