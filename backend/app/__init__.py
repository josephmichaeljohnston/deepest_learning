import os
from flask import Flask
from flask_cors import CORS
from .config import Config
from .db import init_db


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    # Enable CORS for all routes
    # This allows the Next.js frontend to communicate with the Flask backend
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"],
            "supports_credentials": True
        }
    })

    # ensure instance folder exists
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass

    # initialize database
    init_db(app)

    # register flask-restx API (implements endpoints & Swagger UI)
    from .api import api as restx_api

    restx_api.init_app(app)

    return app
