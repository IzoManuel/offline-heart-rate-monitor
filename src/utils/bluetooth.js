// Web Bluetooth Heart Rate Service and Characteristic UUIDs
const HEART_RATE_SERVICE_UUID = 0x180D;
const HEART_RATE_MEASUREMENT_CHAR_UUID = 0x2A37;
const BODY_SENSOR_LOCATION_CHAR_UUID = 0x2A38;

// Battery Service UUIDs
const BATTERY_SERVICE_UUID = 0x180F;
const BATTERY_LEVEL_CHAR_UUID = 0x2A19;

// Device Information Service UUIDs
const DEVICE_INFO_SERVICE_UUID = 0x180A;
const MANUFACTURER_NAME_CHAR_UUID = 0x2A29;
const MODEL_NUMBER_CHAR_UUID = 0x2A24;
const SERIAL_NUMBER_CHAR_UUID = 0x2A25;
const HARDWARE_REVISION_CHAR_UUID = 0x2A27;
const FIRMWARE_REVISION_CHAR_UUID = 0x2A26;
const SOFTWARE_REVISION_CHAR_UUID = 0x2A28;

/**
 * Parse heart rate measurement data according to Bluetooth Heart Rate Profile
 * @param {DataView} data - The heart rate measurement data
 * @returns {Object} Parsed heart rate data
 */
export function parseHeartRate(data) {
  const flags = data.getUint8(0);
  const rate16Bits = flags & 0x1;
  const result = {};
  let index = 1;

  // Heart rate value (8-bit or 16-bit)
  if (rate16Bits) {
    result.heartRate = data.getUint16(index, true); // little-endian
    index += 2;
  } else {
    result.heartRate = data.getUint8(index);
    index += 1;
  }


  // Energy expended (optional)
  const energyPresent = flags & 0x8;
  if (energyPresent) {
    result.energyExpended = data.getUint16(index, true);
    index += 2;
  }

  // RR-Intervals (optional, for HRV analysis in future)
  const rrIntervalPresent = flags & 0x10;
  if (rrIntervalPresent) {
    const rrIntervals = [];
    for (; index + 1 < data.byteLength; index += 2) {
      // Bluetooth HRS encodes RR-Interval in 1/1024-second units.
      rrIntervals.push(data.getUint16(index, true) * 1000 / 1024);
    }
    result.rrIntervals = rrIntervals;
  }

  return result;
}

/**
 * Connect to a heart rate monitor device
 * @returns {Promise<BluetoothRemoteGATTServer>} Connected GATT server
 */
export async function connectToHeartRateMonitor() {
  if (!navigator.bluetooth) {
    const errorMsg = 'Web Bluetooth API is not available in this browser. ' +
      'Please use Chrome or Edge. ' +
      'On Linux, you may need to enable it at chrome://flags#enable-experimental-web-platform-features';
    throw new Error(errorMsg);
  }

  try {
    // Request device with heart rate service
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE_UUID] }],
      optionalServices: [HEART_RATE_SERVICE_UUID, BATTERY_SERVICE_UUID, DEVICE_INFO_SERVICE_UUID]
    });

    // Connect to GATT server
    const server = await device.gatt.connect();
    return server;
  } catch (error) {
    if (error.name === 'NotFoundError') {
      throw new Error('No heart rate monitor found. Please make sure your device is turned on and in pairing mode.');
    }
    throw error;
  }
}

/**
 * Start listening for heart rate notifications
 * @param {BluetoothRemoteGATTServer} server - Connected GATT server
 * @param {Function} callback - Callback function to receive heart rate data
 * @returns {Promise<BluetoothRemoteGATTCharacteristic>} The characteristic being monitored
 */
export async function startHeartRateNotifications(server, callback) {
  // Get heart rate service
  const service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);

  // Get heart rate measurement characteristic
  const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT_CHAR_UUID);

  // Start notifications
  await characteristic.startNotifications();

  // Add event listener for heart rate changes
  characteristic.addEventListener('characteristicvaluechanged', (event) => {
    const value = event.target.value;
    const heartRateData = parseHeartRate(value);
    callback(heartRateData);
  });

  return characteristic;
}

/**
 * Stop heart rate notifications
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The characteristic to stop
 */
export async function stopHeartRateNotifications(characteristic) {
  if (characteristic) {
    await characteristic.stopNotifications();
  }
}

/**
 * Disconnect from the device
 * @param {BluetoothRemoteGATTServer} server - The GATT server to disconnect
 */
export function disconnectDevice(server) {
  if (server && server.connected) {
    server.disconnect();
  }
}

/**
 * Read battery level from the device
 * @param {BluetoothRemoteGATTServer} server - Connected GATT server
 * @returns {Promise<number|null>} Battery level percentage (0-100) or null if not available
 */
export async function readBatteryLevel(server) {
  if (!server || !server.connected) {
    return null;
  }

  try {
    // Get battery service
    const service = await server.getPrimaryService(BATTERY_SERVICE_UUID);

    // Get battery level characteristic
    const characteristic = await service.getCharacteristic(BATTERY_LEVEL_CHAR_UUID);

    // Read battery level
    const value = await characteristic.readValue();
    const batteryLevel = value.getUint8(0);

    return batteryLevel;
  } catch (error) {
    // Battery service not available on this device
    console.log('Battery service not available:', error.message);
    return null;
  }
}

/**
 * Read body sensor location from the device
 * @param {BluetoothRemoteGATTServer} server - Connected GATT server
 * @returns {Promise<string|null>} Body sensor location or null if not available
 */
export async function readBodySensorLocation(server) {
  if (!server || !server.connected) {
    return null;
  }

  const locationMap = {
    0: 'Other',
    1: 'Chest',
    2: 'Wrist',
    3: 'Finger',
    4: 'Hand',
    5: 'Ear Lobe',
    6: 'Foot'
  };

  try {
    // Get heart rate service
    const service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);

    // Get body sensor location characteristic
    const characteristic = await service.getCharacteristic(BODY_SENSOR_LOCATION_CHAR_UUID);

    // Read body sensor location
    const value = await characteristic.readValue();
    const locationCode = value.getUint8(0);

    return locationMap[locationCode] || 'Unknown';
  } catch (error) {
    // Body sensor location not available on this device
    console.log('Body sensor location not available:', error.message);
    return null;
  }
}

/**
 * Helper function to read a string characteristic
 * @param {BluetoothRemoteGATTService} service - The service
 * @param {number} characteristicUUID - The characteristic UUID
 * @returns {Promise<string|null>} The string value or null
 */
async function readStringCharacteristic(service, characteristicUUID) {
  try {
    const characteristic = await service.getCharacteristic(characteristicUUID);
    const value = await characteristic.readValue();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(value);
  } catch (error) {
    return null;
  }
}

/**
 * Read device information from the device
 * @param {BluetoothRemoteGATTServer} server - Connected GATT server
 * @returns {Promise<Object>} Device information object
 */
export async function readDeviceInformation(server) {
  if (!server || !server.connected) {
    return {};
  }

  try {
    // Get device information service
    const service = await server.getPrimaryService(DEVICE_INFO_SERVICE_UUID);

    // Read all available characteristics
    const [manufacturer, model, serial, hardware, firmware, software] = await Promise.all([
      readStringCharacteristic(service, MANUFACTURER_NAME_CHAR_UUID),
      readStringCharacteristic(service, MODEL_NUMBER_CHAR_UUID),
      readStringCharacteristic(service, SERIAL_NUMBER_CHAR_UUID),
      readStringCharacteristic(service, HARDWARE_REVISION_CHAR_UUID),
      readStringCharacteristic(service, FIRMWARE_REVISION_CHAR_UUID),
      readStringCharacteristic(service, SOFTWARE_REVISION_CHAR_UUID)
    ]);

    return {
      manufacturer,
      model,
      serial,
      hardwareRevision: hardware,
      firmwareRevision: firmware,
      softwareRevision: software
    };
  } catch (error) {
    // Device information service not available
    console.log('Device information service not available:', error.message);
    return {};
  }
}
