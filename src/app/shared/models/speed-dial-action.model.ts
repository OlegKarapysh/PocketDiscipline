export interface SpeedDialAction {
  readonly icon: string;
  readonly label: string;
  readonly path: string;
  readonly queryParams?: Readonly<Record<string, string>>;
}
