import type { Hand, StrokeId } from "./types";

export type Lesson = {
  id: StrokeId;
  index: number;
  title: string;
  cue: string;
  youtubeId: string;
  watch: string;
};

export const LESSONS: Lesson[] = [
  {
    id: "forehand",
    index: 1,
    title: "Forehand drive",
    cue: "Racket up early, knees soft, contact out in front with a long arm, then a high finish.",
    youtubeId: "K5haeIzWzmI",
    watch: "Zero to Hero: Straight Drive",
  },
  {
    id: "backhand",
    index: 2,
    title: "Backhand drive",
    cue: "Turn the front shoulder in, keep the racket head up, and swing through to a high finish.",
    youtubeId: "VeZlNw68oSo",
    watch: "Beginner to Elite: backhand drive",
  },
  {
    id: "serve",
    index: 3,
    title: "Serve",
    cue: "A basic underarm serve: start low, meet the ball below the waist, and lift the follow-through.",
    youtubeId: "l0rimH_eOJ8",
    watch: "Zero to Hero: Serve & Return",
  },
  {
    id: "volley",
    index: 4,
    title: "Volley",
    cue: "Racket already up, a short punch in front of the body, and a compact finish.",
    youtubeId: "n0Y99KTPLQ8",
    watch: "Zero to Hero: Volley",
  },
  {
    id: "boast",
    index: 5,
    title: "Boast",
    cue: "Take the ball later and lower, open the racket face, and angle it into the side wall.",
    youtubeId: "XiF68Rddje4",
    watch: "Zero to Hero: Boast",
  },
];

export function lessonById(id: StrokeId): Lesson {
  const lesson = LESSONS.find((item) => item.id === id);
  if (!lesson) throw new Error(`Unknown stroke ${id}`);
  return lesson;
}

export function nextLesson(done: Partial<Record<StrokeId, unknown>>): StrokeId {
  return LESSONS.find((lesson) => done[lesson.id] == null)?.id ?? "forehand";
}

export function filmingNotes(hand: Hand, id: StrokeId): string[] {
  const forehand = hand === "right" ? "right" : "left";
  const backhand = hand === "right" ? "left" : "right";
  const side =
    id === "backhand"
      ? `Turn your ${backhand} side toward the camera.`
      : id === "volley" || id === "boast"
        ? "Turn the side you are hitting toward the camera."
        : `Turn your ${forehand} side toward the camera.`;
  return [
    "The swing should travel across the picture, side-on, not toward the lens.",
    side,
    "Keep your head, both feet, and the racket inside the frame.",
    "Set the camera about hip height.",
    "Record one swing, then stop.",
  ];
}
