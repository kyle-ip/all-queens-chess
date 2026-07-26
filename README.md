# All Queens Chess / 皇后棋

Browser (H5) edition of ThinkFun’s *All Queens Chess*, with a manuscript-inspired UI, local hotseat, and AI difficulties.

**Live:** https://kyle-ip.github.io/all-queens-chess/

## Play locally

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Modes

- **Local** — two players on one device
- **vs AI** — Easy / Normal / Hard

Players choose who moves first and (in AI mode) which side to play. Queens move as in chess but **cannot capture**. First to align **four** queens in a contiguous line wins.

## Docs

- [Rules](docs/RULES.md)
- [Design](docs/DESIGN.md)

## GitHub Pages

Deploys automatically from `main` via GitHub Actions (`.github/workflows/deploy-pages.yml`).

In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
