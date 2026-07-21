from flask import Blueprint,request,jsonify 
from extensions import db
from models import User 
from flask_jwt_extended import create_access_token,jwt_required, get_jwt_identity

auth = Blueprint("auth",__name__)

@auth.route("/api/register", methods=["POST"])
def register():

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "username",
        "email",
        "password"
    ]

    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "message": f"{field.capitalize()} is required"
            }), 400

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    existing_user = User.query.filter_by(
    email=email
    ).first()

    if existing_user:
        return jsonify({
            "message": "Email already registered"
        }), 409

    user = User(
        username=username,
        email=email
    )

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "User registered successfully"
    }), 201



@auth.route("/api/login",methods = ['POST'])
def login():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(
        email=email
    ).first()

    if not user:
        return jsonify({
            "message":"User not Found"
        }),404
    

    if not user.check_password(password):
        return jsonify({
            "message":"Invalid password"
        }),401
    
    access_token=create_access_token(
        identity=str(user.id)
    )

    return jsonify({
        "message":"Login Successfully",
        "token":access_token
    }),200

@auth.route("/api/profile",methods=["GET","POST"])
@jwt_required()
def profile():
    user_id=int(get_jwt_identity())
    user = User.query.get(user_id)
    return jsonify({
        "id":user_id,
        "username":user.username,
        "email":user.email
    })  