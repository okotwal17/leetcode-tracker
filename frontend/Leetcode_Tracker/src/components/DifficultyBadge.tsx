// A small colored pill for the difficulty. Green / amber / red map to
// Easy / Medium / Hard — the color convention LeetCode users already expect.
// The actual colors live in CSS (.badge--easy etc.) so light/dark theming stays
// in one place.
import type { Difficulty } from "../types";

const CLASS: Record<Difficulty, string> = {
  Easy: "badge--easy",
  Medium: "badge--medium",
  Hard: "badge--hard",
};

export default function DifficultyBadge({
  difficulty,
}: {
  difficulty: Difficulty;
}) {
  return <span className={`badge ${CLASS[difficulty]}`}>{difficulty}</span>;
}
