# VivoBook Setup — QuranHifz

## Contexte (2026-04-17)

Le repo avait 2 branches divergentes :
- `main` = Next.js PWA (Mac, PROD, deploye sur quranhifz.pages.dev)
- `master` = Expo SDK 54 (VivoBook, ABANDONNE)

**Decision : `main` (Next.js) est la seule branche active.**
`master` est archive dans le tag `archive/expo-master`.

## Setup VivoBook

### Option A : le repo existe deja

```cmd
cd %USERPROFILE%\repos\quran-hifz
git fetch --all
git checkout main
git pull origin main
npm install
```

Verifier : `git branch` doit afficher `* main`.

### Option B : clone fresh

```cmd
cd %USERPROFILE%\repos
git clone https://github.com/Soufi54/quran-hifz.git
cd quran-hifz
npm install
```

## Workflow quotidien

```cmd
cd %USERPROFILE%\repos\quran-hifz
git pull origin main
REM ... coder ...
git add .
git commit -m "description du changement"
git push origin main
```

## Ce qu'il ne faut JAMAIS faire

- `git checkout master` (branche archivee, app Expo obsolete)
- `git push origin master` (idem)
- Creer une copie du dossier pour "tester un truc" (utiliser une branche Git)
- Deployer sur GitHub Pages (on utilise Cloudflare Pages)

## Dev server

```cmd
npm run dev
```

Ouvre http://localhost:3000

## Deploy prod

Push sur `main` → Cloudflare Pages auto-deploy.
Ou manuellement :
```cmd
npm run build
npx wrangler pages deploy out --project-name=quranhifz
```
