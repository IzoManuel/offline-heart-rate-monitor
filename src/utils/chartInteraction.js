export function latestInspectionIndex(pointCount, inspectionEnabled, followLatest) {
  return inspectionEnabled && followLatest && pointCount > 0 ? pointCount - 1 : null;
}
