# ===================================================
# INSTRUKCJA WRZUCENIA STRONY NA INFINITYFREE
# ===================================================

## ⚠️ Ważne – Czego InfinityFree NIE obsługuje
#
# InfinityFree = tylko PHP + pliki statyczne.
# Node.js (backend) i Bot Discord NIE działają na InfinityFree.
#
# Plan:
#   FRONTEND (React) → InfinityFree ✅
#   BACKEND (Node.js) → Railway / Render (darmowe) ✅
#   BOT Discord → Railway / osobny VPS ✅

## KROK 1 – Postaw backend na Railway (darmowe)
#
#  1. Wejdź na https://railway.app → zaloguj się przez GitHub
#  2. "New Project" → "Deploy from GitHub repo"
#  3. Wskaż folder /strona/backend (albo wgraj jako osobne repozytorium)
#  4. Dodaj zmienne środowiskowe (Variables):
#
#     NODE_ENV=production
#     PORT=5000
#     MONGODB_URI=mongodb+srv://...    ← MongoDB Atlas (darmowe)
#     JWT_ACCESS_SECRET=...           ← min. 32 losowe znaki
#     JWT_REFRESH_SECRET=...          ← min. 32 inne losowe znaki
#     FRONTEND_URL=https://twoj-login.infinityfreeapp.com
#     BOT_API_URL=https://twoj-bot.up.railway.app
#     BOT_API_SECRET=...              ← identyczny jak w bocie
#
#  5. Railway automatycznie uruchomi backend i da Ci URL np.:
#     https://kalkulator-backend.up.railway.app

## KROK 2 – Skonfiguruj .env frontendu
#
#  W folderze strona/frontend/ stwórz plik .env:

VITE_API_URL=https://kalkulator-backend.up.railway.app

## KROK 3 – Zbuduj frontend
#
#  Uruchom w folderze strona/frontend/:
#
#     npm install
#     npm run build
#
#  Powstanie folder dist/ z gotowymi plikami.

## KROK 4 – Wrzuć na InfinityFree
#
#  1. Zaloguj się na https://app.infinityfree.com
#  2. Wejdź w "File Manager" → folder htdocs
#  3. Usuń domyślny index.html (jeśli jest)
#  4. Wgraj CAŁĄ zawartość folderu dist/ do htdocs:
#     - index.html
#     - assets/ (folder z JS/CSS)
#     - .htaccess  ← WAŻNE! Ten plik musi być – obsługuje React Router
#
#  ⚠️ Uwaga: w File Manager InfinityFree pliki ukryte (.htaccess)
#  mogą nie być widoczne – użyj FTP zamiast File Manager.
#  Dane FTP znajdziesz w panelu konta InfinityFree.

## KROK 5 – Sprawdź czy działa
#
#  Wejdź na swój adres np. https://twoj-login.infinityfreeapp.com
#  Strona powinna się załadować i komunikować z backendem na Railway.

## FTP – jak wgrać .htaccess
#
#  Program: FileZilla (darmowy) – https://filezilla-project.org
#  Host:     (z panelu InfinityFree → FTP Details)
#  Port:     21
#  Zaloguj się i przeciągnij zawartość dist/ do htdocs/
