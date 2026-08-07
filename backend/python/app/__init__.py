import logging
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

from app.config import DEBUG, PORT
from app.database import init_db
from app.routes import ai, auth, emergency, gis, telemetry


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False
    CORS(app, origins="*")

    init_db()

    for blueprint in (auth.bp, ai.bp, gis.bp, emergency.bp, telemetry.bp):
        app.register_blueprint(blueprint)

    @app.get("/api/health")
    def health():
        return jsonify({"service": "joshrob-python-ai", "status": "ok", "port": PORT})

    @app.errorhandler(404)
    def not_found(_err):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def server_error(err):
        logging.exception("Unhandled error: %s", err)
        return jsonify({"error": "Internal service error."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    Path("data").mkdir(exist_ok=True)
    app.run(host="0.0.0.0", port=PORT, debug=DEBUG)
