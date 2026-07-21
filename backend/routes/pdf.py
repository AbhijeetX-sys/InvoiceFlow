from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from io import BytesIO

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
) 

from reportlab.lib import colors

from reportlab.lib.styles import getSampleStyleSheet

from models import (
    Business,
    Customer,
    Invoice,
    InvoiceItem
)

pdf = Blueprint("pdf", __name__)


@pdf.route("/api/invoices/<int:invoice_id>/pdf", methods=["GET"])
@jwt_required()
def generate_invoice_pdf(invoice_id):

    user_id = int(get_jwt_identity())

    invoice = Invoice.query.filter_by(
        id=invoice_id,
        user_id=user_id
    ).first()

    if not invoice:
        return jsonify({
            "message": "Invoice not found"
        }), 404

    business = Business.query.filter_by(
        user_id=user_id
    ).first()

    if not business:
        return jsonify({
            "message": "Business profile not found"
        }), 404

    customer = Customer.query.filter_by(
        id=invoice.customer_id,
        user_id=user_id
    ).first()

    if not customer:
        return jsonify({
            "message": "Customer not found"
        }), 404

    invoice_items = InvoiceItem.query.filter_by(
        invoice_id=invoice.id
    ).all()

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    elements = []

    # ==========================
    # COMPANY HEADER
    # ==========================

    elements.append(
        Paragraph(
            f"<b><font size='22'>{business.business_name}</font></b>",
            styles["Title"]
        )
    )

    elements.append(
        Paragraph(
            business.address,
            styles["Normal"]
        )
    )

    elements.append(
        Paragraph(
            f"Phone : {business.phone}",
            styles["Normal"]
        )
    )

    elements.append(
        Paragraph(
            f"Email : {business.email}",
            styles["Normal"]
        )
    )

    elements.append(
        Paragraph(
            f"GSTIN : {business.gst_number}",
            styles["Normal"]
        )
    )

    elements.append(Spacer(1, 20))

    # ==========================
    # TAX INVOICE
    # ==========================

    elements.append(
        Paragraph(
            "<b><font size='18'>TAX INVOICE</font></b>",
            styles["Title"]
        )
    )

    elements.append(Spacer(1, 20))

    # ==========================
    # INVOICE INFORMATION
    # ==========================

        # ==========================
    # INVOICE INFORMATION
    # ==========================

    invoice_number = Paragraph(
        f"""
        <b>INVOICE NUMBER</b><br/><br/>
        {invoice.invoice_number}
        """,
        styles["Normal"]
    )

    invoice_date = Paragraph(
        f"""
        <b>INVOICE DATE</b><br/><br/>
        {invoice.created_at.strftime('%d-%m-%Y %H:%M:%S')}
        """,
        styles["Normal"]
    )

    invoice_info = Table(
        [
            [
                invoice_number,
                invoice_date
            ]
        ],
        colWidths=[250, 250]
    )

    invoice_info.setStyle(
        TableStyle([
            (
                "GRID",
                (0, 0),
                (-1, -1),
                1,
                colors.grey
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                10
            )
        ])
    )

    elements.append(invoice_info)

    elements.append(Spacer(1, 20))


    # ==========================
    # SELLER & CUSTOMER DETAILS
    # ==========================

    seller_details = Paragraph(
        f"""
        <b>SELLER DETAILS</b><br/><br/>
        <b>Business:</b> {business.business_name}<br/>
        <b>Owner:</b> {business.owner_name}<br/>
        <b>Phone:</b> {business.phone}<br/>
        <b>Email:</b> {business.email}<br/>
        <b>GSTIN:</b> {business.gst_number}
        """,
        styles["Normal"]
    )

    customer_details = Paragraph(
        f"""
        <b>CUSTOMER DETAILS</b><br/><br/>
        <b>Name:</b> {customer.username}<br/>
        <b>Phone:</b> {customer.phone}<br/>
        <b>Email:</b> {customer.email}<br/>
        <b>Address:</b> {customer.address}
        """,
        styles["Normal"]
    )

    party_details = Table(
        [
            [
                seller_details,
                customer_details
            ]
        ],
        colWidths=[250, 250]
    )

    party_details.setStyle(
        TableStyle([
            (
                "GRID",
                (0, 0),
                (-1, -1),
                1,
                colors.grey
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                12
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                12
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                10
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                10
            )
        ])
    )

    elements.append(party_details)

    elements.append(Spacer(1, 20))
    

    
    # ==========================
    # PRODUCTS TABLE
    # ==========================

    table_data = [
    ["Product", "Qty", "Price", "GST %", "GST Amount", "Total"]
]

    for item in invoice_items:

        gst_amount = (
            float(item.price)
            * item.quantity
            * float(item.gst_percentage)
            / 100
        )

        total = (
            float(item.price)
            * item.quantity
        ) + gst_amount

        table_data.append([
            item.product_name,
            str(item.quantity),
            f"₹ {float(item.price):.2f}",
            f"{float(item.gst_percentage)}%",
            f"₹ {gst_amount:.2f}",
            f"₹ {total:.2f}"
        ])

    table = Table(
    table_data,
    colWidths=[150, 40, 80, 55, 85, 90]
)

    table.setStyle(TableStyle([

        ("BACKGROUND", (0,0), (-1,0), colors.darkblue),

        ("TEXTCOLOR", (0,0), (-1,0), colors.white),

        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),

        ("FONTSIZE", (0,0), (-1,-1), 10),

        ("BOTTOMPADDING", (0,0), (-1,0), 10),

        ("BACKGROUND", (0,1), (-1,-1), colors.beige),

        ("GRID", (0,0), (-1,-1), 1, colors.black),

        ("ALIGN", (1,1), (-1,-1), "CENTER"),

        ]))

    elements.append(table)

    elements.append(Spacer(1,20))

        # ==========================
        # TOTALS
        # ==========================


        # ==========================
    # TOTALS
    # ==========================

    subtotal = float(invoice.total_amount) - float(invoice.gst_total)

    totals_data = [
        ["Subtotal", f"₹ {subtotal:.2f}"],
        ["GST Total", f"₹ {float(invoice.gst_total):.2f}"],
        ["Grand Total", f"₹ {float(invoice.total_amount):.2f}"]
    ]

    totals_table = Table(
        totals_data,
        colWidths=[150, 150],
        hAlign="RIGHT"
    )

    totals_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 1, colors.grey),

            ("ALIGN", (1, 0), (1, -1), "RIGHT"),

            ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),

            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),

            ("FONTSIZE", (0, 0), (-1, -1), 11),

            ("TOPPADDING", (0, 0), (-1, -1), 8),

            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )

    elements.append(totals_table)

    elements.append(Spacer(1, 30))

        # ==========================
    # FOOTER
    # ==========================

    elements.append(
        Paragraph(
            "<b>Thank You For Your Business!</b>",
            styles["Heading2"]
        )
    )

    elements.append(Spacer(1, 20))

    elements.append(
        Paragraph(
            "This is a computer-generated invoice.",
            styles["Normal"]
        )
    )

    elements.append(Spacer(1, 40))

    elements.append(
        Paragraph(
            "<b>Authorized Signature</b>",
            styles["Normal"]
        )
    )


    doc.build(elements)

    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{invoice.invoice_number}.pdf"
    )

    