export interface DeviceSnapshot {
  readonly canonical: string;
  readonly counts: Readonly<Record<string, number>>;
  readonly balance: number;
}
