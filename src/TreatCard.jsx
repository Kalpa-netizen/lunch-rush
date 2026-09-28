import React from "react";
export default function TreatCard({ award, compact = false }) {
  if (!award) return null;
  const from = award.fromNames?.join(", ");
  return (
    <section
      className={`winner-treat ${compact ? "compact" : ""}`}
      aria-label="Winner's surprise trophy"
    >
      <div className="treat-symbol" aria-hidden="true">
        {award.treat.icon}
        <span>🏆</span>
      </div>
      <div className="treat-copy">
        <span className="eyebrow">SURPRISE TROPHY UNLOCKED</span>
        <h2>
          {award.winnerName} wins {award.treat.name}!
        </h2>
        <p>
          {award.virtual
            ? "A virtual treat for the solo champion."
            : from
              ? `Courtesy of ${from}. Time to treat the winner!`
              : "A little victory, a delicious reward."}
        </p>
      </div>
    </section>
  );
}
