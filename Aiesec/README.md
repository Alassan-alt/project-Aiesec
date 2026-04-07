# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Mystery Box (AIESEC) – Démarrage

Ce projet utilise **Tailwind CSS v4** + Vite.

### Lancer en dev

Dans le dossier `project-Aiesec/Aiesec` :

```bash
pnpm install
pnpm dev
```

Ou depuis le dossier `project-Aiesec/` :

```bash
pnpm -C Aiesec install
pnpm -C Aiesec dev
```

### Si Tailwind ne s’applique pas

Vérifie ces points (et redémarre le serveur dev après installation):

- Le CSS global contient bien `@import 'tailwindcss';` dans `src/index.css`.
- PostCSS est configuré pour Tailwind v4 dans `postcss.config.js` avec `@tailwindcss/postcss`.
- `src/main.tsx` importe `./index.css`.

## API Server (MongoDB) – Démarrage

Le backend est dans `project-Aiesec/server` et utilise **MongoDB**.

### Variables d’environnement

Dans `project-Aiesec/server/.env` :

- `MONGODB_URI` (ex: `mongodb://localhost:27017` ou votre URI Atlas)
- `MONGODB_DB` (ex: `aiesec_mysterybox`)
- `JWT_SECRET` (min 16 caractères)

### Lancer en dev

Depuis `project-Aiesec/` :

```bash
pnpm -C server install
pnpm -C server dev
```


You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
