.PHONY: install api web build serve test

# Run tools as `python -m <tool>` rather than via .venv/bin/<tool> scripts: those
# scripts hard-code the venv's absolute path and break if the project folder moves.
PY = .venv/bin/python

install: ## (re)create the Python venv and install both halves
	python3 -m venv --clear backend/.venv
	cd backend && $(PY) -m pip install -r requirements.txt
	cd frontend && npm install

api: ## Flask API with auto-reload on :5001
	cd backend && $(PY) -m flask --app brewfocus run --port 5001 --debug

web: ## Vite dev server on :5173 (proxies /api to :5001)
	cd frontend && npm run dev

build: ## production frontend bundle into frontend/dist
	cd frontend && npm run build

serve: build ## one process: Flask serves the API and the built app on :5001
	cd backend && $(PY) -m flask --app brewfocus run --port 5001

test:
	cd backend && $(PY) -m pytest -q
