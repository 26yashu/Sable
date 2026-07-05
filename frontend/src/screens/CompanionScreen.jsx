import { useState, useEffect, useMemo } from "react";
import {
  getEvolution,
  recomputeEvolution,
  getAllMilestonesWithStatus,
  checkAndUnlockMilestones,
} from "../lib/companionEvolution";

// ── Level bar ─────────────────────────────────────────────────────
function LevelBar({ label, value, max = 100, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="evo-bar">
      <div className="evo-bar__meta">
        <span className="evo-bar__label">{label}</span>
        <span className="evo-bar__value" style={{ color }}>{value}</span>
      </div>
      <div className="evo-bar__track" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
        <div
          className="evo-bar__fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Milestone card ────────────────────────────────────────────────
function MilestoneCard({ milestone, index }) {
  const style = { animationDelay: `${Math.min(index, 12) * 45}ms` };
  return (
    <div
      className={`milestone-card${milestone.unlocked ? " milestone-card--unlocked" : " milestone-card--locked"}`}
      style={style}
      aria-label={`${milestone.label}${milestone.unlocked ? ", unlocked" : ", locked"}`}
    >
      <div className="milestone-card__icon" aria-hidden="true">
        {milestone.unlocked ? milestone.icon : "🔒"}
      </div>
      <div className="milestone-card__body">
        <p className="milestone-card__label">{milestone.label}</p>
        <p className="milestone-card__desc">
          {milestone.unlocked ? milestone.description : "Keep going — you'll get there."}
        </p>
        {milestone.unlocked && milestone.unlockedAt && (
          <time className="milestone-card__date" dateTime={milestone.unlockedAt}>
            {new Date(milestone.unlockedAt).toLocaleDateString(undefined, {
              month: "short", day: "numeric", year: "numeric",
            })}
          </time>
        )}
      </div>
    </div>
  );
}

// ── Relationship stage label ──────────────────────────────────────
function getRelationshipStage(evolution) {
  const avg = (evolution.comfortLevel + evolution.trustLevel) / 2;
  if (avg >= 70) return { label: "Deep bond",       color: "#5ec4a0", emoji: "🌿" };
  if (avg >= 40) return { label: "Growing trust",   color: "#7ab8a8", emoji: "🌱" };
  if (avg >= 15) return { label: "Opening up",      color: "#8c9fc4", emoji: "🌤️" };
  return              { label: "Just beginning",    color: "#4a5e59", emoji: "✦"  };
}

// ── Main screen ───────────────────────────────────────────────────
export default function CompanionScreen({ session }) {
  const [loading, setLoading] = useState(true);
  const [evolution, setEvolution]     = useState(null);
  const [milestones, setMilestones]   = useState([]);

  const companionName = session?.companionName || "Your companion";

  useEffect(() => {
    const t = setTimeout(() => {
      // Recompute and check milestones on mount
      const ev  = recomputeEvolution();
      const ms  = checkAndUnlockMilestones();
      setEvolution(ev);
      setMilestones(ms.length ? ms : getAllMilestonesWithStatus());
      setLoading(false);
    }, 380);
    return () => clearTimeout(t);
  }, []);

  // For the milestones grid we always show all (locked + unlocked) sorted
  const allMilestones = useMemo(() => getAllMilestonesWithStatus(), [milestones]);
  const unlockedCount = allMilestones.filter((m) => m.unlocked).length;

  const stage = evolution ? getRelationshipStage(evolution) : null;

  return (
    <div className="screen companion-screen">
      <header className="screen__header">
        <div className="screen__header-inner">
          <div className="screen__eyebrow">Companion</div>
          <h1 className="screen__title">{companionName}</h1>
          <p className="screen__sub">
            Your relationship, growing over time. Privately, locally.
          </p>
        </div>
      </header>

      <div className="screen__body">
        {loading ? (
          <>
            <div className="skeleton skeleton-panel" style={{ maxWidth: 680, margin: "0 auto", width: "100%", minHeight: 180 }}>
              <div className="skeleton__bar skeleton__bar--xs" style={{ width: "35%" }} />
              <div className="skeleton__block" />
            </div>
            <div className="stats-row">
              {[0,1,2].map((i) => <div key={i} className="skeleton skeleton-stat"><div className="skeleton__bar skeleton__bar--lg" /><div className="skeleton__bar skeleton__bar--sm" /></div>)}
            </div>
          </>
        ) : (
          <>
            {/* ── Relationship stage ── */}
            <div className="companion-stage">
              <div className="companion-stage__avatar" aria-hidden="true">
                <span className="companion-stage__avatar-sym">✦</span>
                <span className="companion-stage__avatar-ring" />
                <span className="companion-stage__avatar-ping" />
              </div>
              <div className="companion-stage__info">
                <div className="companion-stage__name">{companionName}</div>
                <div className="companion-stage__badge" style={{ color: stage.color, borderColor: stage.color + "40", background: stage.color + "14" }}>
                  <span aria-hidden="true">{stage.emoji}</span> {stage.label}
                </div>
              </div>
            </div>

            {/* ── Stats strip ── */}
            <div className="stats-row">
              <div className="stat-pill">
                <span className="stat-pill__value">{evolution.trustLevel}</span>
                <span className="stat-pill__label">Trust</span>
              </div>
              <div className="stat-pill">
                <span className="stat-pill__value">{evolution.comfortLevel}</span>
                <span className="stat-pill__label">Comfort</span>
              </div>
              <div className="stat-pill">
                <span className="stat-pill__value">{unlockedCount}</span>
                <span className="stat-pill__label">Milestones</span>
              </div>
            </div>

            {/* ── Evolution levels ── */}
            <section className="insights-section" aria-label="Relationship levels">
              <h2 className="insights-section__heading">Relationship levels</h2>
              <div className="insights-panel evo-panel">
                <LevelBar label="Trust"    value={evolution.trustLevel}   color="#5ec4a0" />
                <LevelBar label="Comfort"  value={evolution.comfortLevel} color="#7ab8a8" />
                <LevelBar label="Openness" value={evolution.humorLevel}   color="#d4a574" />

                <div className="evo-traits">
                  <div className="evo-trait">
                    <span className="evo-trait__label">Support style</span>
                    <span className="evo-trait__value">{evolution.supportStyle}</span>
                  </div>
                  <div className="evo-trait">
                    <span className="evo-trait__label">Tone</span>
                    <span className="evo-trait__value">{evolution.tone}</span>
                  </div>
                </div>

                <p className="evo-panel__note">
                  These levels grow naturally as you use Sable — through journaling, mood check-ins, and conversations.
                </p>
              </div>
            </section>

            {/* ── Milestones ── */}
            <section className="insights-section" aria-label="Relationship milestones">
              <h2 className="insights-section__heading">
                Milestones
                <span className="milestone-count"> {unlockedCount} / {allMilestones.length}</span>
              </h2>
              <div className="milestone-grid" role="list">
                {allMilestones.map((m, i) => (
                  <MilestoneCard key={m.id} milestone={m} index={i} />
                ))}
              </div>
            </section>

            {/* ── Empty state for no milestones yet ── */}
            {unlockedCount === 0 && (
              <div className="screen__empty-state" role="status" aria-live="polite">
                <span className="screen__empty-icon" aria-hidden="true">🌱</span>
                <p className="screen__empty-heading">Your relationship is just beginning.</p>
                <p className="screen__empty-sub">
                  Send a message, log a mood, or write a journal entry — your first milestone is close.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
