import { useEffect, useRef, useState } from "react";
import { filmingNotes, lessonById } from "./lessons";
import { drawPose } from "./pose/draw";
import { analyzeVideo } from "./pose/engine";
import { frameAt, PHASE_LABEL, phaseAt } from "./pose/score";
import type { Analysis, Attempt, Hand, StrokeId } from "./types";
import { youtubeId } from "./youtube";

type Props = {
  hand: Hand;
  lessonId: StrokeId;
  youtube: string;
  attempt: Attempt | null;
  suggested: boolean;
  onYoutube: (id: string) => void;
  onAttempt: (attempt: Attempt) => void;
};

export function LessonView({ hand, lessonId, youtube, attempt, suggested, onYoutube, onAttempt }: Props) {
  const lesson = lessonById(lessonId);
  const samplerRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [time, setTime] = useState(0);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    const video = playerRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !analysis) return;
    const place = () => {
      if (analysis.swing && video.currentTime < 0.05) video.currentTime = analysis.swing.peak;
    };
    if (video.readyState >= 1) place();
    else video.addEventListener("loadedmetadata", place, { once: true });
    let frame = 0;
    const paint = () => {
      drawPose(canvas, video, frameAt(analysis.frames, video.currentTime));
      frame = requestAnimationFrame(paint);
    };
    const onTime = () => setTime(video.currentTime);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeked", onTime);
    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("loadedmetadata", place);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeked", onTime);
    };
  }, [analysis, videoUrl]);

  async function readFile(file: File) {
    const sampler = samplerRef.current;
    if (!sampler) return;
    if (!file.type.startsWith("video/")) {
      setError("Choose a video file.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setStatus("Opening the video…");
    setProgress(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setVideoUrl(url);
    try {
      await new Promise<void>((resolve, reject) => {
        const ready = () => {
          cleanup();
          resolve();
        };
        const fail = () => {
          cleanup();
          reject(new Error("This video couldn't be opened. Try a different file."));
        };
        const cleanup = () => {
          sampler.removeEventListener("loadedmetadata", ready);
          sampler.removeEventListener("error", fail);
        };
        sampler.addEventListener("loadedmetadata", ready);
        sampler.addEventListener("error", fail);
        sampler.src = url;
      });
      const result = await analyzeVideo(sampler, lesson.id, setStatus, setProgress);
      setTime(result.swing?.peak ?? 0);
      setAnalysis(result);
      setStatus(null);
      setProgress(null);
      if (result.score != null) {
        onAttempt({ score: result.score, summary: result.summary, at: new Date().toISOString() });
      }
    } catch (caught) {
      setStatus(null);
      setProgress(null);
      setError(caught instanceof Error ? caught.message : "Something went wrong reading that video.");
    }
  }

  function onLink(event: React.FormEvent) {
    event.preventDefault();
    const id = youtubeId(link);
    if (!id) {
      setLinkError("Paste a full YouTube link.");
      return;
    }
    setLinkError(null);
    setLink("");
    onYoutube(id);
  }

  const phase = analysis ? phaseAt(time, analysis.swing) : null;
  const notes = filmingNotes(hand, lesson.id);

  return (
    <main className="lesson">
      <video ref={samplerRef} className="sampler" muted playsInline aria-hidden="true" />
      <header className="lesson-head">
        <p className="kicker">
          Lesson {String(lesson.index).padStart(2, "0")} of 05
          {suggested ? <span className="next-pill">Suggested next</span> : null}
        </p>
        <h1>{lesson.title}</h1>
        <p className="cue">{lesson.cue}</p>
      </header>

      <section className="panel" aria-label="Demonstration">
        <div className="panel-label">
          <span>Watch</span>
          <span>{lesson.watch}</span>
        </div>
        <div className="frame">
          <iframe
            key={youtube}
            src={`https://www.youtube-nocookie.com/embed/${youtube}`}
            title={`${lesson.title} demonstration`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <form className="swap" onSubmit={onLink}>
          <label htmlFor="youtube-link">Swap this demo</label>
          <div className="swap-row">
            <input
              id="youtube-link"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="Paste a YouTube link"
              inputMode="url"
            />
            <button type="submit">Use link</button>
          </div>
          {linkError ? <p className="form-error">{linkError}</p> : null}
        </form>
      </section>

      <section className="panel" aria-label="Your swing">
        <div className="panel-label">
          <span>Your swing</span>
          <span>Stays in this browser</span>
        </div>
        <ol className="film">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ol>
        <label
          className={dragging ? "drop dragging" : "drop"}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) void readFile(file);
          }}
        >
          <input
            type="file"
            accept="video/*"
            disabled={status != null}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void readFile(file);
            }}
          />
          <strong>{status ? status : "Upload one swing"}</strong>
          <span>{status ? "The pose model runs here. The file is not uploaded." : "Side-on, full body, camera about hip height."}</span>
          {progress != null ? (
            <span className="bar" aria-hidden="true">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          ) : null}
        </label>
        {error ? <p className="form-error">{error}</p> : null}

        {analysis && videoUrl ? (
          <div className="review">
            <div className="stage">
              <video ref={playerRef} src={videoUrl} controls playsInline />
              <canvas ref={canvasRef} />
            </div>
            <div className="legend">
              <span><i className="swatch good" /> Close to the template</span>
              <span><i className="swatch bad" /> Off the template</span>
              <span><i className="swatch ink" /> Not scored</span>
              <strong>{phase ? PHASE_LABEL[phase] : ""}</strong>
            </div>
            <ScoreBlock score={analysis.score} summary={analysis.summary} warnings={analysis.warnings} />
          </div>
        ) : attempt ? (
          <ScoreBlock score={attempt.score} summary={attempt.summary} warnings={["Upload the swing again to see the stick figure. The video itself is not saved."]} />
        ) : null}
      </section>
    </main>
  );
}

function ScoreBlock({ score, summary, warnings }: { score: number | null; summary: string; warnings: string[] }) {
  return (
    <div className="score-block">
      <p className="score" aria-label={score == null ? "No score" : `Score ${score} out of 100`}>
        {score == null ? "—" : score}
        {score != null ? <small>/ 100</small> : null}
      </p>
      <div>
        <p className="score-kicker">Peter Nicol–style template</p>
        <p className="summary">{summary}</p>
        {warnings.length > 0 ? (
          <ul className="warnings">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
