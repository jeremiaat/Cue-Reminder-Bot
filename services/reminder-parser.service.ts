import * as chrono from "chrono-node";

export interface ParsedReminder {
  task: string | null;
  remindAt: Date | null;
  detectedTimeText: string | null;
}

const PREFIX_PATTERN =
  /^(?:remind me to|remind me|set a reminder to|set a reminder|remember me to|remember to|please remind me to|please remind me)\b/i;

const COMMAND_FRAGMENTS = [
  "remind me to",
  "remind me",
  "set a reminder to",
  "set a reminder",
  "remember me to",
  "remember to",
  "please remind me to",
  "please remind me",
  "remind me at",
];

// Common misspellings of date/time words. chrono-node doesn't understand
// typos, so we correct them before parsing so users can type freely.
const TYPO_FIXES: Array<[RegExp, string]> = [
  [/\btommorrow\b/gi, "tomorrow"],
  [/\btomorow\b/gi, "tomorrow"],
  [/\btommorow\b/gi, "tomorrow"],
  [/\btomoro\b/gi, "tomorrow"],
  [/\btoday\b/gi, "today"],
  [/\btmrw\b/gi, "tomorrow"],
  [/\bto-night\b/gi, "tonight"],
  [/\btnite\b/gi, "tonight"],
  [/\bmonday\b/gi, "Monday"],
  [/\btuesday\b/gi, "Tuesday"],
  [/\bwednesday\b/gi, "Wednesday"],
  [/\bthursday\b/gi, "Thursday"],
  [/\bfriday\b/gi, "Friday"],
  [/\bsaturday\b/gi, "Saturday"],
  [/\bsunday\b/gi, "Sunday"],
  [/\bjanuary\b/gi, "January"],
  [/\bfebruary\b/gi, "February"],
  [/\bmarch\b/gi, "March"],
  [/\bapril\b/gi, "April"],
  [/\bmay\b/gi, "May"],
  [/\bjune\b/gi, "June"],
  [/\bjuly\b/gi, "July"],
  [/\baugust\b/gi, "August"],
  [/\bseptember\b/gi, "September"],
  [/\boctober\b/gi, "October"],
  [/\bnovember\b/gi, "November"],
  [/\bdecember\b/gi, "December"],
];

function normalizeTypos(text: string): string {
  let fixed = text;
  for (const [pattern, replacement] of TYPO_FIXES) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

function stripPrefix(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(PREFIX_PATTERN, "");
  return cleaned.trim();
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/^\s*[,-]\s*/, "")
    .trim();
}

/**
 * Parse a natural-language reminder message into a task and a reminder time.
 */
export function parseReminder(text: string): ParsedReminder {
  // Fix common typos first so chrono can recognize date/time words.
  const normalized = normalizeTypos(text);

  // Parse with chrono using forward-date handling so relative times point forward.
  const results = chrono.parse(normalized, new Date(), { forwardDate: true });
  if (results.length === 0) {
    // No time expression found — but still try to extract a task phrase.
    return {
      task: cleanTask(stripPrefix(normalizeText(normalized))),
      remindAt: null,
      detectedTimeText: null,
    };
  }

  // Use the first (chrono sorts by start index) time result.
  const timeResult = results[0];
  const detect = timeResult.text;
  const date = timeResult.start.date();
  const detectStart = timeResult.index;
  const detectLength = detect.length;

  // Reconstruct the task by removing the detected time span from the source.
  const task = cleanTaskFromSource(normalized, detectStart, detectLength);
  const detectedTimeText = detect;

  if (!date) {
    return { task, remindAt: null, detectedTimeText };
  }

  return { task, remindAt: date, detectedTimeText };
}

function cleanTaskFromSource(text: string, detectStart: number, detectLength: number): string {
  // Cut out the detected time expression by its index/length, then strip prefixes
  // and any leftover connectors.
  const before = text.slice(0, detectStart);
  const after = text.slice(detectStart + detectLength);
  let task = `${before} ${after}`.trim();
  task = stripPrefix(task);
  task = task
    .replace(/\s+/g, " ")
    .replace(/[,\-;:]\s*$/g, "")
    .replace(/^,\s*/, "")
    .trim();

  return cleanTask(task);
}

function cleanTask(task: string): string {
  let cleaned = normalizeText(task);

  // Remove command fragments that may appear mid-sentence.
  for (const frag of COMMAND_FRAGMENTS) {
    cleaned = cleaned.replace(new RegExp(`\\b${frag}\\b`, "i"), " ").trim();
  }

  cleaned = cleaned
    .replace(/\s+/g, " ")
    .replace(/^[,\-;:\s]+/, "")
    .replace(/[,\-;:]\s*$/, "")
    .replace(/\s+(?:on|at|for|in|by)\s*$/, "")
    .replace(/\s+(?:at this time|this time|at the same time|the same time|same time)\s*$/i, "")
    .trim();

  return capitalize(cleaned);
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
