/**
 * SkeletonCard — lightweight shimmer placeholders shown while
 * insights data is being computed/loaded. Pure CSS animation,
 * no dependencies.
 *
 * variant: "stat" | "panel" | "list"
 */
export default function SkeletonCard({ variant = "panel" }) {
  if (variant === "stat") {
    return (
      <div className="skeleton skeleton-stat" aria-hidden="true">
        <div className="skeleton__bar skeleton__bar--lg" />
        <div className="skeleton__bar skeleton__bar--sm" />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="skeleton skeleton-list" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton__row">
            <div className="skeleton__circle" />
            <div className="skeleton__lines">
              <div className="skeleton__bar skeleton__bar--md" />
              <div className="skeleton__bar skeleton__bar--xs" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // default: panel
  return (
    <div className="skeleton skeleton-panel" aria-hidden="true">
      <div className="skeleton__bar skeleton__bar--xs" style={{ width: "40%" }} />
      <div className="skeleton__block" />
    </div>
  );
}
