// Web Bluetooth Heart Rate Service and Characteristic UUIDs
const HEART_RATE_SERVICE_UUID = 0x180D;
const HEART_RATE_MEASUREMENT_CHAR_UUID = 0x2A37;

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

  // Contact detected (optional)
  const contactDetected = flags & 0x2;
  const contactSensorPresent = flags & 0x4;
  if (contactSensorPresent) {
    result.contactDetected = !!contactDetected;
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
      rrIntervals.push(data.getUint16(index, true));
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
      optionalServices: [HEART_RATE_SERVICE_UUID]
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
