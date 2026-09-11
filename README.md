# Adaptive Multi-Agent Bug Intelligence Platform

Team: Rachel Patni (graph + API + integration), Khushi Yadav (data + ML + DB), Isha S U (frontend).



## Rules
1. `git pull` before you start. Commit + push small and often.
2. Never commit `.env`. Copy `.env.example` to `.env`, use your own Gemini key.
3. Feature freeze: 1pm on demo day. Bugs only after that.
4. Keep function signatures in `backend/app/ml/interfaces.py` exactly as they are.

## Run backend
```
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
