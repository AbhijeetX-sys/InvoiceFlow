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


if __name__ == "__main__":

    with app.app_context():
        db.create_all()

    app.run(debug=True)