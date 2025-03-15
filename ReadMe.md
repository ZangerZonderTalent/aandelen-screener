Checklist: Lokale Opstart in de Bouwfase

Deze checklist gaat uit van:
- Je backend-map heet `backend` (met `main.py`).
- Je frontend-map heet `manual-frontend` (met `App.js`).
- Je gebruikt Visual Studio Code (VS Code).
- Je hebt een virtuele omgeving (`venv`) in `my-screener-project`.

Stap A: Visual Studio Code openen
1. Open VS Code.
2. Open de folder `my-screener-project` (waar `backend`, `manual-frontend` en `venv` naast elkaar staan).

Stap B: Virtuele omgeving activeren (voor de backend)
1. Open een nieuwe terminal in VS Code.
2. Zorg dat de terminal het liefst Command Prompt is.
3. Typ:
   cd venv\Scripts
   activate.bat
4. Je ziet nu (venv) voor je prompt.
5. Ga terug naar de hoofdmap:
   cd ../..

Stap C: Backend starten (FastAPI)
1. Typ:
   cd backend
   uvicorn main:app --reload
2. Laat dit terminalvenster open staan. De backend draait nu op http://127.0.0.1:8000.

Stap D: Frontend starten (React)
1. Maak in VS Code een tweede terminal (klik op de + in de terminalbalk).
2. Ga naar de frontend-map:
   cd manual-frontend
3. Start de React-app:
   npm start
4. De app draait op http://localhost:3000.

Stap E: Testen
1. Ga in je browser naar http://127.0.0.1:8000/screener?volume=500000 om de API te checken.
2. Ga in je browser naar http://localhost:3000 voor de frontend.
3. Pas filters aan, klik Zoeken. Check of je resultaten ziet.

Stap F: Afsluiten
1. Sluit de React-frontend: Ctrl + C in het terminalvenster van de frontend.
2. Sluit de backend: Ctrl + C in het terminalvenster van de backend.
3. (Optioneel) Typ deactivate om de virtuele omgeving uit te schakelen.
