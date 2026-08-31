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
  // Parse with chrono using forward-date handling so relative times point forward.
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (results.length === 0) {
    // No time expression found — but still try to extract a task phrase.
    return {
      task: cleanTask(stripPrefix(normalizeText(text))),
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
  const task = cleanTaskFromSource(text, detectStart, detectLength);
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
    .trim();

  return capitalize(cleaned);
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
