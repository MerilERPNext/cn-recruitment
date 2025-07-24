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

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


export function formatDateString(dateString:string) {
  if (!dateString || isNaN(Date.parse(dateString))) return "Invalid date";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}