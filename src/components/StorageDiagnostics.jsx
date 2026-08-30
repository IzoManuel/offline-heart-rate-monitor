import React, { useCallback, useEffect, useState } from 'react';
import { countChartPoints } from '../utils/chartStorage';
import { formatStorageBytes, readStorageDiagnostics } from '../utils/storageDiagnostics';

function StorageDiagnostics() {
  const [details, setDetails] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const refresh = useCallback(async () => {
    const next = await readStorageDiagnostics({ countPoints: countChartPoints });
    setDetails(next);
    setUpdatedAt(new Date());
  }, []);
  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 30000); return () => window.clearInterval(timer); }, [refresh]);
  const usagePercent = details?.health.ratio === null || details?.health.ratio === undefined ? null : Math.round(details.health.ratio * 100);
  return <section className="storage-diagnostics" aria-labelledby="storage-diagnostics-heading">
    <div className="storage-diagnostics-heading"><div><h2 id="storage-diagnostics-heading">Storage Diagnostics</h2><p>Estimated browser storage used by this app.</p></div><button type="button" className="icon-button" onClick={refresh} aria-label="Refresh storage diagnostics" title="Refresh storage diagnostics">↻</button></div>
    {details ? <><div className="storage-health"><span className={`storage-health-dot ${details.health.tone}`} aria-hidden="true" /><strong>{details.health.label}</strong>{usagePercent !== null && <span>{usagePercent}% estimated</span>}</div><dl className="storage-diagnostics-list"><div><dt>Estimated Usage</dt><dd>{formatStorageBytes(details.usage)}</dd></div><div><dt>Estimated Quota</dt><dd>{formatStorageBytes(details.quota)}</dd></div><div><dt>Chart Points</dt><dd>{details.pointCount.toLocaleString()} / 10,000</dd></div></dl></> : <p role="status">Reading storage estimate…</p>}
    {updatedAt && <small>Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>}
  </section>;
}

export default StorageDiagnostics;
