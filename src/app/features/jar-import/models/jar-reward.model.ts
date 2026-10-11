import type { EngagementType } from '../../../core/models/engagement-type.enum';
import type { JarRewardKind } from './jar-reward-kind.type';

// A deposit's comment, read. Which fields are set depends on the kind.
export interface JarReward {
  kind: JarRewardKind;
  // The comment without its markers, whitespace collapsed, as written.
  text: string;
  // Folded and aliased: the habit, the exercise, or the whole text.
  label: string;
  level: string | null;
  // Reps, or seconds for a timed exercise.
  measure: number | null;
  score: number | null;
  engagement: EngagementType | null;
  sessions: number | null;
  // Streak bonus in percent; 0 when there is none.
  bonus: number;
  // What was paid without the bonus, rounded to whole hryvnias.
  baseReward: number;
  shifted: boolean;
  completed: boolean;
}
