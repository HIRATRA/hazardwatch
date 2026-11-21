/** Splits alerts by user, keeping their order. */
export function groupByUser<Alert extends { userId: string }>(alerts: readonly Alert[]): Alert[][] {
  const groups = new Map<string, Alert[]>();
  for (const alert of alerts) {
    const group = groups.get(alert.userId);
    if (group) {
      group.push(alert);
    } else {
      groups.set(alert.userId, [alert]);
    }
  }
  return [...groups.values()];
}
