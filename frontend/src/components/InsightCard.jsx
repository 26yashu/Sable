export default function InsightCard({ insight, index }) {
  // Stagger entrance animation via inline delay
  const style = { animationDelay: `${index * 80}ms` };

  return (
    <div className="insight-card" style={style} role="article">
      <div className="insight-card__icon" aria-hidden="true">
        {insight.icon}
      </div>
      <div className="insight-card__body">
        {insight.label && (
          <span className="insight-card__label">{insight.label}</span>
        )}
        <p className="insight-card__text">{insight.text}</p>
      </div>
    </div>
  );
}
