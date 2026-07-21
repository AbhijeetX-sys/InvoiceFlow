from extensions import db 
from werkzeug.security import generate_password_hash ,check_password_hash   
from datetime import datetime
class User(db.Model):
    id = db.Column(db.Integer,primary_key=True)
    username = db.Column(db.String(100),nullable=False) 
    email = db.Column(db.String(200),unique = True,nullable=False) 
    password = db.Column(db.String(255),nullable = False) 


    def set_password(self,password):
        self.password = generate_password_hash(password)
    def check_password(self,password):
        return check_password_hash(self.password,password)
    

class Customer(db.Model):
    id = db.Column(db.Integer,primary_key=True)
    username = db.Column(db.String(100),nullable=False)
    email=db.Column(db.String(200),nullable=True)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime,default=datetime.utcnow)
    user_id=db.Column(db.Integer,db.ForeignKey("user.id"),nullable=True)    



class Product(db.Model): 
    id = db.Column(db.Integer,primary_key = True)
    name = db.Column(db.String(100),nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10,2),nullable=False)
    stock = db.Column(db.Integer,nullable=False,default=0)
    gst_percentage = db.Column(db.Numeric(5,2),nullable=False)
    category = db.Column(db.String(100),nullable=False)
    created_at = db.Column(db.DateTime,default=datetime.utcnow)
    user_id = db.Column(db.Integer,db.ForeignKey('user.id'),nullable=False) 



class Invoice(db.Model):
    id = db.Column(db.Integer,primary_key=True) 
    invoice_number = db.Column(db.String(50),nullable=False , unique=True)
    customer_id = db.Column(db.Integer,db.ForeignKey('customer.id'),nullable=False)
    user_id = db.Column(db.Integer,db.ForeignKey('user.id'),nullable=False) 
    gst_total = db.Column(db.Numeric(10,2),nullable=False) 
    total_amount = db.Column(db.Numeric(10,2),nullable=False)
    created_at = db.Column(db.DateTime,default = datetime.utcnow)


class InvoiceItem(db.Model):
    id = db.Column(db.Integer,primary_key=True)
    product_name = db.Column(db.String(200), nullable=False)
    invoice_id = db.Column(db.Integer,db.ForeignKey('invoice.id'),nullable=False)
    product_id = db.Column(db.Integer,db.ForeignKey('product.id'),nullable=False)
    quantity = db.Column(db.Integer,nullable=False)
    price = db.Column(db.Numeric(10,2),nullable=False)
    gst_percentage = db.Column(db.Numeric(5,2),nullable=False)
    subtotal = db.Column(db.Numeric(10,2),nullable=False)
    # gst_amount = db.Column(db.Numeric(10,2), nullable=False)
    # total = db.Column(db.Numeric(10,2), nullable=False)




class StockHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer,db.ForeignKey("product.id"),nullable=False)
    product_name = db.Column(db.String(200),nullable=False)
    user_id = db.Column(db.Integer,db.ForeignKey("user.id"), nullable=False)
    invoice_id = db.Column(db.Integer,db.ForeignKey("invoice.id"),nullable=True) 
    previous_stock = db.Column(db.Integer,nullable=False)
    changed_quantity = db.Column(db.Integer,nullable=False)
    current_stock = db.Column(db.Integer,nullable=False)
    action = db.Column( db.String(20),nullable=False)
    created_at = db.Column(db.DateTime,default=datetime.utcnow)




class Business(db.Model):
    id = db.Column(db.Integer,primary_key=True)
    business_name = db.Column(db.String(200),nullable=False)
    owner_name = db.Column(db.String(200),nullable=False)
    phone = db.Column(db.String(20),nullable=False)
    email = db.Column(db.String(200),nullable=False)
    address = db.Column(db.Text,nullable=False)
    gst_number = db.Column(db.String(30),nullable=False )
    user_id = db.Column(db.Integer,db.ForeignKey("user.id"),unique=True,nullable=False) 

    