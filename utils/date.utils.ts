import { format } from "date-fns";

// Timezone is isolated here so it can later be replaced with per-user timezones.
// For now we use the server's default timezone.
export function formatReminderTime(date: Date): string {
  return format(date, "EEEE, h:mm a");
}

export function formatFullDate(date: Date): string {
  return format(date, "EEEE, MMM d 'at' h:mm a");
}
