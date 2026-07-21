
import os


class Config:

    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "instainvoice-secret-key-change-this"
    )

    SQLALCHEMY_DATABASE_URI = "sqlite:///invoice.db"

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY",
        "instainvoice-jwt-secret-key-change-this"
    )
 