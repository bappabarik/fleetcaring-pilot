# FleetCaring Pilot — Setup

```bash
npm install
cp .env.example .env
npm run typecheck
npm start
```

Scan the QR with Expo Go, or run on a simulator (`npm run ios` / `npm run android`).

**Important**: `EXPO_PUBLIC_API_BASE_URL` needs to be an address your phone
can actually reach — `localhost` only works in an iOS Simulator on the
same machine as the backend. For a physical device or Android emulator,
use your machine's LAN IP (e.g. `http://192.168.1.50:4000`) or an ngrok
tunnel to the backend.

## What's built so far (Step 2 of the build order — see ARCHITECTURE.md)

- Auth: phone+OTP (4-digit code, 60s resend cooldown) and email/Pilot ID
  + password, matching the confirmed backend contract exactly
- Secure token storage (`expo-secure-store`, not AsyncStorage — refresh
  tokens are credentials)
- Same auto-refresh-on-401 API client pattern already proven in the admin
  panel, including the Content-Type fix for no-body requests
- A placeholder home screen only, so Auth could be fully tested end to
  end (including sign-out) before Step 3 (the real Home dashboard) starts

## Next step

Step 3: Home dashboard (shift states) + Start/End shift — see
ARCHITECTURE.md's build order.
