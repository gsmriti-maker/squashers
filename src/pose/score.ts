import type { Analysis, Mark, Phase, Point, PoseFrame, StrokeId } from "../types";
import type { Features, Side } from "./geometry";
import { writeSummary, type Issue } from "./feedback";
import { FEATURE_WEIGHT, PHASE_WEIGHT, TEMPLATES, type PhaseTargets } from "./templates";

export const CONTACT_HALF = 0.1;
export const MIN_PEAK_SPEED = 0.4;
const MARK_AT = 0.72;

export type SeriesFrame = Features & {
  t: number;
  points: Point[] | null;
};

export type SeriesInput = {
  frames: SeriesFrame[];
  speeds: number[];
  stroke: StrokeId;
  clipped?: boolean;
  coverage?: number;
  racketBalance?: number;
};

export function featureScore(value: number, ideal: number, tolerance: number): number {
  const delta = Math.abs(value - ideal);
  if (delta <= tolerance) return 1;
  return Math.max(0, 1 - (delta - tolerance) / (tolerance * 1.75));
}

export function phaseAt(t: number, swing: { start: number; peak: number; end: number } | null): Phase {
  if (!swing || t < swing.start || t > swing.end) return "idle";
  if (t < swing.peak - CONTACT_HALF) return "prep";
  if (t > swing.peak + CONTACT_HALF) return "follow";
  return "contact";
}

export const PHASE_LABEL: Record<Phase, string> = {
  idle: "Outside the swing",
  prep: "Preparation",
  contact: "Contact",
  follow: "Follow-through",
};

export function frameAt(frames: PoseFrame[], time: number): PoseFrame | null {
  if (frames.length === 0) return null;
  let best = frames[0];
  let bestDistance = Math.abs(frames[0].t - time);
  for (const frame of frames) {
    const distance = Math.abs(frame.t - time);
    if (distance < bestDistance) {
      best = frame;
      bestDistance = distance;
    }
  }
  return best;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function smoothSpeeds(speeds: number[]): number[] {
  return speeds.map((_, index) => {
    const window = speeds.slice(Math.max(0, index - 1), index + 2).filter((value) => value > 0);
    if (window.length === 0) return 0;
    return median(window);
  });
}

function markFor(score: number | null): Mark {
  if (score == null) return "neutral";
  return score >= MARK_AT ? "good" : "bad";
}

function poseFrames(
  frames: SeriesFrame[],
  swing: { start: number; peak: number; end: number } | null,
  racket: Side | null,
  targets: { prep: PhaseTargets; contact: PhaseTargets; follow: PhaseTargets },
): PoseFrame[] {
  return frames.map((frame) => {
    const phase = phaseAt(frame.t, swing);
    const phaseTargets = phase === "idle" ? null : targets[phase];
    const elbow = phaseTargets && frame.elbow != null ? featureScore(frame.elbow, phaseTargets.elbow.ideal, phaseTargets.elbow.tolerance) : null;
    const knee = phaseTargets && frame.knee != null ? featureScore(frame.knee, phaseTargets.knee.ideal, phaseTargets.knee.tolerance) : null;
    const wrist =
      phaseTargets && frame.wristHeight != null
        ? featureScore(frame.wristHeight, phaseTargets.wristHeight.ideal, phaseTargets.wristHeight.tolerance)
        : null;
    return {
      t: frame.t,
      points: frame.points,
      phase,
      racket,
      arm: markFor(elbow),
      hand: markFor(wrist),
      legs: markFor(knee),
    };
  });
}

export function analyzeSeries(input: SeriesInput): Analysis {
  const template = TEMPLATES[input.stroke];
  const speeds = smoothSpeeds(input.speeds);
  let peak = 0;
  let peakIndex = -1;
  speeds.forEach((speed, index) => {
    if (speed > peak && input.frames[index]?.elbow != null) {
      peak = speed;
      peakIndex = index;
    }
  });

  const warnings: string[] = [];
  if (input.clipped) warnings.push("Only the first 15 seconds were read. Upload a clip that is one swing.");
  if ((input.coverage ?? 1) < 0.45) {
    warnings.push("A lot of the clip has no readable body. Keep your head, feet, and racket inside the frame.");
  }
  if (input.racketBalance != null && input.racketBalance < 0.62) {
    warnings.push("Both arms move a similar amount, so the racket arm is a guess. Swing one arm, side-on.");
  }

  const idle = poseFrames(input.frames, null, input.frames.find((frame) => frame.racket)?.racket ?? null, template);

  if (peak < MIN_PEAK_SPEED || peakIndex < 0) {
    return {
      score: null,
      summary: "No clear swing showed up. Upload one full stroke, filmed side-on, with your whole body in frame.",
      warnings,
      frames: idle,
      swing: null,
    };
  }

  let start = peakIndex;
  while (start > 0 && speeds[start - 1] >= peak * 0.35) start -= 1;
  let end = peakIndex;
  while (end < speeds.length - 1 && speeds[end + 1] >= peak * 0.35) end += 1;

  let startT = input.frames[start].t;
  let endT = input.frames[end].t;
  const peakT = input.frames[peakIndex].t;
  if (endT - startT < 0.28) {
    startT = Math.max(input.frames[0]?.t ?? startT, peakT - 0.22);
    endT = Math.min(input.frames[input.frames.length - 1]?.t ?? endT, peakT + 0.28);
  }
  const swing = { start: startT, peak: peakT, end: endT };
  const racket = input.frames[peakIndex]?.racket ?? null;
  const painted = poseFrames(input.frames, swing, racket, template);

  const phased = input.frames.map((frame) => ({ ...frame, phase: phaseAt(frame.t, swing) }));
  const extras: string[] = [];
  let weighted = 0;
  let weightSum = 0;
  const issues: Issue[] = [];

  for (const phase of ["prep", "contact", "follow"] as const) {
    const bucket = phased.filter((frame) => frame.phase === phase);
    const targets = template[phase];
    let phaseWeighted = 0;
    let phaseWeight = 0;
    for (const feature of ["elbow", "knee", "wristHeight"] as const) {
      const values = bucket.map((frame) => frame[feature]).filter((value): value is number => value != null);
      if (values.length === 0) continue;
      const value = median(values);
      const target = targets[feature];
      const score = featureScore(value, target.ideal, target.tolerance);
      const weight = FEATURE_WEIGHT[feature];
      phaseWeighted += score * weight;
      phaseWeight += weight;
      if (score < MARK_AT) {
        issues.push({
          phase,
          feature,
          direction: value < target.ideal ? "low" : "high",
          score,
        });
      }
    }
    if (phaseWeight === 0) {
      if (phase === "prep") extras.push("Preparation was hard to read, so the score leans on contact and the finish.");
      if (phase === "follow") extras.push("The finish was hard to read, so the score leans on preparation and contact.");
      continue;
    }
    weighted += (phaseWeighted / phaseWeight) * PHASE_WEIGHT[phase];
    weightSum += PHASE_WEIGHT[phase];
  }

  const contactElbow = phased.some((frame) => frame.phase === "contact" && frame.elbow != null);
  if (!contactElbow || weightSum === 0) {
    return {
      score: null,
      summary: "The racket arm was not visible around contact. Keep the whole arm in frame, side-on.",
      warnings,
      frames: painted,
      swing,
    };
  }

  const swingFrames = phased.filter((frame) => frame.phase !== "idle");
  const kneeSeen = swingFrames.filter((frame) => frame.knee != null).length;
  if (swingFrames.length > 0 && kneeSeen / swingFrames.length < 0.4) {
    warnings.push("Your legs were hard to see, so knee bend barely affects the score.");
  }

  const score = Math.round((weighted / weightSum) * 100);
  issues.sort((a, b) => a.score - b.score);
  const notable = issues.filter((issue) => issue.score < MARK_AT).slice(0, 2);

  return {
    score,
    summary: writeSummary(input.stroke, score, notable, extras),
    warnings,
    frames: painted,
    swing,
  };
}
