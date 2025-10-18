Flask backend for lecture processing

Endpoints:
- POST /instantiate-lecture  (multipart/form-data) fields: file (pdf), text
- GET /step/<id>/<slide>      (calls process_step in app/handlers.py)
- POST /answer/<id>/<slide>   (JSON body: { "question": "..." }, calls answer_question in app/handlers.py)

Quick start (local):
- Copy `.env.example` to `.env` and adjust DB settings if needed.
- Install deps: `pip install -r requirements.txt`
- Start a MySQL instance (or use Docker Compose below).
- Run: `python run.py`

Docker (with MySQL):
- docker compose up --build

The `app/handlers.py` file contains stubs for `process_step` and `answer_question` — replace them with your logic.
