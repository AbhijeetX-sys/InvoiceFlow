from flask import Blueprint,jsonify
from flask_jwt_extended import jwt_required,get_jwt_identity 
from sqlalchemy import func

from extensions import db 
from models import Invoice,Customer,Product,InvoiceItem

dashboard = Blueprint("dashboard", __name__)    

@dashboard.route('/api/dashboard',methods=['GET'])
@jwt_required()
def get_dashboard():

    user_id = int(get_jwt_identity())

    total_sales = db.session.query(
        func.sum(Invoice.total_amount)
    ).filter(
        Invoice.user_id == user_id
    ).scalar() or 0

    

    total_invoices = db.session.query(
    func.count(Invoice.id)
    ).filter(
        Invoice.user_id == user_id
    ).scalar() 


    total_customers = db.session.query(
    func.count(Customer.id)
    ).filter(
        Customer.user_id == user_id
    ).scalar()

    total_products = db.session.query(
        func.count(Product.id)
    ).filter(Product.user_id == user_id
    ).scalar()



    return jsonify ({
        "Dashboard":{
            'total_sales':float(total_sales),
            'total_invoices':total_invoices,
            'total_customers': total_customers,
            'total_product': total_products
        }
    }),200 


@dashboard.route('/api/monthly-sales',methods=['GET'])
@jwt_required()
def get_month_sales():

    user_id = int(get_jwt_identity())


    monthly_sales = db.session.query(
        func.extract('year',Invoice.created_at).label('year'),
        func.extract('month',Invoice.created_at).label('month'),
        func.sum(Invoice.total_amount).label('sales')
    ).filter(
        Invoice.user_id == user_id
    ).group_by(
        func.extract('year',Invoice.created_at),
        func.extract('month',Invoice.created_at)
    )

    monthly_sales = monthly_sales.all() 

    labels = []

    sales = []  

    for row in monthly_sales:
        labels.append(f"{int(row.year)}-{int(row.month):02d}")
        sales.append(float(row.sales))


    return jsonify({
        "labels": labels,
        "sales": sales
    }), 200


@dashboard.route("/api/top-products", methods=["GET"])
@jwt_required()
def get_top_products():

    user_id = int(get_jwt_identity())

    top_products = (
        db.session.query(
            Product.name.label('product'),
            func.sum(InvoiceItem.quantity).label('quantity')
        )
        .join(InvoiceItem, Product.id == InvoiceItem.product_id)
        .join(Invoice,Invoice.id == InvoiceItem.invoice_id)
        .filter(Invoice.user_id == user_id )
        .group_by(Product.id, Product.name)
        .order_by(func.sum(InvoiceItem.quantity).desc())
        .limit(5)
        .all()
    )
    products = []
    quantity = []

    for row in top_products:
        products.append(row.product)
        quantity.append(int(row.quantity))

    return jsonify({
        "products": products,
        "quantity": quantity
    }), 200


@dashboard.route("/api/low-stock", methods=["GET"])
@jwt_required()
def get_low_stock():

    user_id = int(get_jwt_identity())

    low_stock = (
    Product.query
    .filter(
        Product.user_id == user_id,
        Product.stock <= 10
    )
    .order_by(Product.stock.asc())
    .all()
)
    
    products = []

    for product in low_stock:
        products.append({
            "name": product.name,
            "stock": product.stock
        })

    return jsonify({
        "low_stock": products
    }), 200