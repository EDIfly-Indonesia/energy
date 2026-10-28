const mqtt = require('mqtt');
const ModbusRTU = require('modbus-serial');

// Configuration
const client = mqtt.connect('mqtt://localhost:1883');
const modbus = new ModbusRTU();

const TOPIC = 'energy/tenant1/site1/inverter1/telemetry';

async function runGateway() {
    await modbus.connectTCP('192.168.1.10', { port: 502 });
    modbus.setID(1);

    setInterval(async () => {
        try {
            const data = await modbus.readHoldingRegisters(0, 2);
            const payload = {
                timestamp: Date.now(),
                power: data.data[0],
                voltage: data.data[1]
            };
            client.publish(TOPIC, JSON.stringify(payload));
            console.log('Sent:', payload);
        } catch (err) {
            console.error('Modbus Error:', err);
        }
    }, 5000);
}

runGateway().catch(console.error);
