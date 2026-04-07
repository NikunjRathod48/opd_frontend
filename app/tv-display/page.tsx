"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  Stethoscope,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Clock,
  Users,
  Activity,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenEntry {
  token_number: number;
  patient_name: string;
}

interface DoctorDisplay {
  doctor_id: number;
  doctor_name: string;
  current: TokenEntry | null;
  next: TokenEntry[];
}

interface QueueDisplayResponse {
  doctors: DoctorDisplay[];
}

interface AnnouncementItem {
  token: number;
  patientName: string;
  doctorName: string;
  doctorId: number;
}

type AnnouncementPhase = "ding" | "gujarati" | "hindi" | "idle";

// ─── API ──────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchQueueDisplay(hospitalId?: number): Promise<QueueDisplayResponse> {
  const params = hospitalId ? `?hospital_id=${hospitalId}` : "";
  const res = await fetch(`${API_BASE}/public/queue-display${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

// ─── Bulletproof Announcement Engine ─────────────────────────────────────────
//
// Design principles:
//   1. A single shared Promise chain (`this.chain`) ensures sequential execution
//      — no matter how many items arrive concurrently, each one is appended to
//      the tail of the chain via `.then()`.
//   2. `isSpeaking` is redundant with the chain but kept as a fast read flag.
//   3. Deduplication prevents the same (doctorId, token) from firing twice in a
//      5-minute window.
//   4. Chrome has a bug where speechSynthesis pauses after ~15 s unless you
//      call .resume() periodically — `keepAlive` handles this.
//   5. `onPhaseChange` allows the UI to highlight exactly which doctor is
//      currently being announced, and which language is playing.

class AnnouncementEngine {
  private chain: Promise<void> = Promise.resolve();
  private seenKeys = new Set<string>();
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  isSpeaking = false;

  enqueue(
    item: AnnouncementItem,
    onPhaseChange: (doctorId: number | null, phase: AnnouncementPhase) => void
  ) {
    const key = `${item.doctorId}-${item.token}`;
    if (this.seenKeys.has(key)) return;
    this.seenKeys.add(key);
    setTimeout(() => this.seenKeys.delete(key), 5 * 60 * 1000);

    // Append to the tail — strict sequential guarantee
    this.chain = this.chain.then(() =>
      this.announce(item, onPhaseChange)
    );
  }

  private async announce(
    item: AnnouncementItem,
    onPhaseChange: (doctorId: number | null, phase: AnnouncementPhase) => void
  ) {
    this.isSpeaking = true;
    this.startKeepAlive();

    try {
      onPhaseChange(item.doctorId, "ding");
      await this.playDing();
      await this.delay(900);

      onPhaseChange(item.doctorId, "gujarati");
      await this.speakWithLang(
        `ટોકન નંબર ${item.token}, ${item.patientName}, કૃપા કરીને ડૉક્ટર ${item.doctorName} પાસે આવો`,
        "gu-IN"
      );
      await this.delay(600);

      onPhaseChange(item.doctorId, "hindi");
      await this.speakWithLang(
        `टोकन नंबर ${item.token}, मरीज ${item.patientName}, कृपया डॉक्टर ${item.doctorName} के पास आएं`,
        "hi-IN"
      );
      await this.delay(400);
    } catch (e) {
      console.warn("[AnnouncementEngine] Error:", e);
    } finally {
      this.isSpeaking = false;
      this.stopKeepAlive();
      onPhaseChange(null, "idle");
    }
  }

  private playDing(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio("/ding.mp3");
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  private speakWithLang(text: string, lang: string): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();

      const synth = window.speechSynthesis;
      const voices = synth.getVoices();

      // Pick the best available voice for this language
      const voice =
        voices.find((v) => v.lang === lang) ||
        voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ||
        voices.find((v) => v.lang === "hi-IN") || // Gujarati fallback
        null;

      const utt = new SpeechSynthesisUtterance(text);
      if (voice) utt.voice = voice;
      utt.lang = voice?.lang ?? lang;
      utt.rate = 0.85;
      utt.pitch = 1.0;
      utt.volume = 1.0;

      // Safety timeout — if onend never fires (browser bug), resolve anyway
      const safetyTimer = setTimeout(() => resolve(), 15_000);

      utt.onend = () => {
        clearTimeout(safetyTimer);
        resolve();
      };
      utt.onerror = () => {
        clearTimeout(safetyTimer);
        resolve();
      };

      synth.speak(utt);
    });
  }

  // Chrome bug: synthesis pauses after ~15s of continuous audio.
  // Calling .resume() every 10s keeps it alive.
  private startKeepAlive() {
    if (this.keepAliveTimer) return;
    this.keepAliveTimer = setInterval(() => {
      if ("speechSynthesis" in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 10_000);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private delay(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  /** Clears pending queue, stops current speech, resets chain. */
  clear() {
    this.isSpeaking = false;
    this.stopKeepAlive();
    this.seenKeys.clear();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    // Reset chain so new announcements start fresh
    this.chain = Promise.resolve();
  }
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState({ hm: "", s: "", ampm: "" });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hm = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const parts = hm.split(" ");
      const hmPart = parts[0];
      const ampmPart = parts[1] ?? "";
      const sPart = String(now.getSeconds()).padStart(2, "0");
      setTime({ hm: hmPart, s: sPart, ampm: ampmPart });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="tv-clock-wrap">
      <span className="tv-clock-hm">{time.hm}</span>
      <span className="tv-clock-sep">:</span>
      <span className="tv-clock-s">{time.s}</span>
      <span className="tv-clock-ampm">{time.ampm}</span>
    </div>
  );
}

// ─── Announcement Banner ──────────────────────────────────────────────────────

function AnnouncementBanner({
  item,
  phase,
}: {
  item: AnnouncementItem | null;
  phase: AnnouncementPhase;
}) {
  if (!item || phase === "idle") return null;

  const phaseLabel =
    phase === "ding"
      ? "🔔 Calling..."
      : phase === "gujarati"
      ? "🇮🇳 ગુજરાતી"
      : "🇮🇳 हिंदी";

  return (
    <div className="tv-banner">
      <div className="tv-banner-inner">
        <div className="tv-banner-phase">{phaseLabel}</div>
        <div className="tv-banner-content">
          <span className="tv-banner-token">Token {item.token}</span>
          <ChevronRight size={18} className="tv-banner-arrow" />
          <span className="tv-banner-patient">{item.patientName}</span>
          <ChevronRight size={18} className="tv-banner-arrow" />
          <span className="tv-banner-doctor">{item.doctorName}</span>
        </div>
        <div className="tv-banner-wave">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="tv-wave-bar" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({
  doctor,
  isAnnouncing,
  announcingPhase,
  rank,
}: {
  doctor: DoctorDisplay;
  isAnnouncing: boolean;
  announcingPhase: AnnouncementPhase;
  rank: number;
}) {
  const totalWaiting = doctor.next.length;
  const initials = doctor.doctor_name
    .split(" ")
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={[
        "tv-card",
        isAnnouncing ? "tv-card--active" : "",
        announcingPhase === "gujarati" ? "tv-card--gu" : "",
        announcingPhase === "hindi" ? "tv-card--hi" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Accent bar */}
      <div className="tv-card-bar" />

      {/* Doctor Header */}
      <div className="tv-card-header">
        <div className="tv-card-avatar">{initials}</div>
        <div className="tv-card-doctor-info">
          <div className="tv-card-doctor-name">{doctor.doctor_name}</div>
          <div className="tv-card-meta">
            <Users size={11} />
            <span>{totalWaiting} waiting</span>
          </div>
        </div>
        {isAnnouncing && (
          <div className="tv-card-calling-badge">
            <Activity size={12} />
            CALLING
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="tv-card-divider" />

      {/* Current Token — hero section */}
      <div className="tv-card-current">
        <div className="tv-card-section-label">NOW SERVING</div>
        {doctor.current ? (
          <div className={`tv-card-serving${isAnnouncing ? " tv-card-serving--glow" : ""}`}>
            <div className="tv-card-token-num">{doctor.current.token_number}</div>
            <div className="tv-card-token-patient">{doctor.current.patient_name}</div>
          </div>
        ) : (
          <div className="tv-card-idle">
            <div className="tv-card-idle-dot" />
            <span>Awaiting next patient</span>
          </div>
        )}
      </div>

      {/* Next Tokens */}
      {doctor.next.length > 0 && (
        <div className="tv-card-next">
          <div className="tv-card-section-label">UPCOMING</div>
          <div className="tv-card-next-list">
            {doctor.next.map((t, i) => (
              <div key={t.token_number} className="tv-card-next-row">
                <span className="tv-card-next-pos">{i + 1}</span>
                <span className="tv-card-next-num">{t.token_number}</span>
                <span className="tv-card-next-name">{t.patient_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!doctor.current && doctor.next.length === 0 && (
        <div className="tv-card-empty">Queue is empty</div>
      )}
    </div>
  );
}

// ─── Main TV Display ──────────────────────────────────────────────────────────

export default function TVDisplayPage() {
  const [doctors, setDoctors] = useState<DoctorDisplay[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hospitalId, setHospitalId] = useState<number | undefined>();
  const [showClickPrompt, setShowClickPrompt] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Announcement state
  const [announcingDoctorId, setAnnouncingDoctorId] = useState<number | null>(null);
  const [announcingPhase, setAnnouncingPhase] = useState<AnnouncementPhase>("idle");
  const [announcingItem, setAnnouncingItem] = useState<AnnouncementItem | null>(null);

  const engineRef = useRef(new AnnouncementEngine());
  const audioEnabledRef = useRef(false); // stable ref for socket callback

  // Preload voices on mount
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }
  }, []);

  // Sync ref with state (avoids stale closure in socket handler)
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  // ─── Read hospital_id from URL ──────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hid = params.get("hospital_id");
    if (hid) setHospitalId(Number(hid));
  }, []);

  // ─── Fetch + poll ───────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const data = await fetchQueueDisplay(hospitalId);
      setDoctors(data.doctors);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Queue refresh failed:", e);
    }
  }, [hospitalId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // ─── Phase change handler (stable) ─────────────────────────────────────

  const handlePhaseChange = useCallback(
    (doctorId: number | null, phase: AnnouncementPhase) => {
      setAnnouncingDoctorId(doctorId);
      setAnnouncingPhase(phase);
      if (doctorId === null) setAnnouncingItem(null);
    },
    []
  );

  // ─── WebSocket ──────────────────────────────────────────────────────────

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const baseUrl = backendUrl.replace(/\/api$/, "");

    const socket: Socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      const params = new URLSearchParams(window.location.search);
      const hid = params.get("hospital_id");
      socket.emit("joinHospital", hid ? Number(hid) : 1);
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("queue:updated", () => refresh());

    socket.on("token:status-changed", (data: any) => {
      refresh();
      if (data.status !== "In Progress" || !audioEnabledRef.current) return;
      const item: AnnouncementItem = {
        token: data.token_number,
        patientName: data.patient_name || "Patient",
        doctorName: data.doctor_name || "Doctor",
        doctorId: data.doctor_id,
      };
      setAnnouncingItem(item);
      engineRef.current.enqueue(item, handlePhaseChange);
    });

    return () => {
      socket.disconnect();
    };
  }, [refresh, handlePhaseChange]);

  // ─── Enable audio ────────────────────────────────────────────────────────

  const enableAudio = useCallback(() => {
    setAudioEnabled(true);
    setShowClickPrompt(false);
    if ("speechSynthesis" in window) {
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
    }
  }, []);

  const toggleAudio = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!audioEnabled) {
        enableAudio();
      } else {
        setAudioEnabled(false);
        engineRef.current.clear();
        setAnnouncingDoctorId(null);
        setAnnouncingPhase("idle");
        setAnnouncingItem(null);
      }
    },
    [audioEnabled, enableAudio]
  );

  // ─── Stats ───────────────────────────────────────────────────────────────

  const totalActive = doctors.filter((d) => d.current !== null).length;
  const totalWaiting = doctors.reduce((s, d) => s + d.next.length, 0);
  const cols = Math.min(Math.max(doctors.length, 1), 4);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <style>{TV_STYLES}</style>

      <div className="tv-root" onClick={showClickPrompt ? enableAudio : undefined}>
        {/* ── Header ── */}
        <header className="tv-header">
          <div className="tv-header-brand">
            <div className="tv-logo">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="tv-brand-name">MedCore HMS</div>
              <div className="tv-brand-sub">OPD Queue Display</div>
            </div>
          </div>

          <div className="tv-header-clock">
            <LiveClock />
          </div>

          <div className="tv-header-controls">
            {/* Stats pills */}
            <div className="tv-stat-pill">
              <Activity size={12} />
              <span>{totalActive} Active</span>
            </div>
            <div className="tv-stat-pill">
              <Users size={12} />
              <span>{totalWaiting} Waiting</span>
            </div>

            {/* Audio toggle */}
            <button className="tv-icon-btn" onClick={toggleAudio}>
              {audioEnabled ? (
                <Volume2 size={18} />
              ) : (
                <VolumeX size={18} />
              )}
            </button>

            {/* Live badge */}
            <div className={`tv-live-badge${isConnected ? " tv-live-badge--on" : ""}`}>
              {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{isConnected ? "LIVE" : "OFFLINE"}</span>
            </div>
          </div>
        </header>

        {/* ── Announcement Banner ── */}
        <AnnouncementBanner item={announcingItem} phase={announcingPhase} />

        {/* ── Main Grid ── */}
        <main className="tv-main">
          {doctors.length === 0 ? (
            <div className="tv-empty">
              <div className="tv-empty-icon-wrap">
                <Stethoscope size={52} />
              </div>
              <h2 className="tv-empty-title">No Active Queues</h2>
              <p className="tv-empty-desc">
                Doctor queues will appear here automatically when they open.
              </p>
            </div>
          ) : (
            <div
              className="tv-grid"
              style={{ "--tv-cols": cols } as React.CSSProperties}
            >
              {doctors.map((doc, i) => (
                <DoctorCard
                  key={doc.doctor_id}
                  doctor={doc}
                  isAnnouncing={announcingDoctorId === doc.doctor_id}
                  announcingPhase={
                    announcingDoctorId === doc.doctor_id ? announcingPhase : "idle"
                  }
                  rank={i}
                />
              ))}
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="tv-footer">
          <div className="tv-footer-l">
            {lastUpdated && (
              <>
                <Clock size={11} />
                <span>
                  Updated{" "}
                  {lastUpdated.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </>
            )}
          </div>
          <div className="tv-footer-c">
            {audioEnabled ? (
              <span className="tv-footer-audio-on">
                🔊 Voice Announcements Active &mdash; Gujarati &amp; Hindi
              </span>
            ) : (
              <span className="tv-footer-audio-off">
                🔇 Tap anywhere to enable voice announcements
              </span>
            )}
          </div>
          <div className="tv-footer-r">Powered by MedCore HMS</div>
        </footer>

        {/* ── Click Prompt Overlay ── */}
        {showClickPrompt && (
          <div className="tv-overlay">
            <div className="tv-overlay-card">
              <div className="tv-overlay-icon">
                <Volume2 size={40} />
              </div>
              <h2 className="tv-overlay-title">Tap to Enable Voice Announcements</h2>
              <p className="tv-overlay-desc">
                Patient token announcements in Gujarati &amp; Hindi will play
                automatically on this screen.
              </p>
              <div className="tv-overlay-langs">
                <span>🇮🇳 ગુજરાતી</span>
                <span className="tv-overlay-dot" />
                <span>🇮🇳 हिंदी</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Premium Styles ───────────────────────────────────────────────────────────

const TV_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@700&display=swap');

  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Root ── */
  .tv-root {
    width: 100vw;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: #050d1a;
    background-image:
      radial-gradient(ellipse 80% 50% at 10% -10%, rgba(29,78,216,0.18) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 90% 110%, rgba(14,47,126,0.14) 0%, transparent 60%),
      radial-gradient(ellipse 40% 30% at 50% 50%, rgba(17,24,39,0.5) 0%, transparent 80%);
    color: #e2eaf6;
    font-family: 'Inter', system-ui, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* ── Header ── */
  .tv-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 2rem;
    background: rgba(10, 20, 40, 0.9);
    border-bottom: 1px solid rgba(37, 99, 235, 0.2);
    box-shadow: 0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.4);
    flex-shrink: 0;
    gap: 1.5rem;
    z-index: 10;
    position: relative;
  }

  .tv-header-brand {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-shrink: 0;
  }

  .tv-logo {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    box-shadow: 0 0 0 1px rgba(37,99,235,0.4), 0 0 20px rgba(37,99,235,0.35);
    flex-shrink: 0;
  }

  .tv-brand-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #fff;
    line-height: 1;
  }

  .tv-brand-sub {
    font-size: 0.65rem;
    font-weight: 500;
    color: rgba(148,163,184,0.7);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-top: 3px;
  }

  /* ── Clock ── */
  .tv-header-clock { flex: 1; display: flex; justify-content: center; }

  .tv-clock-wrap {
    display: flex;
    align-items: baseline;
    gap: 0.1rem;
    font-family: 'Rajdhani', monospace;
    font-weight: 700;
    line-height: 1;
  }

  .tv-clock-hm {
    font-size: 2.6rem;
    color: #fff;
    letter-spacing: 0.02em;
    text-shadow: 0 0 30px rgba(96,165,250,0.5);
  }

  .tv-clock-sep {
    font-size: 2rem;
    color: rgba(96,165,250,0.5);
    margin: 0 0.05rem;
    animation: tv-sep-blink 1s step-end infinite;
  }

  @keyframes tv-sep-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .tv-clock-s {
    font-size: 1.6rem;
    color: rgba(148,163,184,0.6);
    letter-spacing: 0.02em;
  }

  .tv-clock-ampm {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(148,163,184,0.5);
    letter-spacing: 0.12em;
    margin-left: 0.4rem;
    align-self: center;
  }

  /* ── Header Controls ── */
  .tv-header-controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
  }

  .tv-stat-pill {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(148,163,184,0.8);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .tv-icon-btn {
    width: 36px; height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: rgba(148,163,184,0.8);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
    flex-shrink: 0;
  }
  .tv-icon-btn:hover {
    background: rgba(37,99,235,0.2);
    border-color: rgba(37,99,235,0.4);
    color: #60a5fa;
  }

  .tv-live-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    border: 1px solid rgba(239,68,68,0.3);
    background: rgba(239,68,68,0.08);
    color: #f87171;
    transition: all 0.5s;
  }
  .tv-live-badge--on {
    background: rgba(16,185,129,0.08);
    border-color: rgba(16,185,129,0.3);
    color: #34d399;
  }
  .tv-live-badge--on::before {
    content: '';
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #34d399;
    animation: tv-pulse-dot 1.4s ease-in-out infinite;
  }
  @keyframes tv-pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* ── Announcement Banner ── */
  .tv-banner {
    flex-shrink: 0;
    background: linear-gradient(90deg, rgba(234,179,8,0.08) 0%, rgba(234,179,8,0.14) 50%, rgba(234,179,8,0.08) 100%);
    border-bottom: 1px solid rgba(234,179,8,0.25);
    border-top: 1px solid rgba(234,179,8,0.12);
    animation: tv-banner-in 0.35s ease-out;
    z-index: 9;
    position: relative;
    overflow: hidden;
  }

  .tv-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(234,179,8,0.06) 50%, transparent 100%);
    animation: tv-shimmer 2.5s linear infinite;
    background-size: 200% 100%;
  }

  @keyframes tv-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes tv-banner-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .tv-banner-inner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.65rem 2rem;
  }

  .tv-banner-phase {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: rgba(253,224,71,0.8);
    text-transform: uppercase;
    flex-shrink: 0;
    min-width: 90px;
  }

  .tv-banner-content {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    justify-content: center;
  }

  .tv-banner-token {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.15rem;
    font-weight: 700;
    color: #fde047;
    letter-spacing: 0.05em;
  }

  .tv-banner-arrow { color: rgba(253,224,71,0.4); flex-shrink: 0; }

  .tv-banner-patient {
    font-size: 1rem;
    font-weight: 600;
    color: #fef9c3;
  }

  .tv-banner-doctor {
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(253,224,71,0.75);
  }

  /* Audio wave animation */
  .tv-banner-wave {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .tv-wave-bar {
    display: block;
    width: 3px;
    border-radius: 2px;
    background: rgba(234,179,8,0.6);
    animation: tv-wave 0.8s ease-in-out infinite alternate;
  }
  .tv-wave-bar:nth-child(1) { height: 8px; }
  .tv-wave-bar:nth-child(2) { height: 16px; }
  .tv-wave-bar:nth-child(3) { height: 22px; }
  .tv-wave-bar:nth-child(4) { height: 14px; }
  .tv-wave-bar:nth-child(5) { height: 8px; }

  @keyframes tv-wave {
    from { transform: scaleY(0.3); opacity: 0.5; }
    to { transform: scaleY(1); opacity: 1; }
  }

  /* ── Main ── */
  .tv-main {
    flex: 1;
    padding: 1.25rem 1.75rem;
    overflow: hidden;
    display: flex;
    align-items: stretch;
    min-height: 0;
  }

  .tv-grid {
    display: grid;
    grid-template-columns: repeat(var(--tv-cols, 3), 1fr);
    gap: 1.1rem;
    width: 100%;
    align-items: stretch;
  }

  @media (max-width: 1280px) {
    .tv-grid { grid-template-columns: repeat(min(var(--tv-cols, 3), 3), 1fr); }
  }
  @media (max-width: 900px) {
    .tv-grid { grid-template-columns: repeat(2, 1fr); }
    .tv-main { padding: 1rem; }
  }
  @media (max-width: 580px) {
    .tv-grid { grid-template-columns: 1fr; }
    .tv-clock-hm { font-size: 1.8rem; }
    .tv-stat-pill { display: none; }
  }

  /* ── Doctor Card ── */
  .tv-card {
    background: rgba(15,23,42,0.8);
    border: 1px solid rgba(51,65,85,0.6);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    overflow: hidden;
    transition: border-color 0.5s ease, box-shadow 0.5s ease, background 0.5s ease;
    backdrop-filter: blur(8px);
  }

  /* Top accent bar */
  .tv-card-bar {
    height: 3px;
    background: linear-gradient(90deg, #1e3a8a, #2563eb, #60a5fa);
    border-radius: 18px 18px 0 0;
    opacity: 0.7;
    flex-shrink: 0;
    transition: opacity 0.5s, background 0.5s;
  }

  /* Active state — golden */
  .tv-card--active {
    border-color: rgba(234,179,8,0.45) !important;
    background: rgba(20,16,5,0.9) !important;
    box-shadow:
      0 0 0 1px rgba(234,179,8,0.15),
      0 0 30px rgba(234,179,8,0.1),
      0 0 60px rgba(234,179,8,0.05),
      inset 0 0 40px rgba(234,179,8,0.03);
  }
  .tv-card--active .tv-card-bar {
    background: linear-gradient(90deg, #a16207, #d97706, #fbbf24, #fde047) !important;
    opacity: 1 !important;
  }

  /* Gujarati pulse — warm amber */
  .tv-card--gu .tv-card-serving { box-shadow: 0 0 0 3px rgba(251,191,36,0.4) !important; }

  /* Hindi pulse — slightly cooler amber */
  .tv-card--hi .tv-card-serving { box-shadow: 0 0 0 3px rgba(249,115,22,0.4) !important; }

  /* ── Card Header ── */
  .tv-card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9rem 1.1rem 0.75rem;
    flex-shrink: 0;
  }

  .tv-card-avatar {
    width: 42px; height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(30,64,175,0.5), rgba(37,99,235,0.3));
    border: 1px solid rgba(37,99,235,0.25);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: #93c5fd;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    transition: background 0.5s, border-color 0.5s;
  }
  .tv-card--active .tv-card-avatar {
    background: linear-gradient(135deg, rgba(120,53,15,0.5), rgba(146,64,14,0.35));
    border-color: rgba(251,191,36,0.3);
    color: #fde047;
  }

  .tv-card-doctor-info { flex: 1; min-width: 0; }

  .tv-card-doctor-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.01em;
  }

  .tv-card-meta {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 2px;
    font-size: 0.68rem;
    font-weight: 500;
    color: rgba(148,163,184,0.6);
    letter-spacing: 0.04em;
  }

  .tv-card-calling-badge {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: rgba(234,179,8,0.15);
    border: 1px solid rgba(234,179,8,0.35);
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #fde047;
    animation: tv-badge-pulse 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes tv-badge-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .tv-card-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(51,65,85,0.6) 20%, rgba(51,65,85,0.6) 80%, transparent);
    margin: 0 1.1rem;
    flex-shrink: 0;
  }

  /* ── Serving Section ── */
  .tv-card-current {
    padding: 0.85rem 1.1rem;
    flex-shrink: 0;
  }

  .tv-card-section-label {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: rgba(100,116,139,0.8);
    text-transform: uppercase;
    margin-bottom: 0.6rem;
  }

  .tv-card-serving {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: linear-gradient(135deg, rgba(30,58,138,0.25), rgba(30,58,138,0.1));
    border: 1px solid rgba(37,99,235,0.25);
    border-radius: 14px;
    padding: 0.85rem 1.1rem;
    transition: border-color 0.4s, box-shadow 0.4s;
  }
  .tv-card--active .tv-card-serving {
    background: linear-gradient(135deg, rgba(120,53,15,0.25), rgba(120,53,15,0.1));
    border-color: rgba(234,179,8,0.3);
  }
  .tv-card-serving--glow {
    animation: tv-serving-glow 1.2s ease-in-out 2;
  }
  @keyframes tv-serving-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); }
    50% { box-shadow: 0 0 0 6px rgba(234,179,8,0.2), 0 0 20px rgba(234,179,8,0.1); }
  }

  .tv-card-token-num {
    font-family: 'Rajdhani', 'JetBrains Mono', monospace;
    font-size: 3.4rem;
    font-weight: 700;
    color: #60a5fa;
    line-height: 1;
    min-width: 2ch;
    flex-shrink: 0;
    letter-spacing: -0.02em;
    transition: color 0.5s;
  }
  .tv-card--active .tv-card-token-num { color: #fde047; }

  .tv-card-token-patient {
    font-size: 1.15rem;
    font-weight: 600;
    color: #e2e8f0;
    letter-spacing: 0.01em;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tv-card-idle {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.9rem 1rem;
    background: rgba(15,23,42,0.5);
    border: 1px dashed rgba(51,65,85,0.5);
    border-radius: 12px;
    color: rgba(100,116,139,0.6);
    font-size: 0.82rem;
    font-style: italic;
    font-weight: 400;
  }

  .tv-card-idle-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: rgba(100,116,139,0.3);
    animation: tv-idle-breathe 2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes tv-idle-breathe {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 0.8; transform: scale(1); }
  }

  /* ── Next Section ── */
  .tv-card-next {
    padding: 0 1.1rem 0.9rem;
    flex: 1;
  }

  .tv-card-next-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .tv-card-next-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.38rem 0.65rem;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.045);
    border-radius: 9px;
    transition: background 0.2s;
  }

  .tv-card-next-pos {
    width: 18px; height: 18px;
    border-radius: 5px;
    background: rgba(255,255,255,0.06);
    font-size: 0.6rem;
    font-weight: 700;
    color: rgba(100,116,139,0.7);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .tv-card-next-num {
    font-family: 'Rajdhani', monospace;
    font-size: 0.95rem;
    font-weight: 700;
    color: #93c5fd;
    min-width: 3ch;
    flex-shrink: 0;
  }

  .tv-card-next-name {
    font-size: 0.82rem;
    font-weight: 500;
    color: rgba(148,163,184,0.65);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tv-card-empty {
    padding: 0.6rem 1.1rem 0.9rem;
    font-size: 0.75rem;
    color: rgba(100,116,139,0.45);
    text-align: center;
    font-style: italic;
  }

  /* ── Empty State ── */
  .tv-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    text-align: center;
    padding: 3rem;
  }

  .tv-empty-icon-wrap {
    width: 90px; height: 90px;
    border-radius: 24px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: center;
    color: rgba(100,116,139,0.35);
    animation: tv-float 3.5s ease-in-out infinite;
  }
  @keyframes tv-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .tv-empty-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.7rem;
    font-weight: 700;
    color: rgba(148,163,184,0.35);
    letter-spacing: 0.04em;
  }

  .tv-empty-desc {
    font-size: 0.85rem;
    color: rgba(100,116,139,0.5);
    max-width: 340px;
    line-height: 1.7;
  }

  /* ── Footer ── */
  .tv-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 2rem;
    background: rgba(5, 10, 22, 0.9);
    border-top: 1px solid rgba(30, 41, 59, 0.8);
    font-size: 0.68rem;
    font-weight: 500;
    color: rgba(100,116,139,0.6);
    letter-spacing: 0.04em;
    flex-shrink: 0;
    gap: 1rem;
  }

  .tv-footer-l, .tv-footer-r {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 140px;
    flex-shrink: 0;
  }
  .tv-footer-r { justify-content: flex-end; color: rgba(100,116,139,0.4); }
  .tv-footer-c { flex: 1; text-align: center; }

  .tv-footer-audio-on {
    color: #34d399;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .tv-footer-audio-off {
    color: rgba(100,116,139,0.5);
    animation: tv-blink-slow 2.5s ease-in-out infinite;
  }
  @keyframes tv-blink-slow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ── Click Prompt Overlay ── */
  .tv-overlay {
    position: fixed;
    inset: 0;
    background: rgba(5,10,22,0.88);
    backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    cursor: pointer;
    animation: tv-fade-in 0.5s ease-out;
  }
  @keyframes tv-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .tv-overlay-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.1rem;
    text-align: center;
    padding: 3rem 2.5rem;
    background: rgba(15,23,42,0.8);
    border: 1px solid rgba(37,99,235,0.2);
    border-radius: 24px;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 30px 60px rgba(0,0,0,0.5);
    max-width: 420px;
    width: 90%;
  }

  .tv-overlay-icon {
    width: 80px; height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(30,64,175,0.3), rgba(37,99,235,0.15));
    border: 1px solid rgba(37,99,235,0.3);
    display: flex; align-items: center; justify-content: center;
    color: #60a5fa;
    box-shadow: 0 0 30px rgba(37,99,235,0.2);
    animation: tv-float 2.8s ease-in-out infinite;
  }

  .tv-overlay-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: 0.03em;
  }

  .tv-overlay-desc {
    font-size: 0.85rem;
    color: rgba(148,163,184,0.6);
    line-height: 1.7;
    max-width: 320px;
  }

  .tv-overlay-langs {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(148,163,184,0.7);
    padding: 0.5rem 1.2rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 999px;
  }

  .tv-overlay-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: rgba(100,116,139,0.5);
  }
`;
