import type { Point } from "../types";

export type Side = "left" | "right";

export const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

export type Features = {
  elbow: number | null;
  knee: number | null;
  wristHeight: number | null;
  racket: Side | null;
};

export function toPoints(landmarks: { x: number; y: number; visibility?: number }[]): Point[] {
  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    v: landmark.visibility ?? 1,
  }));
}

export function angleDeg(a: Point, b: Point, c: Point): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag < 1e-6) return 180;
  const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function distIso(a: Point, b: Point, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function wristPoint(points: Point[], side: Side): Point | null {
  const point = points[side === "left" ? LM.lWrist : LM.rWrist];
  return point && point.v >= 0.4 ? point : null;
}

export function chooseRacket(samples: { points: Point[] | null }[], aspect: number): { side: Side; balance: number } {
  const path = { left: 0, right: 0 };
  const prev: Partial<Record<Side, Point>> = {};
  for (const sample of samples) {
    if (!sample.points) continue;
    for (const side of ["left", "right"] as const) {
      const wrist = wristPoint(sample.points, side);
      if (!wrist) continue;
      const before = prev[side];
      if (before) path[side] += distIso(before, wrist, aspect);
      prev[side] = wrist;
    }
  }
  const total = path.left + path.right;
  const side: Side = path.right >= path.left ? "right" : "left";
  return { side, balance: total > 0 ? path[side] / total : 1 };
}

/**
 * Elbow angle, the more bent knee, and racket-hand height.
 * wristHeight is (shoulderY - wristY) / torso. Positive means the hand is above the shoulder.
 */
export function featuresFrom(points: Point[] | null, racket: Side): Features {
  const empty: Features = { elbow: null, knee: null, wristHeight: null, racket: null };
  if (!points) return empty;
  const shoulder = points[racket === "left" ? LM.lShoulder : LM.rShoulder];
  const elbow = points[racket === "left" ? LM.lElbow : LM.rElbow];
  const wrist = points[racket === "left" ? LM.lWrist : LM.rWrist];
  const lHip = points[LM.lHip];
  const rHip = points[LM.rHip];
  const lSh = points[LM.lShoulder];
  const rSh = points[LM.rShoulder];
  if ([shoulder, elbow, wrist, lHip, rHip, lSh, rSh].some((point) => !point || point.v < 0.35)) {
    return { ...empty, knee: kneeAngle(points) };
  }
  const torso = dist(mid(lSh, rSh), mid(lHip, rHip));
  if (torso < 0.04) return { ...empty, knee: kneeAngle(points) };
  return {
    elbow: angleDeg(shoulder, elbow, wrist),
    knee: kneeAngle(points),
    wristHeight: (shoulder.y - wrist.y) / torso,
    racket,
  };
}

function kneeAngle(points: Point[]): number | null {
  const pairs = [
    [LM.lHip, LM.lKnee, LM.lAnkle],
    [LM.rHip, LM.rKnee, LM.rAnkle],
  ] as const;
  const angles: number[] = [];
  for (const [hip, knee, ankle] of pairs) {
    const a = points[hip];
    const b = points[knee];
    const c = points[ankle];
    if (a && b && c && a.v >= 0.35 && b.v >= 0.35 && c.v >= 0.35) {
      angles.push(angleDeg(a, b, c));
    }
  }
  if (angles.length === 0) return null;
  return Math.min(...angles);
}

export function poseCoverage(samples: { points: Point[] | null }[]): number {
  if (samples.length === 0) return 0;
  const visible = samples.filter((sample) => {
    if (!sample.points) return false;
    const keys = [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip, LM.lKnee, LM.rKnee];
    const present = keys.filter((index) => (sample.points?.[index]?.v ?? 0) >= 0.35).length;
    return present >= 4;
  }).length;
  return visible / samples.length;
}
