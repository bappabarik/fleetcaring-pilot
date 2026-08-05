// Region config — one country per deployment (India and Dubai run as separate
// app builds). Mirrors the backend's env.ts region vars; set per-deployment in
// .env (same EXPO_PUBLIC_ pattern already used elsewhere in this app).

export const DEFAULT_COUNTRY_DIAL_CODE = process.env.EXPO_PUBLIC_DEFAULT_COUNTRY_DIAL_CODE ?? "+91";
