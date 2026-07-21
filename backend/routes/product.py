from flask import Blueprint,request ,jsonify
from flask_jwt_extended import get_jwt_identity,jwt_required 

from extensions import db
from models import Product ,InvoiceItem,StockHistory


product = Blueprint("product",__name__)


def create_stock_history(
    product_id,
    product_name,
    user_id,
    invoice_id,
    previous_stock,
    changed_quantity,
    current_stock,
    action
):

    history = StockHistory(
        product_id=product_id,
        user_id=user_id,
        product_name = product_name,
        invoice_id=invoice_id,
        previous_stock=previous_stock,
        changed_quantity=changed_quantity,
        current_stock=current_stock,
        action=action
    )

    db.session.add(history)



@product.route("/api/products", methods=["POST"])
@jwt_required()
def add_product():

    user_id = int(get_jwt_identity())

    data = request.get_json() 

    if not data:
        return jsonify({
            "message": "Invalid or missing JSON"
        }), 400

    # validation
    required_fields = [
        "name",
        "price",
        "stock",
        "gst_percentage",
        "category"
    ]

    for field in required_fields:
        if data.get(field) is None or data.get(field) == "":
            return jsonify({
                "message": f"{field} is required"
            }), 400

    # Create Product
    product = Product(
        name=data.get("name"),
        description=data.get("description"),
        price=data.get("price"),
        stock=data.get("stock"),
        gst_percentage=data.get("gst_percentage"),
        category=data.get("category"),
        user_id=user_id
    )

    try:

        # Save to Database
        db.session.add(product)

        db.session.flush()

        create_stock_history(
            product_id=product.id,
            user_id=user_id,
            product_name=product.name,
            invoice_id=None,
            previous_stock=0,
            changed_quantity=product.stock,
            current_stock=product.stock,
            action="INITIAL_STOCK"
        )

        db.session.commit()

        return jsonify({
            "message": "Product added successfully"
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Product creation failed",
            "error": str(e)
        }), 500


@product.route("/api/products",methods=['GET'])
@jwt_required()
def get_products():

    user_id = int(get_jwt_identity())

    products = Product.query.filter_by(user_id=user_id).all()

    result = []

    for product in products:
        result.append({
            'id': product.id,
            'name': product.name,
            'description': product.description,
            'price': float(product.price),
            'stock': product.stock,
            'gst_percentage': float(product.gst_percentage),
            'category':product.category
        })

    return jsonify(result), 200



@product.route("/api/products/<int:product_id>",methods=['GET'])
@jwt_required()
def get_product(product_id):

    user_id = int(get_jwt_identity())

    product = Product.query.filter_by(id=product_id,user_id=user_id).first()

    if not product:
        return jsonify({
            'message':'Product not found'
        }),404 

    return jsonify({
        'id': product.id,
        'name': product.name,
        "description": product.description,
        "price": float(product.price),
        "stock": product.stock,
        "gst_percentage": float(product.gst_percentage),
        "category": product.category
    }),200

@product.route('/api/products/<int:product_id>',methods=['PUT'])
@jwt_required()
def update_product(product_id):

    user_id = int(get_jwt_identity())

    product = Product.query.filter_by( id = product_id, user_id = user_id ).first()

    if not product:
        return jsonify({
            'message':'Product not Found'
        }),404
    
    data = request.get_json()

    # Business Validation  

    if "price" in data and data["price"] <= 0:
        return jsonify({
            "message": "Price must be greater than 0"
        }), 400

    if "stock" in data and data["stock"] < 0:
        return jsonify({
            "message": "Stock cannot be negative"
        }), 400

    if "gst_percentage" in data and data["gst_percentage"] < 0:
        return jsonify({
            "message": "GST percentage cannot be negative"
        }), 400

    if "name" in data and not data["name"].strip():
        return jsonify({
            "message": "Product name cannot be empty"
        }), 400

    if "category" in data and not data["category"].strip():
        return jsonify({
            "message": "Category cannot be empty"
        }), 400




    try:

        product.name = data.get('name', product.name)
        product.description = data.get('description', product.description)
        product.price = data.get("price", product.price)
        product.stock = data.get("stock", product.stock)
        product.gst_percentage = data.get(
            "gst_percentage",
            product.gst_percentage
        )
        product.category = data.get(
            "category",
            product.category
        )

        db.session.commit()

        return jsonify({
            'message': 'Product Updated Successfully',
            'product': {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "price": float(product.price),
                "stock": product.stock,
                "gst_percentage": float(product.gst_percentage),
                "category": product.category
            }
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Product update failed",
            "error": str(e)
        }), 500


@product.route('/api/products/<int:product_id>',methods=['DELETE'])
@jwt_required()
def delete_product(product_id):

    user_id = int(get_jwt_identity())

    product=Product.query.filter_by(id=product_id,user_id=user_id).first()

    if not product:
        return jsonify({
            'message':'Product not Found'   
        }),404 
    
    invoice_item = InvoiceItem.query.filter_by(
      product_id=product.id
    ).first()

    if invoice_item:
        return jsonify({
            "message": "Product cannot be deleted because it is used in an invoice"
        }), 400
    
    try:

        db.session.delete(product)
        db.session.commit()

        return jsonify({
            "message": "Product Deleted Successfully"
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Product deletion failed",
            "error": str(e)
        }), 500
    

@product.route('/api/products/<product_id>/restock',methods=['POST'])
@jwt_required()
def restock_product(product_id):

    user_id = int(get_jwt_identity())

    product = Product.query.filter_by(
        id=product_id,
        user_id=user_id
    ).first()

    if not product:
        return jsonify({
            "message": "Product not found"
        }), 404
    
    data = request.get_json()

    quantity = data.get("quantity")

    if quantity is None or quantity <= 0:
        return jsonify({
            "message": "Restock quantity must be greater than 0"
        }), 400
    

    try:
        
        previous_stock = product.stock

        product.stock = product.stock + quantity

        create_stock_history(
            product_id=product.id,
            user_id=user_id,
            product_name=product.name,
            invoice_id=None,
            previous_stock=previous_stock,
            changed_quantity=quantity,
            current_stock=product.stock,
            action="PURCHASE"
        )

        db.session.commit()

        return jsonify({
            "message": "Product restocked successfully",
            "product": {
                "id": product.id,
                "name": product.name,
                "previous_stock": product.stock - quantity,
                "added_quantity": quantity,
                "current_stock": product.stock
            }
        }), 200
    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Product restock failed",
            "error": str(e)
        }), 500
    


@product.route("/api/stock-history", methods=["GET"])
@jwt_required()
def get_stock_history():

    user_id = int(get_jwt_identity())

    history = StockHistory.query.filter_by(
    user_id=user_id
    ).order_by(
            StockHistory.created_at.desc()
        ).all()

    result=[]

    for item in history:

        result.append({
            "product_name": item.product_name,
            "action": item.action,
            "previous_stock": item.previous_stock,
            "changed_quantity": item.changed_quantity,
            "current_stock": item.current_stock,
            "invoice_id": item.invoice_id,
            "created_at": item.created_at.strftime("%d-%m-%Y %H:%M:%S")
        })

    return jsonify(result), 200