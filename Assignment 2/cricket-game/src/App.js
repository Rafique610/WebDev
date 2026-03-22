import './App.css';
import { useState, useEffect, useRef } from "react";

import ground from "./assets/ground.png";
import batsmanIdle from "./assets/frame.png";
import batsmanHit from "./assets/batsman.gif";
import ball from "./assets/ball.png";

// ─── BALL ANIMATION CONFIG ────────────────────────────────────────────────────
const BALL = {
  startX: 95, startY: 45,
  bounceX: 50, bounceY: 65,
  batsmanX: 18, batsmanY: 56,
  totalFrames: 120, hitAtFrame: 85,
  size: 30,
};
const HIT = {
  flyToX: 70, flyToY: 10,
  flyDuration: 600, gifDuration: 400, nextBallDelay: 600,
};

// ─── GAME CONFIG ──────────────────────────────────────────────────────────────
const TOTAL_BALLS = 12;
const TOTAL_WICKETS = 2;

const STYLES = {
  aggressive: {
    label: "Aggressive",
    color: "#ef4444",
    segments: [
      { label: "W",  runs: "W", prob: 0.35, color: "#dc2626" },
      { label: "0",  runs: 0,   prob: 0.10, color: "#6b7280" },
      { label: "1",  runs: 1,   prob: 0.10, color: "#2563eb" },
      { label: "2",  runs: 2,   prob: 0.10, color: "#16a34a" },
      { label: "3",  runs: 3,   prob: 0.05, color: "#ca8a04" },
      { label: "4",  runs: 4,   prob: 0.15, color: "#7c3aed" },
      { label: "6",  runs: 6,   prob: 0.15, color: "#db2777" },
    ],
  },
  defensive: {
    label: "Defensive",
    color: "#3b82f6",
    segments: [
      { label: "W",  runs: "W", prob: 0.15, color: "#dc2626" },
      { label: "0",  runs: 0,   prob: 0.25, color: "#6b7280" },
      { label: "1",  runs: 1,   prob: 0.25, color: "#2563eb" },
      { label: "2",  runs: 2,   prob: 0.20, color: "#16a34a" },
      { label: "3",  runs: 3,   prob: 0.05, color: "#ca8a04" },
      { label: "4",  runs: 4,   prob: 0.07, color: "#7c3aed" },
      { label: "6",  runs: 6,   prob: 0.03, color: "#db2777" },
    ],
  },
};

// Commentary
const COMMENTARY = {
  W:  ["He's gone! Clean bowled!", "What a delivery! Timber!", "Walk back to the pavilion!"],
  0:  ["Dot ball. Good length delivery.", "Played and missed!", "No run, tight bowling."],
  1:  ["Nudged away for a single.", "One run, keeps the score ticking.", "Worked to leg for one."],
  2:  ["Good running! Two runs!", "Driven for a couple.", "Two more on the board!"],
  3:  ["Three! Great placement!", "Excellent running between wickets!", "Three runs!"],
  4:  ["FOUR! Cracking shot!", "Raced away to the boundary!", "BOUNDARY! Beautiful drive!"],
  6:  ["SIX! Massive hit!", "That's gone into the crowd!", "MAXIMUM! What a strike!"],
};

function getBallPos(frame, total) {
  const t = frame / total;
  let x, y;
  if (t <= 0.5) {
    const p = t / 0.5;
    x = BALL.startX + (BALL.bounceX - BALL.startX) * p;
    y = BALL.startY + (BALL.bounceY - BALL.startY) * (p * p);
  } else {
    const p = (t - 0.5) / 0.5;
    x = BALL.bounceX + (BALL.batsmanX - BALL.bounceX) * p;
    y = BALL.bounceY + (BALL.batsmanY - BALL.bounceY) * p;
  }
  return { x, y };
}

function getOutcome(style, sliderPos) {
  const segs = STYLES[style].segments;
  let cumulative = 0;
  for (const seg of segs) {
    cumulative += seg.prob;
    if (sliderPos <= cumulative) return seg;
  }
  return segs[segs.length - 1];
}

export default function App() {
  // Game state
  const [battingStyle, setBattingStyle] = useState("aggressive");
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(TOTAL_BALLS);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverMsg, setGameOverMsg] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [commentary, setCommentary] = useState("Select your batting style and hit!");
  const [phase, setPhase] = useState("idle"); // idle | bowling | powerbar | animating

  // Ball animation
  const [isHitting, setIsHitting] = useState(false);
  const [ballPos, setBallPos] = useState({ x: BALL.startX, y: BALL.startY });
  const [ballVisible, setBallVisible] = useState(false);
  const [flyBall, setFlyBall] = useState(false);

  // Power bar
  const [sliderPos, setSliderPos] = useState(0);   // 0–1
  const [sliderDir, setSliderDir] = useState(1);
  const [sliderActive, setSliderActive] = useState(false);
  const [lockedPos, setLockedPos] = useState(null);

  const frameRef = useRef(0);
  const intervalRef = useRef(null);
  const timeoutsRef = useRef([]);
  const sliderRef = useRef(null);
  const sliderPosRef = useRef(0);
  const sliderDirRef = useRef(1);

  const addTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };
  const clearAll = () => {
    clearInterval(intervalRef.current);
    clearInterval(sliderRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => { return clearAll; }, []);

  // ── Start a new delivery ──────────────────────────────────────────────────
const startDelivery = () => {
  if (gameOver) return;
  clearAll();
  setLastResult(null);
  setLockedPos(null);
  setPhase("powerbar");
  startSlider();
};

  // ── Slider animation ──────────────────────────────────────────────────────
  const startSlider = () => {
    setSliderPos(0);
    setSliderActive(true);
    sliderPosRef.current = 0;
    sliderDirRef.current = 1;

    sliderRef.current = setInterval(() => {
      sliderPosRef.current += 0.008 * sliderDirRef.current;
      if (sliderPosRef.current >= 1) {
        sliderPosRef.current = 1;
        sliderDirRef.current = -1;
      } else if (sliderPosRef.current <= 0) {
        sliderPosRef.current = 0;
        sliderDirRef.current = 1;
      }
      setSliderPos(sliderPosRef.current);
      setSliderDir(sliderDirRef.current);
    }, 16);
  };

  // ── Player clicks / hits ──────────────────────────────────────────────────
  
const handleShot = () => {
  if (phase !== "powerbar") return;
  clearInterval(sliderRef.current);
  setSliderActive(false);

  const pos = sliderPosRef.current;
  setLockedPos(pos);
  const outcome = getOutcome(battingStyle, pos);
  const comm = COMMENTARY[outcome.runs === "W" ? "W" : outcome.runs];
  setCommentary(comm[Math.floor(Math.random() * comm.length)]);
  setLastResult(outcome);

  // Update score immediately
  let newWickets = wickets + (outcome.runs === "W" ? 1 : 0);
  let newRuns = runs + (outcome.runs === "W" ? 0 : outcome.runs);
  let newBalls = ballsLeft - 1;

  setRuns(newRuns);
  setWickets(newWickets);
  setBallsLeft(newBalls);

  const isGameOver = newWickets >= TOTAL_WICKETS || newBalls <= 0;

  // NOW bowl the ball
  setPhase("bowling");
  setFlyBall(false);
  setBallPos({ x: BALL.startX, y: BALL.startY });
  setBallVisible(true);
  frameRef.current = 0;

  intervalRef.current = setInterval(() => {
    frameRef.current += 1;
    const f = frameRef.current;

    if (f === BALL.hitAtFrame) setIsHitting(true);

    if (f >= BALL.totalFrames) {
      clearInterval(intervalRef.current);
      // Ball reached bat — now fly away based on outcome
      if (outcome.runs !== "W" && outcome.runs !== 0) {
        setFlyBall(true);
        addTimeout(() => setBallPos({ x: HIT.flyToX, y: HIT.flyToY }), 30);
      }
      addTimeout(() => {
        setBallVisible(false);
        setIsHitting(false);
        setFlyBall(false);
        if (isGameOver) {
          setGameOver(true);
          setGameOverMsg(
            newWickets >= TOTAL_WICKETS
              ? `All out! You scored ${newRuns} runs.`
              : `Innings over! You scored ${newRuns} runs.`
          );
          setPhase("idle");
        } else {
          setPhase("idle");
        }
      }, HIT.gifDuration + (outcome.runs !== "W" && outcome.runs !== 0 ? HIT.flyDuration : 100));
      return;
    }

    setBallPos(getBallPos(f, BALL.totalFrames));
  }, 16);
};

  const playHitAnim = (outcome) => {
    setBallVisible(true);
    setBallPos({ x: BALL.batsmanX, y: BALL.batsmanY });
    setIsHitting(true);

    addTimeout(() => {
      if (outcome.runs !== "W" && outcome.runs !== 0) {
        setFlyBall(true);
        addTimeout(() => setBallPos({ x: HIT.flyToX, y: HIT.flyToY }), 30);
      }
    }, 150);

    addTimeout(() => {
      setBallVisible(false);
      setIsHitting(false);
      setFlyBall(false);
      setPhase("idle");
    }, HIT.gifDuration + HIT.flyDuration);
  };

  const restartGame = () => {
    clearAll();
    setRuns(0);
    setWickets(0);
    setBallsLeft(TOTAL_BALLS);
    setGameOver(false);
    setGameOverMsg("");
    setLastResult(null);
    setLockedPos(null);
    setSliderPos(0);
    setSliderActive(false);
    setPhase("idle");
    setBallVisible(false);
    setIsHitting(false);
    setCommentary("Select your batting style and hit!");
    setBattingStyle("aggressive");
  };

  // Derived
  const oversDisplay = () => {
    const bowled = TOTAL_BALLS - ballsLeft;
    return `${Math.floor(bowled / 6)}.${bowled % 6}`;
  };
  const segments = STYLES[battingStyle].segments;

  return (
    <div style={styles.container}>
      {/* Ground */}
      <img src={ground} alt="ground" style={styles.ground} />

      {/* Ball */}
      {ballVisible && (
        <img src={ball} alt="ball" style={{
          ...styles.ball,
          left: `${ballPos.x}%`,
          top: `${ballPos.y}%`,
          width: `${BALL.size}px`,
          height: `${BALL.size}px`,
          transition: flyBall
            ? `left ${HIT.flyDuration}ms ease-out, top ${HIT.flyDuration}ms ease-out`
            : "none",
        }} />
      )}

      {/* Batsman */}
      <img
        src={isHitting ? batsmanHit : batsmanIdle}
        alt="batsman"
        style={styles.batsman}
      />

      {/* ── SCOREBOARD ── */}
      <div style={styles.scoreboard}>
        <div style={styles.scoreRow}>
          <div style={styles.scoreItem}>
            <div style={styles.scoreLabel}>RUNS</div>
            <div style={styles.scoreValue}>{runs}</div>
          </div>
          <div style={styles.scoreDivider} />
          <div style={styles.scoreItem}>
            <div style={styles.scoreLabel}>WICKETS</div>
            <div style={styles.scoreValue}>{wickets}/{TOTAL_WICKETS}</div>
          </div>
          <div style={styles.scoreDivider} />
          <div style={styles.scoreItem}>
            <div style={styles.scoreLabel}>OVERS</div>
            <div style={styles.scoreValue}>{oversDisplay()}</div>
          </div>
          <div style={styles.scoreDivider} />
          <div style={styles.scoreItem}>
            <div style={styles.scoreLabel}>BALLS LEFT</div>
            <div style={styles.scoreValue}>{ballsLeft}</div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM UI PANEL ── */}
      <div style={styles.bottomPanel}>

        {/* Commentary */}
        <div style={styles.commentary}>{commentary}</div>

        {/* Last result badge */}
        {lastResult && (
          <div style={{
            ...styles.resultBadge,
            background: lastResult.color,
          }}>
            {lastResult.runs === "W" ? "WICKET!" : `+${lastResult.runs}`}
          </div>
        )}

        {/* Batting Style */}
        <div style={styles.styleRow}>
          {["aggressive", "defensive"].map(s => (
            <button
              key={s}
              onClick={() => { if (phase === "idle") setBattingStyle(s); }}
              style={{
                ...styles.styleBtn,
                background: battingStyle === s ? STYLES[s].color : "rgba(255,255,255,0.1)",
                border: `2px solid ${STYLES[s].color}`,
                opacity: phase !== "idle" ? 0.5 : 1,
              }}
            >
              {STYLES[s].label}
            </button>
          ))}
        </div>

        {/* Power Bar */}
        <div style={styles.powerBarWrap}>
          <div style={styles.powerBarLabel}>POWER BAR</div>
          <div style={styles.powerBarOuter}>
            {/* Segments */}
            {segments.map((seg, i) => (
              <div
                key={i}
                style={{
                  ...styles.segment,
                  width: `${seg.prob * 100}%`,
                  background: seg.color,
                  opacity: lockedPos !== null
                    ? (getOutcome(battingStyle, lockedPos) === seg ? 1 : 0.45)
                    : 1,
                }}
              >
                <span style={styles.segLabel}>{seg.label}</span>
                <span style={styles.segProb}>{Math.round(seg.prob * 100)}%</span>
              </div>
            ))}

            {/* Slider needle */}
            <div style={{
              ...styles.needle,
              left: `${sliderPos * 100}%`,
              opacity: (phase === "powerbar" || lockedPos !== null) ? 1 : 0,
              background: lockedPos !== null ? "#facc15" : "#fff",
            }} />
          </div>

          {/* Probability ticks */}
          <div style={styles.tickRow}>
            {(() => {
              let cum = 0;
              return segments.map((seg, i) => {
                const pos = cum;
                cum += seg.prob;
                return (
                  <span key={i} style={{ ...styles.tick, left: `${pos * 100}%` }}>
                    {pos > 0 ? pos.toFixed(2) : "0"}
                  </span>
                );
              }).concat(
                <span key="end" style={{ ...styles.tick, left: "100%" }}>1.00</span>
              );
            })()}
          </div>
        </div>

        {/* Action Button */}
        <div style={styles.actionRow}>
          {gameOver ? (
            <button onClick={restartGame} style={styles.restartBtn}>
              ↺ Restart Game
            </button>
          ) : phase === "idle" ? (
            <button onClick={startDelivery} style={styles.hitBtn}>
              ▶ Bowl
            </button>
          ) : phase === "powerbar" ? (
            <button onClick={handleShot} style={{ ...styles.hitBtn, background: "#f59e0b", color: "#000" }}>
              ⚡ HIT!
            </button>
          ) : (
            <button disabled style={{ ...styles.hitBtn, opacity: 0.4 }}>
              {phase === "bowling" ? "Incoming..." : "..."}
            </button>
          )}
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameOver && (
        <div style={styles.overlay}>
          <div style={styles.overlayBox}>
            <div style={styles.overlayTitle}>INNINGS OVER</div>
            <div style={styles.overlayMsg}>{gameOverMsg}</div>
            <div style={styles.overlayStats}>
              <div>Runs: <strong>{runs}</strong></div>
              <div>Wickets: <strong>{wickets}</strong></div>
              <div>Overs: <strong>{oversDisplay()}</strong></div>
            </div>
            <button onClick={restartGame} style={styles.restartBtn}>↺ Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative", width: "100vw", height: "100vh", overflow: "hidden",
    fontFamily: "'Segoe UI', sans-serif",
  },
  ground: {
    position: "absolute", width: "100%", height: "100%",
    objectFit: "cover", objectPosition: "center 90%",
  },
  batsman: {
    position: "absolute", top: "58%", left: "18%",
    transform: "translate(-50%, -50%)", height: "220px", zIndex: 2,
  },
  ball: {
    position: "absolute", transform: "translate(-50%, -50%)", zIndex: 3,
  },

  // Scoreboard
  scoreboard: {
    position: "absolute", top: 12, left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.75)",
    borderRadius: 12, padding: "8px 20px", zIndex: 10,
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,0.15)",
  },
  scoreRow: { display: "flex", alignItems: "center", gap: 4 },
  scoreItem: { textAlign: "center", padding: "0 14px" },
  scoreLabel: { fontSize: 10, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase" },
  scoreValue: { fontSize: 22, fontWeight: 700, color: "#fff" },
  scoreDivider: { width: 1, height: 36, background: "rgba(255,255,255,0.2)" },

  // Bottom panel
  bottomPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    background: "rgba(0,0,0,0.82)",
    backdropFilter: "blur(8px)",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    padding: "12px 20px 16px",
    zIndex: 10,
  },
  commentary: {
    textAlign: "center", color: "#e2e8f0", fontSize: 13,
    marginBottom: 10, fontStyle: "italic", minHeight: 18,
  },
  resultBadge: {
    position: "absolute", top: -20, left: "50%",
    transform: "translateX(-50%)",
    padding: "4px 18px", borderRadius: 20,
    color: "#fff", fontWeight: 700, fontSize: 15,
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
  },
  styleRow: {
    display: "flex", justifyContent: "center", gap: 10, marginBottom: 12,
  },
  styleBtn: {
    padding: "6px 22px", borderRadius: 20,
    color: "#fff", fontWeight: 600, fontSize: 13,
    cursor: "pointer", transition: "all 0.2s",
  },

  // Power bar
  powerBarWrap: { marginBottom: 10 },
  powerBarLabel: {
    fontSize: 10, color: "#9ca3af", letterSpacing: 2,
    textTransform: "uppercase", textAlign: "center", marginBottom: 4,
  },
  powerBarOuter: {
    position: "relative", display: "flex",
    height: 42, borderRadius: 8, overflow: "hidden",
    border: "2px solid rgba(255,255,255,0.2)",
  },
  segment: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    transition: "opacity 0.3s",
    borderRight: "1px solid rgba(0,0,0,0.3)",
  },
  segLabel: { fontSize: 13, fontWeight: 700, color: "#fff" },
  segProb: { fontSize: 9, color: "rgba(255,255,255,0.7)" },
  needle: {
    position: "absolute", top: -3, bottom: -3,
    width: 4, marginLeft: -2,
    borderRadius: 2,
    transition: "left 16ms linear, background 0.2s",
    zIndex: 5,
    boxShadow: "0 0 6px rgba(255,255,255,0.8)",
  },
  tickRow: {
    position: "relative", height: 16, marginTop: 2,
  },
  tick: {
    position: "absolute", transform: "translateX(-50%)",
    fontSize: 9, color: "#6b7280",
  },

  // Action
  actionRow: { display: "flex", justifyContent: "center", marginTop: 4 },
  hitBtn: {
    padding: "10px 40px", fontSize: 15, fontWeight: 700,
    borderRadius: 25, border: "none",
    background: "#16a34a", color: "#fff",
    cursor: "pointer", letterSpacing: 1,
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
  },
  restartBtn: {
    padding: "10px 30px", fontSize: 14, fontWeight: 700,
    borderRadius: 25, border: "none",
    background: "#f59e0b", color: "#000",
    cursor: "pointer",
  },

  // Game over
  overlay: {
    position: "absolute", inset: 0, zIndex: 20,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  overlayBox: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16, padding: "32px 40px",
    textAlign: "center", color: "#fff",
  },
  overlayTitle: { fontSize: 28, fontWeight: 800, marginBottom: 8, color: "#f59e0b" },
  overlayMsg: { fontSize: 16, color: "#cbd5e1", marginBottom: 16 },
  overlayStats: { fontSize: 18, lineHeight: 2, marginBottom: 20, color: "#e2e8f0" },
};