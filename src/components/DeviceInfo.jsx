import React, { useState } from 'react';

function DeviceInfo({ deviceName, batteryLevel, deviceInfo, sensorLocation }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasExtendedInfo = deviceInfo && (
    deviceInfo.manufacturer ||
    deviceInfo.model ||
    deviceInfo.serial ||
    deviceInfo.hardwareRevision ||
    deviceInfo.firmwareRevision ||
    deviceInfo.softwareRevision ||
    sensorLocation
  );

  return (
    <div className="device-info-section">
      <div className="device-info-grid">
        <div className="device-info-item">
          <span className="device-info-label">Device:</span>
          <span className="device-info-value">{deviceName}</span>
        </div>
        {batteryLevel !== null && (
          <div className="device-info-item">
            <span className="device-info-label">Battery:</span>
            <span className="device-info-value">{batteryLevel}%</span>
          </div>
        )}
      </div>

      {hasExtendedInfo && (
        <>
          <button
            className="device-info-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼' : '▶'} {isExpanded ? 'Hide' : 'Show'} Details
          </button>

          {isExpanded && (
            <div className="device-info-extended">
              {sensorLocation && (
                <div className="device-info-row">
                  <span className="device-info-row-label">Sensor Location:</span>
                  <span className="device-info-row-value">{sensorLocation}</span>
                </div>
              )}
              {deviceInfo?.manufacturer && (
                <div className="device-info-row">
                  <span className="device-info-row-label">Manufacturer:</span>
                  <span className="device-info-row-value">{deviceInfo.manufacturer}</span>
                </div>
              )}
              {deviceInfo?.model && (
                <div className="device-info-row">
                  <span className="device-info-row-label">Model:</span>
                  <span className="device-info-row-value">{deviceInfo.model}</span>
                </div>
              )}
              {deviceInfo?.serial && (
                <div className="device-info-row">
                  <span className="device-info-row-label">Serial Number:</span>
                  <span className="device-info-row-value">{deviceInfo.serial}</span>
                </div>
              )}
              {deviceInfo?.firmwareRevision && (
                <div className="device-info-row">
                  <span className="device-info-row-label">Firmware:</span>
                  <span className="device-info-row-value">{deviceInfo.firmwareRevision}</span>
                </div>
              )}
              {deviceInfo?.hardwareRevision && (
                <div className="device-info-row">
                  <span className="device-info-row-label">Hardware:</span>
                  <span className="device-info-row-value">{deviceInfo.hardwareRevision}</span>
                </div>
              )}
              {deviceInfo?.softwareRevision && (
                <div className="device-info-row">
                  <span className="device-info-row-label">Software:</span>
                  <span className="device-info-row-value">{deviceInfo.softwareRevision}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DeviceInfo;
