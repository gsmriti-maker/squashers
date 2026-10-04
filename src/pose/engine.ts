import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { StrokeId } from "../types";
import { chooseRacket, featuresFrom, poseCoverage, toPoints, wristPoint, type Side } from "./geometry";
import { analyzeSeries, type SeriesFrame } from "./score";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

const SAMPLE_FPS = 12;
const MAX_SECONDS = 15;

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function createLandmarker(): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM);
  const base = {
    modelAssetPath: MODEL,
  };
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { ...base, delegate: "GPU" },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
    });
  } catch {
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: { ...base, delegate: "CPU" },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
    });
  }
}

function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker().catch((error: unknown) => {
      landmarkerPromise = null;
      const reason = error instanceof Error ? error.message : "unknown error";
      throw new Error(
        `The pose model couldn't be loaded (${reason}). Check your connection and try again. Your video stays on this computer either way.`,
      );
    });
  }
  return landmarkerPromise;
}

function seekTo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const target = Math.min(Math.max(0, time), Math.max(0, (video.duration || time) - 0.04));
    if (Math.abs(video.currentTime - target) < 0.001) {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      reject(new Error("The video stalled while being read. Try a shorter clip."));
    }, 5000);
    const onSeeked = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = target;
  });
}

async function nextFrame() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function speedsFor(frames: SeriesFrame[], racket: Side, aspect: number): number[] {
  const speeds = frames.map(() => 0);
  let prev: { x: number; y: number; v: number } | null = null;
  let prevT = 0;
  frames.forEach((frame, index) => {
    const wrist = frame.points ? wristPoint(frame.points, racket) : null;
    if (!wrist) return;
    if (prev) {
      const dt = frame.t - prevT;
      if (dt > 0.001 && dt < 0.25) speeds[index] = Math.hypot((wrist.x - prev.x) * aspect, wrist.y - prev.y) / dt;
    }
    prev = wrist;
    prevT = frame.t;
  });
  return speeds;
}

export async function analyzeVideo(
  video: HTMLVideoElement,
  stroke: StrokeId,
  onStatus: (status: string) => void,
  onProgress: (ratio: number) => void,
): Promise<ReturnType<typeof analyzeSeries>> {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error("This video has no readable length. Try another file.");
  }
  onStatus("Loading the pose model…");
  const landmarker = await getLandmarker();
  const duration = Math.min(video.duration, MAX_SECONDS);
  const step = 1 / SAMPLE_FPS;
  const times: number[] = [];
  for (let time = 0; time < duration - 0.02; time += step) times.push(time);
  if (times.length === 0) times.push(0);

  onStatus("Reading the swing…");
  const samples: { t: number; points: ReturnType<typeof toPoints> | null }[] = [];
  for (let index = 0; index < times.length; index += 1) {
    await seekTo(video, times[index]);
    await nextFrame();
    const result = landmarker.detect(video);
    const landmarks = result.landmarks[0];
    samples.push({ t: times[index], points: landmarks ? toPoints(landmarks) : null });
    onProgress((index + 1) / times.length);
  }

  const aspect = video.videoWidth / Math.max(1, video.videoHeight);
  const racket = chooseRacket(samples, aspect);
  const frames: SeriesFrame[] = samples.map((sample) => ({
    t: sample.t,
    points: sample.points,
    ...featuresFrom(sample.points, racket.side),
  }));

  return analyzeSeries({
    frames,
    speeds: speedsFor(frames, racket.side, aspect),
    stroke,
    clipped: video.duration > MAX_SECONDS + 0.05,
    coverage: poseCoverage(samples),
    racketBalance: racket.balance,
  });
}
