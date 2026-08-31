// The bot's display timezone — fixed to Ethiopia (UTC+3).
// All reminder times are stored in UTC; this only controls how they're shown.
const BOT_TIME_ZONE = "Africa/Addis_Ababa";

interface TzPart {
  weekday: string;
  hour: string;
  minute: string;
  dayPeriod: string;
}

function parts(date: Date): TzPart {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: BOT_TIME_ZONE,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    p.find((x) => x.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    hour: get("hour"),
    minute: get("minute"),
    dayPeriod: get("dayPeriod").toLowerCase(),
  };
}

// e.g. "Monday, 10:22 pm"
export function formatReminderTime(date: Date): string {
  const { weekday, hour, minute, dayPeriod } = parts(date);
  return `${weekday}, ${hour}:${minute} ${dayPeriod}`;
}

// e.g. "Monday, Sep 1 at 10:22 pm"
export function formatFullDate(date: Date): string {
  const { weekday, hour, minute, dayPeriod } = parts(date);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: BOT_TIME_ZONE,
    month: "short",
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: BOT_TIME_ZONE,
    day: "numeric",
  }).format(date);
  return `${weekday}, ${month} ${day} at ${hour}:${minute} ${dayPeriod}`;
}

// Compact list style: "Sep 1 · 10:22 pm"
export function formatShortDate(date: Date): string {
  const { hour, minute, dayPeriod } = parts(date);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    timeZone: BOT_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
  return `${monthDay} · ${hour}:${minute} ${dayPeriod}`;
}

