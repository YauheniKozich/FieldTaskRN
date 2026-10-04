export function remoteVersionWins(localUpdatedAt: string, remoteUpdatedAt: string): boolean {
  const localTime = Date.parse(localUpdatedAt);
  const remoteTime = Date.parse(remoteUpdatedAt);
  return Number.isFinite(remoteTime) && Number.isFinite(localTime) && remoteTime > localTime;
}
