import React from "react";
import { routeNotice } from "../shared/traffic.js";
export default function RouteNotice({ player, state }) {
  const notice =
    state?.phase === "racing"
      ? routeNotice(player, state.elapsed, state.now)
      : null;
  if (!notice) return null;
  return (
    <div
      className={`navigation-notice navigation-${notice.kind}`}
      role="status"
    >
      <span className="navigation-symbol" aria-hidden="true">
        {notice.icon}
      </span>
      <div>
        <b>
          {notice.label}
          {notice.meters != null ? ` · ${notice.meters} m` : ""}
        </b>
        <small>{notice.advice}</small>
      </div>
    </div>
  );
}
