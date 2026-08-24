import React from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';

function MetricSummary({
  currentHR,
  analysisResults,
  heartRateStats,
  rmssdExtrema,
  sdnnExtrema,
  brpmExtrema,
  deviceInfo,
  sensorLocation,
  includeDeviceDetails = false
}) {
  const hasDeviceDetails = includeDeviceDetails && deviceInfo && (
    deviceInfo.manufacturer || deviceInfo.model || deviceInfo.serial ||
    deviceInfo.hardwareRevision || deviceInfo.firmwareRevision ||
    deviceInfo.softwareRevision || sensorLocation
  );

  return (
    <>
      <div className="connection-summary-grid">
        <div className="connection-summary-item">
          <span>Heart Rate</span>
          <strong>{currentHR || '—'} <small>BPM</small></strong>
          <div className="summary-extrema">
            <span>Min {heartRateStats?.min || '—'} · {formatOccurrenceTime(heartRateStats?.minAt)}</span>
            <span>Average {heartRateStats?.average || '—'} BPM</span>
            <span>Max {heartRateStats?.max || '—'} · {formatOccurrenceTime(heartRateStats?.maxAt)}</span>
          </div>
        </div>
        <div className="connection-summary-item">
          <span>RMSSD</span>
          <strong>
            {analysisResults && !analysisResults.error ? analysisResults.rmssd.toFixed(1) : '—'} <small>ms</small>
          </strong>
          <div className="summary-extrema">
            <span>Min {rmssdExtrema ? rmssdExtrema.min.value.toFixed(1) : '—'} · {formatOccurrenceTime(rmssdExtrema?.min.occurredAt)}</span>
            <span>Average {Number.isFinite(rmssdExtrema?.average) ? rmssdExtrema.average.toFixed(1) : '—'} ms</span>
            <span>Max {rmssdExtrema ? rmssdExtrema.max.value.toFixed(1) : '—'} · {formatOccurrenceTime(rmssdExtrema?.max.occurredAt)}</span>
          </div>
        </div>
        <div className="connection-summary-item">
          <span>SDNN</span>
          <strong>
            {analysisResults && !analysisResults.error ? analysisResults.sdnn.toFixed(1) : '—'} <small>ms</small>
          </strong>
          <div className="summary-extrema">
            <span>Min {sdnnExtrema ? sdnnExtrema.min.value.toFixed(1) : '—'} · {formatOccurrenceTime(sdnnExtrema?.min.occurredAt)}</span>
            <span>Average {Number.isFinite(sdnnExtrema?.average) ? sdnnExtrema.average.toFixed(1) : '—'} ms</span>
            <span>Max {sdnnExtrema ? sdnnExtrema.max.value.toFixed(1) : '—'} · {formatOccurrenceTime(sdnnExtrema?.max.occurredAt)}</span>
          </div>
        </div>
        <div className="connection-summary-item">
          <span>BRPM</span>
          <strong>
            {analysisResults?.respiration?.available
              ? analysisResults.respiration.breathsPerMinute.toFixed(1)
              : '—'} <small>BRPM</small>
          </strong>
          <div className="summary-extrema">
            <span>Min {brpmExtrema ? brpmExtrema.min.value.toFixed(1) : '—'} · {formatOccurrenceTime(brpmExtrema?.min.occurredAt)}</span>
            <span>Average {Number.isFinite(brpmExtrema?.average) ? brpmExtrema.average.toFixed(1) : '—'} BRPM</span>
            <span>Max {brpmExtrema ? brpmExtrema.max.value.toFixed(1) : '—'} · {formatOccurrenceTime(brpmExtrema?.max.occurredAt)}</span>
          </div>
        </div>
      </div>

      {analysisResults && (
        <p className="connection-summary-caption">
          Updated {formatOccurrenceTime(analysisResults.analyzedAt)}
        </p>
      )}

      {hasDeviceDetails && (
        <div className="device-details-list">
          {sensorLocation && <div className="device-info-row"><span className="device-info-row-label">Sensor Location:</span><span className="device-info-row-value">{sensorLocation}</span></div>}
          {deviceInfo?.manufacturer && <div className="device-info-row"><span className="device-info-row-label">Manufacturer:</span><span className="device-info-row-value">{deviceInfo.manufacturer}</span></div>}
          {deviceInfo?.model && <div className="device-info-row"><span className="device-info-row-label">Model:</span><span className="device-info-row-value">{deviceInfo.model}</span></div>}
          {deviceInfo?.serial && <div className="device-info-row"><span className="device-info-row-label">Serial Number:</span><span className="device-info-row-value">{deviceInfo.serial}</span></div>}
          {deviceInfo?.firmwareRevision && <div className="device-info-row"><span className="device-info-row-label">Firmware:</span><span className="device-info-row-value">{deviceInfo.firmwareRevision}</span></div>}
          {deviceInfo?.hardwareRevision && <div className="device-info-row"><span className="device-info-row-label">Hardware:</span><span className="device-info-row-value">{deviceInfo.hardwareRevision}</span></div>}
          {deviceInfo?.softwareRevision && <div className="device-info-row"><span className="device-info-row-label">Software:</span><span className="device-info-row-value">{deviceInfo.softwareRevision}</span></div>}
        </div>
      )}
    </>
  );
}

export default MetricSummary;
