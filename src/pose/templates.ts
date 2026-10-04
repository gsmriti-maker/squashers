import type { StrokeId } from "../types";

export type FeatureName = "elbow" | "knee" | "wristHeight";

export type Target = { ideal: number; tolerance: number };

export type PhaseTargets = Record<FeatureName, Target>;

export type StrokeTemplate = {
  prep: PhaseTargets;
  contact: PhaseTargets;
  follow: PhaseTargets;
};

const range = (ideal: number, tolerance: number): Target => ({ ideal, tolerance });

/**
 * Side-on coaching ranges for a modern, compact swing in the style of Peter Nicol.
 * These are a model, not motion capture of him.
 * Elbow and knee are interior joint angles in degrees (180 is straight).
 * wristHeight is hand position relative to torso: 0 at the shoulder, about -1 at the hip, positive above the shoulder.
 */
export const TEMPLATES: Record<StrokeId, StrokeTemplate> = {
  forehand: {
    prep: { elbow: range(105, 28), knee: range(148, 18), wristHeight: range(0.25, 0.45) },
    contact: { elbow: range(158, 20), knee: range(152, 18), wristHeight: range(-0.75, 0.45) },
    follow: { elbow: range(150, 25), knee: range(160, 18), wristHeight: range(0.45, 0.5) },
  },
  backhand: {
    prep: { elbow: range(90, 25), knee: range(148, 18), wristHeight: range(0.3, 0.45) },
    contact: { elbow: range(145, 22), knee: range(152, 18), wristHeight: range(-0.7, 0.45) },
    follow: { elbow: range(142, 25), knee: range(160, 18), wristHeight: range(0.35, 0.5) },
  },
  serve: {
    prep: { elbow: range(115, 30), knee: range(155, 18), wristHeight: range(-0.8, 0.5) },
    contact: { elbow: range(155, 22), knee: range(152, 18), wristHeight: range(-1.45, 0.45) },
    follow: { elbow: range(150, 25), knee: range(162, 18), wristHeight: range(0.15, 0.55) },
  },
  volley: {
    prep: { elbow: range(115, 25), knee: range(158, 16), wristHeight: range(0.15, 0.4) },
    contact: { elbow: range(138, 22), knee: range(160, 16), wristHeight: range(-0.15, 0.4) },
    follow: { elbow: range(142, 22), knee: range(162, 16), wristHeight: range(0.05, 0.35) },
  },
  boast: {
    prep: { elbow: range(100, 28), knee: range(148, 18), wristHeight: range(-0.15, 0.5) },
    contact: { elbow: range(132, 24), knee: range(150, 18), wristHeight: range(-1.25, 0.45) },
    follow: { elbow: range(128, 25), knee: range(156, 18), wristHeight: range(-0.25, 0.5) },
  },
};

export const FEATURE_WEIGHT: Record<FeatureName, number> = {
  elbow: 1.5,
  wristHeight: 1.3,
  knee: 0.7,
};

export const PHASE_WEIGHT = { prep: 0.25, contact: 0.55, follow: 0.2 } as const;

export const STROKE_NAME: Record<StrokeId, string> = {
  forehand: "forehand drive",
  backhand: "backhand drive",
  serve: "serve",
  volley: "volley",
  boast: "boast",
};
