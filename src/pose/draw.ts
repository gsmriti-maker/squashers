import type { PoseFrame } from "../types";
import { LM } from "./geometry";

const INK = "#f4efe2";
const GOOD = "#3dbe6e";
const BAD = "#ff5a3c";

type XY = { x: number; y: number };

function contentRect(videoWidth: number, videoHeight: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / videoWidth, boxH / videoHeight);
  const w = videoWidth * scale;
  const h = videoHeight * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

export function drawPose(canvas: HTMLCanvasElement, video: HTMLVideoElement, frame: PoseFrame | null) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const dpr = window.devicePixelRatio || 1;
  const boxW = canvas.clientWidth;
  const boxH = canvas.clientHeight;
  if (boxW < 2 || boxH < 2) return;
  const pixelW = Math.round(boxW * dpr);
  const pixelH = Math.round(boxH * dpr);
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, boxW, boxH);
  if (!frame?.points || video.videoWidth < 2 || video.videoHeight < 2) return;

  const rect = contentRect(video.videoWidth, video.videoHeight, boxW, boxH);
  const map = (index: number): XY | null => {
    const point = frame.points?.[index];
    if (!point || point.v < 0.3) return null;
    return { x: rect.x + point.x * rect.w, y: rect.y + point.y * rect.h };
  };

  const leftShoulder = map(LM.lShoulder);
  const rightShoulder = map(LM.rShoulder);
  const leftHip = map(LM.lHip);
  const rightHip = map(LM.rHip);
  const torso =
    leftShoulder && rightShoulder && leftHip && rightHip
      ? Math.hypot((leftShoulder.x + rightShoulder.x) / 2 - (leftHip.x + rightHip.x) / 2, (leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2)
      : 70;
  const width = Math.max(3.5, torso * 0.075);

  const colorOf = (mark: PoseFrame["arm"]) => (mark === "good" ? GOOD : mark === "bad" ? BAD : INK);
  const arm = colorOf(frame.arm);
  const legs = colorOf(frame.legs);
  const hand = colorOf(frame.hand);
  const racketLeft = frame.racket === "left";

  const bones: [number, number, string][] = [
    [LM.lShoulder, LM.rShoulder, INK],
    [LM.lShoulder, LM.lHip, INK],
    [LM.rShoulder, LM.rHip, INK],
    [LM.lHip, LM.rHip, INK],
    [LM.lShoulder, LM.lElbow, racketLeft ? arm : INK],
    [LM.lElbow, LM.lWrist, racketLeft ? arm : INK],
    [LM.rShoulder, LM.rElbow, racketLeft ? INK : arm],
    [LM.rElbow, LM.rWrist, racketLeft ? INK : arm],
    [LM.lHip, LM.lKnee, legs],
    [LM.lKnee, LM.lAnkle, legs],
    [LM.rHip, LM.rKnee, legs],
    [LM.rKnee, LM.rAnkle, legs],
  ];

  const segment = (a: XY, b: XY, color: string) => {
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineCap = "round";
    context.strokeStyle = "rgba(12, 10, 8, 0.72)";
    context.lineWidth = width + 4;
    context.stroke();
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  };

  for (const [from, to, color] of bones) {
    const a = map(from);
    const b = map(to);
    if (a && b) segment(a, b, color);
  }

  if (leftShoulder && rightShoulder) {
    const neck = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const radius = Math.max(8, torso * 0.32);
    context.beginPath();
    context.arc(neck.x, neck.y - radius * 1.15, radius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(12, 10, 8, 0.72)";
    context.lineWidth = width + 4;
    context.stroke();
    context.strokeStyle = INK;
    context.lineWidth = width;
    context.stroke();
  }

  const wristIndex = racketLeft ? LM.lWrist : LM.rWrist;
  const wrist = map(wristIndex);
  if (wrist && frame.phase !== "idle") {
    context.beginPath();
    context.arc(wrist.x, wrist.y, Math.max(5, width * 0.85), 0, Math.PI * 2);
    context.fillStyle = hand;
    context.fill();
  }
}
