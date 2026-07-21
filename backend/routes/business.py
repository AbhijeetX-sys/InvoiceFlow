from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import Business 

business = Blueprint("business", __name__) 


@business.route('/api/business-profile',methods=['POST'])
@jwt_required()
def create_business():

    user_id = int(get_jwt_identity())

    business = Business.query.filter_by(
        user_id = user_id
    ).first()

    if business:
        return jsonify ({
            'message':'Business Profile already exists'
        }),400 
    
    data = request.get_json()  

    if not data:
        return jsonify({
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
    "business_name",
    "owner_name",
    "phone",
    "email",
    "address",
    "gst_number"
] 
    
    for field in required_fields:

        if data.get(field) is None or data.get(field) == "":
            return jsonify({
                'message':f'{field} is required'
            }),400
    
    business = Business(
    business_name=data.get("business_name"),
    owner_name=data.get("owner_name"),
    phone=data.get("phone"),
    email=data.get("email"),
    address=data.get("address"),
    gst_number=data.get("gst_number"),
    user_id=user_id
)
    

    try:
        db.session.add(business)
        db.session.commit()

        return jsonify({
            "message": "Business profile created successfully"
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Business profile creation failed",
            "error": str(e)
        }), 500
    

@business.route("/api/business-profile", methods=["GET"])
@jwt_required()
def get_business():

    user_id = int(get_jwt_identity())

    business = Business.query.filter_by(
        user_id=user_id
    ).first()

    if not business:
        return jsonify({
            "message": "Business profile not found"
        }), 404

    return jsonify({
        "id": business.id,
        "business_name": business.business_name,
        "owner_name": business.owner_name,
        "phone": business.phone,
        "email": business.email,
        "address": business.address,
        "gst_number": business.gst_number
    }), 200


@business.route("/api/business-profile", methods=["PUT"])
@jwt_required()
def update_business():

    user_id = int(get_jwt_identity())

    business = Business.query.filter_by(
        user_id=user_id
    ).first()

    if not business:
        return jsonify({
            "message": "Business profile not found"
        }), 404

    data = request.get_json() 

    if not data:
        return jsonify({
            "message": "Invalid or missing JSON"
        }), 400

    try:

        if "business_name" in data:
            business.business_name = data["business_name"]

        if "owner_name" in data:
            business.owner_name = data["owner_name"]

        if "phone" in data:
            business.phone = data["phone"]

        if "email" in data:
            business.email = data["email"]

        if "address" in data:
            business.address = data["address"]

        if "gst_number" in data:
            business.gst_number = data["gst_number"]

        db.session.commit()

        return jsonify({
            "message": "Business profile updated successfully"
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Business profile update failed",
            "error": str(e)
        }), 500