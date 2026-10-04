import assert from "node:assert/strict";
import { angleDeg, type Point } from "./geometry";
import { analyzeSeries } from "./score";
import { TEMPLATES } from "./templates";
import { youtubeId } from "../youtube";

const rightAngleA: Point = { x: 0, y: 1, v: 1 };
const rightAngleB: Point = { x: 0, y: 0, v: 1 };
const rightAngleC: Point = { x: 1, y: 0, v: 1 };
assert.ok(Math.abs(angleDeg(rightAngleA, rightAngleB, rightAngleC) - 90) < 0.01);

assert.equal(youtubeId("K5haeIzWzmI"), "K5haeIzWzmI");
assert.equal(youtubeId("https://www.youtube.com/watch?v=l0rimH_eOJ8"), "l0rimH_eOJ8");
assert.equal(youtubeId("https://youtu.be/n0Y99KTPLQ8?t=12"), "n0Y99KTPLQ8");
assert.equal(youtubeId("https://www.youtube.com/shorts/XiF68Rddje4"), "XiF68Rddje4");
assert.equal(youtubeId("not a link"), null);

const template = TEMPLATES.forehand;
const times = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const speeds = [0.05, 0.2, 1, 1.5, 1.8, 2.4, 1.6, 1.1, 0.3, 0.05];

function phaseName(time: number): "prep" | "contact" | "follow" | "idle" {
  if (time < 0.2 || time > 0.7) return "idle";
  if (time < 0.4) return "prep";
  if (time > 0.6) return "follow";
  return "contact";
}

function series(contactElbow: number) {
  return times.map((time) => {
    const phase = phaseName(time);
    const target = phase === "idle" ? template.prep : template[phase];
    return {
      t: time,
      elbow: phase === "contact" ? contactElbow : target.elbow.ideal,
      knee: target.knee.ideal,
      wristHeight: target.wristHeight.ideal,
      racket: "right" as const,
      points: null,
    };
  });
}

const good = analyzeSeries({ frames: series(template.contact.elbow.ideal), speeds, stroke: "forehand", coverage: 1, racketBalance: 0.9 });
const bent = analyzeSeries({ frames: series(90), speeds, stroke: "forehand", coverage: 1, racketBalance: 0.9 });

assert.ok(good.score != null && good.score >= 90, `expected a high score, got ${good.score}: ${good.summary}`);
assert.ok(bent.score != null && good.score != null && bent.score < good.score, `bent ${bent.score} good ${good.score}`);
assert.match(bent.summary, /Lengthen through the ball/);
assert.equal(bent.frames.find((frame) => frame.t === 0.5)?.arm, "bad");
assert.equal(good.frames.find((frame) => frame.t === 0.5)?.arm, "good");

const still = analyzeSeries({
  frames: times.map((time) => ({ t: time, elbow: 90, knee: 170, wristHeight: 0, racket: "right" as const, points: null })),
  speeds: times.map(() => 0.05),
  stroke: "forehand",
});
assert.equal(still.score, null);
assert.match(still.summary, /No clear swing/);

console.log(`score check ok (good ${good.score}, bent arm ${bent.score})`);
