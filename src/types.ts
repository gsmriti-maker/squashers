export type StrokeId = "forehand" | "backhand" | "serve" | "volley" | "boast";

export type Hand = "right" | "left";

export type Phase = "idle" | "prep" | "contact" | "follow";

export type Mark = "good" | "bad" | "neutral";

export type Point = { x: number; y: number; v: number };

export type PoseFrame = {
  t: number;
  points: Point[] | null;
  phase: Phase;
  racket: "left" | "right" | null;
  arm: Mark;
  hand: Mark;
  legs: Mark;
};

export type Analysis = {
  score: number | null;
  summary: string;
  warnings: string[];
  frames: PoseFrame[];
  swing: { start: number; peak: number; end: number } | null;
};

export type Attempt = {
  score: number;
  summary: string;
  at: string;
};
