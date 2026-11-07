export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Time used, with its units (Collins, 7 Nov 2026): "3m 58s", "45s", "4m". The clock keeps m:ss. */
export const duration = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r}s`;
  return r ? `${m}m ${r}s` : `${m}m`;
};
