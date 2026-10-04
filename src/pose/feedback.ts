import type { StrokeId } from "../types";
import type { FeatureName } from "./templates";
import { STROKE_NAME } from "./templates";

export type Issue = {
  phase: "prep" | "contact" | "follow";
  feature: FeatureName;
  direction: "low" | "high";
  score: number;
};

const GENERIC: Record<string, string> = {
  "prep.elbow.low": "Preparation is cramped, with a very bent elbow. Let the arm open slightly so the racket can set.",
  "prep.elbow.high": "The racket arm starts too straight. Bend the elbow and get the racket head up before you swing.",
  "prep.knee.low": "You sink very deep before the swing. Stay athletic without dropping under the ball.",
  "prep.knee.high": "The knees stay straight in preparation. Soften them so you can push through the shot.",
  "prep.wristHeight.low": "The racket starts too low. Prepare with the head of the racket up.",
  "prep.wristHeight.high": "The racket starts very high. Set it nearer shoulder height so the swing can come down into the ball.",
  "contact.elbow.low": "At contact the arm is still bent. Lengthen through the ball.",
  "contact.elbow.high": "The elbow snaps rigid at contact. Stay long, with a little softness left.",
  "contact.knee.low": "You collapse low at contact. Keep a stable athletic height through the hit.",
  "contact.knee.high": "The legs are straight at contact. Keep the knees soft so the body stays balanced.",
  "contact.wristHeight.low": "Contact is low. Meet the ball higher, closer to waist height.",
  "contact.wristHeight.high": "Contact is high. Let the ball come down so you meet it in front, nearer waist height.",
  "follow.elbow.low": "The arm folds up after contact. Let it finish long.",
  "follow.elbow.high": "The follow-through locks the elbow. Finish long without snapping the joint straight.",
  "follow.knee.low": "You stay in a deep crouch after the hit. Rise enough to finish balanced.",
  "follow.knee.high": "You pop upright and stiff after contact. Stay grounded through the finish.",
  "follow.wristHeight.low": "The finish stays low. Let the racket continue upward after contact.",
  "follow.wristHeight.high": "The finish climbs very high. Swing through, then stop the racket under control.",
};

const SPECIFIC: Partial<Record<StrokeId, Record<string, string>>> = {
  serve: {
    "prep.wristHeight.high": "The serve starts too high. Begin with the racket down for an underarm swing.",
    "contact.wristHeight.high": "The serve meets the ball too high. Make contact below the waist.",
    "contact.wristHeight.low": "Serve contact is falling toward the floor. Keep it below the waist, and out in front of the front foot.",
    "follow.wristHeight.low": "The racket stops low after the serve. Lift the follow-through.",
  },
  volley: {
    "prep.wristHeight.low": "The volley racket is down. Have it up before the ball arrives.",
    "contact.elbow.low": "The volley arm is bunched up. Punch with a slightly bent, stable elbow.",
    "follow.wristHeight.high": "The volley finish is a full swing. Punch the ball and keep the follow-through short.",
  },
  boast: {
    "contact.wristHeight.high": "Boast contact is high. Take the ball later and lower so the racket can angle it into the side wall.",
    "contact.elbow.high": "The boast arm is locked straight. A slightly softer elbow makes the angle easier to hold.",
    "follow.wristHeight.high": "The boast finishes like a drive. Keep the finish lower, with the racket face open toward the side wall.",
  },
};

function lineFor(stroke: StrokeId, issue: Issue): string {
  const key = `${issue.phase}.${issue.feature}.${issue.direction}`;
  return SPECIFIC[stroke]?.[key] ?? GENERIC[key] ?? "One part of the swing sits away from the template.";
}

export function writeSummary(stroke: StrokeId, score: number, issues: Issue[], extra: string[]): string {
  const name = STROKE_NAME[stroke];
  const sentences: string[] = [];
  if (issues.length === 0) {
    sentences.push(
      score >= 85
        ? `This ${name} is close to the Peter Nicol–style template. Preparation, contact, and the finish all land in range.`
        : `This ${name} sits near the Peter Nicol–style template. Nothing is far off.`,
    );
  } else {
    sentences.push(
      score >= 85
        ? `This ${name} is close to the Peter Nicol–style template.`
        : score >= 65
          ? `This ${name} has the right shape, with a clear fix.`
          : `This ${name} is some distance from the Peter Nicol–style template.`,
    );
    for (const issue of issues.slice(0, 2)) sentences.push(lineFor(stroke, issue));
  }
  for (const note of extra.slice(0, 2)) sentences.push(note);
  return sentences.join(" ");
}
