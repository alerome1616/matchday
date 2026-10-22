"use client";
import { Check, MapPin } from "lucide-react";
import type { Fixture, Team } from "@/lib/types";
import { matchTime } from "@/lib/date";
export function TeamBadge({
  team,
  size = "normal",
}: {
  team: Team;
  size?: "normal" | "small";
}) {
  return (
    <span
      className={"team-badge " + size}
      style={{ "--team-color": team.color } as React.CSSProperties}
    >
      {team.logo ? (
        <img
          src={team.logo}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span>{team.short}</span>
    </span>
  );
}
export function FixtureCard({
  fixture: f,
  selected,
  disabled,
  onToggle,
}: {
  fixture: Fixture;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={"fixture-card " + (selected ? "selected" : "")}
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={
        (selected ? "Deseleccionar " : "Seleccionar ") +
        f.home.name +
        " contra " +
        f.away.name
      }
    >
      <span className="fixture-top">
        <span className="fixture-time">
          {matchTime(f.kickoff)} <span>Madrid</span>
        </span>
        <span className={"check-box " + (selected ? "checked" : "")}>
          {selected && <Check size={13} strokeWidth={3} />}
        </span>
      </span>
      <span className="fixture-league">{f.league}</span>
      <span className="teams">
        <span className="team">
          <TeamBadge team={f.home} />
          <strong>{f.home.name}</strong>
        </span>
        <span className="versus">
          {f.score ? f.score.home + "–" + f.score.away : "VS"}
        </span>
        <span className="team">
          <TeamBadge team={f.away} />
          <strong>{f.away.name}</strong>
        </span>
      </span>
      <span className="fixture-bottom">
        <span>
          <MapPin size={12} />
          {f.venue}
        </span>
        <span>
          {f.status === "NS"
            ? "Próximamente"
            : f.status === "LIVE"
              ? "En juego"
              : f.status === "FT"
                ? "Finalizado"
                : f.status === "PST"
                  ? "Aplazado"
                  : f.status === "CANC"
                    ? "Cancelado"
                    : f.status}
        </span>
      </span>
    </button>
  );
}
