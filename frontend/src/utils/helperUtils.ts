export function timeSinceFormatted(date: Date): string {
  const now = new Date();
  const diffMs: number = now.getTime() - date.getTime();

  const diffMinutes: number = Math.floor(diffMs / (1000 * 60));
  const hours: number = Math.floor(diffMinutes / 60);
  const minutes: number = diffMinutes % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}h`;
  } else {
    return `00:${String(minutes).padStart(2, '0')}m`;
  }
}
