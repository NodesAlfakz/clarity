# @clarity/extension

Chrome Manifest V3 extension — pre-sign transaction safety overlay (Mode 2 Guardian).

## Architecture

```
manifest.json          — MV3 manifest
src/
├── content.ts         — MAIN-world shim for window.ethereum.request
├── bridge.ts          — ISOLATED-world relay between MAIN and background
├── background.ts      — Service worker, holds session state and API calls
└── popup/             — React-based popup UI
    ├── popup.html
    ├── main.tsx
    └── App.tsx
```

## Dev

```bash
npm install
npm run dev
# load unpacked from ./dist in chrome://extensions (Developer mode on)
```

## Status

D1-2 scaffold complete. Transaction analysis logic, Engine API integration, and localized UI copy land in D3-4.
