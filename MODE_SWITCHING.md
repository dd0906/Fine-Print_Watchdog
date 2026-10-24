# Test for free, then switch to real Nebius AI

This project intentionally supports two modes. Keep the same codebase for both.

## A. Zero-token test mode (default)

In the project-root `.env` file set:

```dotenv
WATCHDOG_MODE=demo
NEBIUS_API_KEY=
```

Restart the server after changing `.env`. In this mode the app uses local checklist/rule-based review and text comparison. It does **not** call Nebius, NVIDIA-hosted inference, or any external model API. This lets you test upload, text extraction, local findings, source matching, Privacy Shield scanning, compare, and PDF export without consuming model tokens. It is not a substitute for AI quality testing.

A key may remain in `.env` while `WATCHDOG_MODE=demo`; the backend still must not call the model. For the safest test, leave the key blank.

## B. Real AI mode (Nebius Token Factory + Nemotron)

When you are ready for a real model test, set:

```dotenv
WATCHDOG_MODE=hosted
NEBIUS_API_KEY=YOUR_REAL_NEBIUS_KEY
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_MODEL=nvidia/Nemotron-3_5-Lightning
```

Save `.env` and restart the server. Hosted analysis consumes tokens. Run one short fictional document first. Never put `.env` or the API key in a public repository or ZIP.

To stop token usage, change `WATCHDOG_MODE=demo` and restart the server.

## What the tests prove

Automated tests cover the local demo path, provider configuration/request formatting using a mocked HTTP response, quote verification, privacy masking, and other backend behavior. Mocked provider tests do not consume real tokens. Automated tests cannot prove the external Nebius service accepts your actual key; perform only one live short-document check when ready.
