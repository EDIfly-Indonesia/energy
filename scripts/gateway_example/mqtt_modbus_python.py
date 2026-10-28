import time
import json
import paho.mqtt.client as mqtt
from pymodbus.client import ModbusTcpClient

# Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC = "energy/tenant1/site1/inverter1/telemetry"

MODBUS_IP = "192.168.1.10"
MODBUS_PORT = 502

def run_gateway():
    # Setup MQTT
    client = mqtt.Client()
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    # Setup Modbus
    modbus = ModbusTcpClient(MODBUS_IP, port=MODBUS_PORT)
    
    print("Gateway running...")
    
    try:
        while True:
            if modbus.connect():
                # Read holding register 40001 (Example)
                result = modbus.read_holding_registers(address=0, count=2, slave=1)
                if not result.isError():
                    data = {
                        "timestamp": time.time(),
                        "power": result.registers[0],
                        "voltage": result.registers[1]
                    }
                    client.publish(TOPIC, json.dumps(data))
                    print(f"Sent: {data}")
                modbus.close()
            
            time.sleep(5)
    except KeyboardInterrupt:
        client.loop_stop()
        modbus.close()

if __name__ == "__main__":
    run_gateway()
