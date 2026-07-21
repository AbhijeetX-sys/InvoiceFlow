from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import Customer, Invoice


customer = Blueprint("customer", __name__)




@customer.route("/api/customers", methods=["POST"])
@jwt_required()
def add_customer():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "username",
        "phone",
        "address"
    ]

    for field in required_fields:

        if not data.get(field):
            return jsonify({
                "message": f"{field.capitalize()} is required"
            }), 400

    try:

        customer = Customer(
            username=data.get("username"),
            email=data.get("email"),
            phone=data.get("phone"),
            address=data.get("address"),
            user_id=user_id
        )

        db.session.add(customer)

        db.session.commit()

        return jsonify({
            "message": "Customer added successfully",
            "customer": {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address
            }
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Customer creation failed",
            "error": str(e)
        }), 500



@customer.route("/api/customers", methods=["GET"])
@jwt_required()
def get_customers():

    user_id = int(get_jwt_identity())

    customers = Customer.query.filter_by(
        user_id=user_id
    ).all()

    result = []

    for customer in customers:

        result.append({
            "id": customer.id,
            "username": customer.username,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address
        })

    return jsonify(result), 200




@customer.route("/api/customers/<int:customer_id>", methods=["GET"])
@jwt_required()
def get_customer(customer_id):

    user_id = int(get_jwt_identity())

    customer = Customer.query.filter_by(
        id=customer_id,
        user_id=user_id
    ).first()

    if not customer:
        return jsonify({
            "message": "Customer not found"
        }), 404

    return jsonify({
        "id": customer.id,
        "username": customer.username,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address
    }), 200




@customer.route(
    "/api/customers/<int:customer_id>",
    methods=["PUT"]
)
@jwt_required()
def update_customer(customer_id):

    user_id = int(get_jwt_identity())

    customer = Customer.query.filter_by(
        id=customer_id,
        user_id=user_id
    ).first()

    if not customer:
        return jsonify({
            "message": "Customer not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Invalid or missing JSON"
        }), 400

    if "username" in data and not data["username"].strip():

        return jsonify({
            "message": "Username cannot be empty"
        }), 400

    if "phone" in data and not data["phone"].strip():

        return jsonify({
            "message": "Phone cannot be empty"
        }), 400

    if "address" in data and not data["address"].strip():

        return jsonify({
            "message": "Address cannot be empty"
        }), 400

    try:

        customer.username = data.get(
            "username",
            customer.username
        )

        customer.email = data.get(
            "email",
            customer.email
        )

        customer.phone = data.get(
            "phone",
            customer.phone
        )

        customer.address = data.get(
            "address",
            customer.address
        )

        db.session.commit()

        return jsonify({
            "message": "Customer updated successfully",
            "customer": {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address
            }
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Customer update failed",
            "error": str(e)
        }), 500



@customer.route(
    "/api/customers/<int:customer_id>",
    methods=["DELETE"]
)
@jwt_required()
def delete_customer(customer_id):

    user_id = int(get_jwt_identity())

    customer = Customer.query.filter_by(
        id=customer_id,
        user_id=user_id
    ).first()

    if not customer:
        return jsonify({
            "message": "Customer not found"
        }), 404

    # Check if customer is used in an invoice

    invoice = Invoice.query.filter_by(
        customer_id=customer.id,
        user_id=user_id
    ).first()

    if invoice:

        return jsonify({
            "message": "Customer cannot be deleted because it is used in an invoice"
        }), 400

    try:

        db.session.delete(customer)

        db.session.commit()

        return jsonify({
            "message": "Customer deleted successfully"
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Customer deletion failed",
            "error": str(e)
        }), 500