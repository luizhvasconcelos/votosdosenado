import type { VoteCategory } from "@/lib/types";
import { voteLabels } from "@/lib/presentation";

export function VoteBadge({ value }: { value: VoteCategory }) {
  return <span className={`vote-badge vote-${value.toLowerCase()}`}>{voteLabels[value] || value}</span>;
}
