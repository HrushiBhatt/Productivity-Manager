"""Brew Focus API. Run with: flask --app brewfocus run --port 5001"""

import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from .api import api
from .models import db

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    os.makedirs(app.instance_path, exist_ok=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", f"sqlite:///{Path(app.instance_path) / 'brewfocus.db'}"
    )
    app.config.update(config or {})

    db.init_app(app)
    app.register_blueprint(api)
    with app.app_context():
        db.create_all()

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path):
        """Serve the production React build so one process runs the whole app."""
        if path.startswith("api/"):
            return jsonify(error="not found"), 404
        if path and (DIST / path).is_file():
            return send_from_directory(DIST, path)
        if (DIST / "index.html").is_file():
            return send_from_directory(DIST, "index.html")
        return "Frontend not built. Run `npm run build` in frontend/, or use the Vite dev server.", 404

    return app
