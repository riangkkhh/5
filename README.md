# מגרש אימון 3D

משחק אימון בסגנון באטל רויאל: בנייה, עריכה, קרב, סקוואד ובוטים, באטל רויאל של 50 שחקנים עם סערה.
הקוד כתוב ב-**TypeScript** (תיקיית `src/`) ומקומפל מראש לתיקיית `dist/`.

## העלאה ל-GitHub Pages (בלי התקנות)
1. צרו ריפוזיטורי חדש ב-GitHub והעלו אליו את **כל** הקבצים והתיקיות (כולל `.github` ו-`.nojekyll`).
2. בהגדרות הריפו: Settings ← Pages ← Source: **GitHub Actions**.
3. אחרי ה-push, הפעלה אוטומטית של ה-workflow תפרוס את האתר. הכתובת תופיע ב-Pages.

(חלופה: Source: Deploy from a branch ← main ← / (root).)

## מבנה
- `index.html` – טוען קטן. `vendor/three.min.js` – ספריית three.js (MIT).
- `src/*.ts` – קוד המשחק לפי סדר הטעינה. `dist/game.js` – התוצר המקומפל.
- `styles/style.css` – עיצוב ה-HUD והתפריטים.

## פיתוח (לא חובה)
`npm i && npm run build` – מקמפל מחדש את `src/` ל-`dist/game.js`.
