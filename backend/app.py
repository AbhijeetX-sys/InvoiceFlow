import traceback

try:
    from flask import Flask
    try:
        from flask_cors import CORS
        has_cors = True
    except ImportError:
        has_cors = False

    from config import Config
    from extensions import db, jwt

    from routes.auth import auth
    from routes.customer import customer
    from routes.product import product
    from routes.invoice import invoice
    from routes.dashboard import dashboard
    from routes.business import business
    from routes.pdf import pdf

    app = Flask(__name__)
    if has_cors:
        CORS(app)
    else:
        app.logger.warning("flask-cors is not installed. CORS is disabled.")

    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth)
    app.register_blueprint(customer)
    app.register_blueprint(product)
    app.register_blueprint(invoice)
    app.register_blueprint(dashboard)
    app.register_blueprint(business)
    app.register_blueprint(pdf)

    @app.route("/")
    def home():
        return {
            "message": "WELCOME TO INVOICE FLOW"
        }

except Exception as startup_err:
    err_tb = traceback.format_exc()
    print("STARTUP CRASHED! Traceback:")
    print(err_tb)
    from flask import Flask
    app = Flask(__name__)
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def error_page(path):
        return {
            "error": "Startup crashed",
            "traceback": err_tb
        }, 500

if __name__ == "__main__":
    import os
    with app.app_context():
        # Only try to create tables if the main app loaded successfully
        if "error_page" not in globals():
            db.create_all()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)