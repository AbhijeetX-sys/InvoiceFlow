from flask import Blueprint,request,jsonify
from datetime import datetime, timedelta
from flask_jwt_extended import jwt_required ,get_jwt_identity 

from extensions import db 
from models import Product,Customer, Invoice,InvoiceItem ,StockHistory


invoice = Blueprint('invoice',__name__)


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
        product_name= product_name,
        user_id=user_id,
        invoice_id=invoice_id,
        previous_stock=previous_stock,
        changed_quantity=changed_quantity,
        current_stock=current_stock,
        action=action
    )

    db.session.add(history)



@invoice.route('/api/invoices', methods=['POST'])
@jwt_required()
def create_invoice():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Invalid or Missing JSON"
        }), 400

    customer_id = data.get("customer_id")
    products = data.get("products")

    if not customer_id:
        return jsonify({
            "message": "Customer is required"
        }), 400

    if not products:
        return jsonify({
            "message": "At least one product is required"
        }), 400

    customer = Customer.query.filter_by(
        id=customer_id,
        user_id=user_id
    ).first()

    if not customer:
        return jsonify({
            "message": "Customer not found"
        }), 404

    total_amount = 0
    gst_total = 0

    for item in products:

        product_id = item.get("product_id")
        quantity = item.get("quantity")

        if not product_id:
            return jsonify({
                "message": "Product ID is required"
            }), 400

        if not quantity:
            return jsonify({
                "message": "Quantity is required"
            }), 400

        product = Product.query.filter_by(
            id=product_id,
            user_id=user_id
        ).first()

        if not product:
            return jsonify({
                "message": f"Product {product_id} not found"
            }), 404

        if quantity > product.stock:
            return jsonify({
                "message": "Insufficient stock",
                "product": product.name,
                "available_stock": product.stock,
                "requested_quantity": quantity
            }), 400

        subtotal = product.price * quantity

        gst_amount = (subtotal * product.gst_percentage) / 100

        total_amount += subtotal + gst_amount

        gst_total += gst_amount

    
    try:
        

        last_invoice = Invoice.query.order_by(Invoice.id.desc()).first()

        if last_invoice:
            invoice_number = f"INV-{last_invoice.id + 1:04d}"
        else:
            invoice_number = "INV-0001"

        invoice = Invoice(
            invoice_number=invoice_number,
            customer_id=customer_id,
            user_id=user_id,
            gst_total=gst_total,
            total_amount=total_amount
        )

        db.session.add(invoice)
        db.session.flush()

        for item in products:

            product = Product.query.filter_by(
                id=item.get("product_id"),
                user_id=user_id
            ).first()

            quantity = item.get("quantity")

            subtotal = product.price * quantity

            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=product.id,
                product_name=product.name,
                quantity=quantity,
                price=product.price,
                gst_percentage=product.gst_percentage,
                subtotal=subtotal
            )

            db.session.add(invoice_item)

            previous_stock = product.stock

            product.stock -= quantity

            create_stock_history(
                product_id = product.id,
                product_name=product.name,
                user_id = user_id,
                invoice_id = invoice.id,
                previous_stock = previous_stock,
                changed_quantity =- quantity,
                current_stock = product.stock,
                action = "SALE"
            )

        db.session.commit()

        return jsonify({
            "message": "Invoice created successfully",
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "gst_total": float(invoice.gst_total),
            "total_amount": float(invoice.total_amount)
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Invoice creation failed",
            "error": str(e)
        }), 500 
    


@invoice.route('/api/invoices', methods=['GET'])
@jwt_required()
def get_invoices():

    user_id = int(get_jwt_identity())

    
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    
    query = Invoice.query.filter_by(
        user_id=user_id
    )

    
    if start_date:

        try:
            start_date = datetime.strptime(
                start_date,
                "%Y-%m-%d"
            )

            query = query.filter(
                Invoice.created_at >= start_date
            )

        except ValueError:

            return jsonify({
                "message": "Invalid start_date format. Use YYYY-MM-DD"
            }), 400

    
    if end_date:

        try:
            end_date = datetime.strptime(
                end_date,
                "%Y-%m-%d"
            )

            # Add one day so the complete end date is included
            end_date = end_date + timedelta(days=1)

            query = query.filter(
                Invoice.created_at < end_date
            )

        except ValueError:

            return jsonify({
                "message": "Invalid end_date format. Use YYYY-MM-DD"
            }), 400

    
    invoices = query.order_by(
        Invoice.created_at.desc()
    ).all()

    invoice_list = []

    for invoice in invoices:

        invoice_list.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_id": invoice.customer_id,
            "gst_total": float(invoice.gst_total),
            "total_amount": float(invoice.total_amount),
            "created_at": invoice.created_at.strftime(
                "%d-%m-%Y %H:%M:%S"
            )
        })

    return jsonify(invoice_list), 200

@invoice.route("/api/invoices/<int:invoice_id>", methods=["GET"])
@jwt_required()
def get_invoice(invoice_id):

    user_id = int(get_jwt_identity())

    invoice = Invoice.query.filter_by(id= invoice_id,user_id = user_id).first()

    if not invoice:
        return jsonify({
            'message':'Invoice not found'
        }),404 
    
    invoice_items = InvoiceItem.query.filter_by(
    invoice_id=invoice.id
).all() 

    items=[]

    for item in invoice_items: 
        items.append({
            'product_id':item.product_id,
            'product_name':item.product_name,
            'quantity':item.quantity,
            'price':float(item.price),
            'gst_percentage':float(item.gst_percentage),
            'subtotal':float(item.subtotal)
        })

    customer = Customer.query.filter_by(
        id=invoice.customer_id,user_id=user_id
    ).first()

    return jsonify({
        'invoice_id':invoice.id,
        'invoice_number':invoice.invoice_number,

        'customer' :{
            'id' : customer.id,
            'name': customer.username,
            'email':customer.email,
            'phone':customer.phone
        },

        'items' :items,

        'gst_total':float(invoice.gst_total),
        'total_amount': float(invoice.total_amount),

        'created_at' : invoice.created_at.strftime('%d-%m-%Y %H:%M:%S')

    })




@invoice.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
@jwt_required()
def delete_invoice(invoice_id):

    user_id = int(get_jwt_identity())

    invoice = Invoice.query.filter_by(id=invoice_id, user_id=user_id).first()
    
    if not invoice:
        return jsonify({
            'message': 'Invoice not found'
        }), 404

    
    invoice_items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
    try:

        for item in invoice_items:

            product = Product.query.filter_by(
                id=item.product_id,
                user_id=user_id
            ).first()

            if product is not None:

                previous_stock = product.stock

                product.stock = product.stock + item.quantity

                create_stock_history(
                    product_id=product.id,
                    product_name=product.name,
                    user_id=user_id,
                    invoice_id=invoice.id,
                    previous_stock=previous_stock,
                    changed_quantity=item.quantity,
                    current_stock=product.stock,
                    action="SALE_CANCELLED"
                )

        for item in invoice_items:
            db.session.delete(item)

        db.session.delete(invoice)    
        db.session.commit()

        return jsonify({
            "message": "Invoice cancelled successfully",
            "invoice_id": invoice_id
        }), 200
    except Exception as e:

        db.session.rollback()

        return jsonify({
            "message": "Invoice cancellation failed",
            "error": str(e)
        }), 500

