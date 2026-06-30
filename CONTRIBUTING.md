# Contributing to QR Vault

## Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/solvfpz/upi2qr.git
   cd upi2qr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── App.tsx              # Main application component
├── types.ts             # Shared TypeScript types
├── index.css            # Global styles (Tailwind + custom CSS)
├── main.tsx             # Entry point
└── components/
    └── RecentHistory.tsx # Recent history section
```

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint
- `npm run typecheck` — Run TypeScript type checking

## Making Changes

- The app uses React 18 + TypeScript + Vite + Tailwind CSS.
- Icons are from `lucide-react`.
- QR codes are generated via the `api.qrserver.com` API.
- No state management library — plain `useState`/`useRef`/`useCallback`.
- Recent history is stored in `localStorage` under the key `qrHistory`.

## Pull Request Guidelines

1. Create a feature branch from `main`.
2. Make your changes.
3. Run `npm run typecheck` and `npm run lint` — both must pass.
4. Run `npm run build` to verify the production build succeeds.
5. Open a pull request with a clear description of the change.

## Design Notes

- The app uses a premium dark glassmorphism theme.
- Colors, spacing, and typography should remain consistent.
- Avoid adding external dependencies unless absolutely necessary.
- Keep the privacy posture intact: "No payments stored or processed."
