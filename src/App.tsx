import { useState } from "react";
import { LessonView } from "./LessonView";
import { LESSONS, nextLesson } from "./lessons";
import { loadAttempts, loadHand, loadYoutube, saveAttempts, saveHand, saveYoutube, type AttemptMap, type YoutubeMap } from "./storage";
import type { Hand, StrokeId } from "./types";

export function App() {
  const [hand, setHand] = useState<Hand | null>(() => loadHand());
  const [attempts, setAttempts] = useState<AttemptMap>(() => loadAttempts());
  const [youtube, setYoutube] = useState<YoutubeMap>(() => loadYoutube());
  const [lessonId, setLessonId] = useState<StrokeId>(() => nextLesson(loadAttempts()));

  if (!hand) {
    return (
      <HandGate
        onChoose={(choice) => {
          saveHand(choice);
          setHand(choice);
        }}
      />
    );
  }

  const suggested = nextLesson(attempts);
  const allDone = LESSONS.every((lesson) => attempts[lesson.id] != null);

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <span className="ball" aria-hidden="true" />
          <div>
            <p className="brand-name">Squashers</p>
            <p className="brand-sub">One stroke at a time</p>
          </div>
        </div>
        <div className="hand-switch" role="group" aria-label="Playing hand">
          <button type="button" className={hand === "right" ? "on" : ""} onClick={() => chooseHand("right", setHand)}>
            Right hand
          </button>
          <button type="button" className={hand === "left" ? "on" : ""} onClick={() => chooseHand("left", setHand)}>
            Left hand
          </button>
        </div>
        <ol className="path">
          {LESSONS.map((lesson) => {
            const attempt = attempts[lesson.id];
            const active = lesson.id === lessonId;
            return (
              <li key={lesson.id}>
                <button type="button" className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setLessonId(lesson.id)}>
                  <span className="num">{String(lesson.index).padStart(2, "0")}</span>
                  <span className="path-copy">
                    <span className="path-title">{lesson.title}</span>
                    {attempt ? <span className="path-score">{attempt.score}</span> : lesson.id === suggested && !allDone ? <span className="path-next">Next</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="rail-note">
          {allDone
            ? "You've had a go at every stroke. Open any of them again."
            : "Work in order, or open any stroke when you want."}
        </p>
      </aside>
      <LessonView
        key={lessonId}
        hand={hand}
        lessonId={lessonId}
        youtube={youtube[lessonId] ?? LESSONS.find((lesson) => lesson.id === lessonId)!.youtubeId}
        attempt={attempts[lessonId] ?? null}
        suggested={lessonId === suggested && !allDone}
        onYoutube={(id) => {
          const next = { ...youtube, [lessonId]: id };
          saveYoutube(next);
          setYoutube(next);
        }}
        onAttempt={(attempt) => {
          const next = { ...attempts, [lessonId]: attempt };
          saveAttempts(next);
          setAttempts(next);
        }}
      />
    </div>
  );
}

function chooseHand(hand: Hand, setHand: (hand: Hand) => void) {
  saveHand(hand);
  setHand(hand);
}

function HandGate({ onChoose }: { onChoose: (hand: Hand) => void }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <span className="ball big" aria-hidden="true" />
        <p className="kicker">Squashers</p>
        <h1>Which hand holds the racket?</h1>
        <p>This sets the filming guide for each stroke. You can change it later.</p>
        <div className="gate-actions">
          <button type="button" onClick={() => onChoose("right")}>
            Right hand
          </button>
          <button type="button" onClick={() => onChoose("left")}>
            Left hand
          </button>
        </div>
      </div>
    </div>
  );
}
