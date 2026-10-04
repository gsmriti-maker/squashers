import type { Attempt, Hand, StrokeId } from "./types";

const HAND_KEY = "squashers.hand";
const YOUTUBE_KEY = "squashers.youtube";
const ATTEMPTS_KEY = "squashers.attempts";

export type YoutubeMap = Partial<Record<StrokeId, string>>;
export type AttemptMap = Partial<Record<StrokeId, Attempt>>;

export function loadHand(): Hand | null {
  try {
    const value = localStorage.getItem(HAND_KEY);
    return value === "right" || value === "left" ? value : null;
  } catch {
    return null;
  }
}

export function saveHand(hand: Hand) {
  localStorage.setItem(HAND_KEY, hand);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadYoutube(): YoutubeMap {
  return readJson<YoutubeMap>(YOUTUBE_KEY, {});
}

export function saveYoutube(map: YoutubeMap) {
  localStorage.setItem(YOUTUBE_KEY, JSON.stringify(map));
}

export function loadAttempts(): AttemptMap {
  return readJson<AttemptMap>(ATTEMPTS_KEY, {});
}

export function saveAttempts(map: AttemptMap) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(map));
}
