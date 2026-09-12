export class DailyScoreTier {
  constructor(
    public readonly minScore: number,
    public readonly maxScore: number,
    public readonly label: string,
    public readonly description: string,
    public readonly icon: string,
    public readonly badgeClass: string
  ) {}

  contains(score: number): boolean {
    return score >= this.minScore && score <= this.maxScore;
  }
}
