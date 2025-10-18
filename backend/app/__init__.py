import os
from flask import Flask
from .config import Config
from .db import init_db


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    # ensure instance folder exists
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass

    # initialize database
    init_db(app)

    # register routes
    from .routes import bp as main_bp

    app.register_blueprint(main_bp)

    return app
