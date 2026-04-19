"""Generate test PDF bank statements for FinSight AI testing."""
import os

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
except ImportError:
    print("Installing reportlab...")
    os.system("pip install reportlab")
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

DIR = os.path.dirname(os.path.abspath(__file__))


def make_statement(filename, bank, account_holder, account_no, period, transactions):
    path = os.path.join(DIR, filename)
    doc = SimpleDocTemplate(path, pagesize=A4, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    elements = []

    # Header
    elements.append(Paragraph(f"<b>{bank}</b>", styles["Title"]))
    elements.append(Paragraph(f"Account Statement — {period}", styles["Heading2"]))
    elements.append(Paragraph(f"Account Holder: {account_holder}", styles["Normal"]))
    elements.append(Paragraph(f"Account No: {account_no}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    # Table
    header = ["Date", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)"]
    data = [header] + transactions

    table = Table(data, colWidths=[70, 220, 80, 80, 90])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    doc.build(elements)
    print(f"Created: {path}")


# --- Priya's February statement (different month from CSV) ---
priya_txns = [
    ["01-02-2026", "Opening Balance", "", "", "195,000.00"],
    ["01-02-2026", "Salary Credit Feb 2026", "", "1,85,000.00", "3,80,000.00"],
    ["02-02-2026", "HDFC Home Loan EMI", "42,000.00", "", "3,38,000.00"],
    ["02-02-2026", "Axis Car Loan EMI", "15,500.00", "", "3,22,500.00"],
    ["03-02-2026", "BOB Education Loan EMI", "7,000.00", "", "3,15,500.00"],
    ["04-02-2026", "BigBazaar Monthly Groceries", "7,800.00", "", "3,07,700.00"],
    ["05-02-2026", "BESCOM Electricity Bill", "3,200.00", "", "3,04,500.00"],
    ["06-02-2026", "Shell Petrol - Whitefield", "2,900.00", "", "3,01,600.00"],
    ["07-02-2026", "Kids School Fees - DPS", "18,000.00", "", "2,83,600.00"],
    ["08-02-2026", "Groww SIP - Large Cap", "8,000.00", "", "2,75,600.00"],
    ["08-02-2026", "Groww SIP - Flexi Cap", "5,000.00", "", "2,70,600.00"],
    ["09-02-2026", "Amazon Fresh Groceries", "3,800.00", "", "2,66,800.00"],
    ["10-02-2026", "Star Health Insurance", "2,800.00", "", "2,64,000.00"],
    ["11-02-2026", "Swiggy Instamart", "1,650.00", "", "2,62,350.00"],
    ["12-02-2026", "Netflix Family Plan", "649.00", "", "2,61,701.00"],
    ["13-02-2026", "Family Dinner - Mainland China", "5,200.00", "", "2,56,501.00"],
    ["14-02-2026", "Valentine's Day Gift - Tanishq", "12,000.00", "", "2,44,501.00"],
    ["15-02-2026", "Maintenance - Society", "5,500.00", "", "2,39,001.00"],
    ["16-02-2026", "Apollo Hospital - Health Checkup", "4,500.00", "", "2,34,501.00"],
    ["17-02-2026", "Croma - Washing Machine Repair", "2,200.00", "", "2,32,301.00"],
    ["18-02-2026", "ACT Fibernet Broadband", "1,099.00", "", "2,31,202.00"],
    ["19-02-2026", "Airtel Family Plan", "999.00", "", "2,30,203.00"],
    ["20-02-2026", "Kids Art Class - Monthly", "2,500.00", "", "2,27,703.00"],
    ["21-02-2026", "Spencer's Groceries", "2,400.00", "", "2,25,303.00"],
    ["22-02-2026", "Uber Rides (Week)", "1,600.00", "", "2,23,703.00"],
    ["23-02-2026", "PPF Deposit", "4,200.00", "", "2,19,503.00"],
    ["24-02-2026", "Wonderla Amusement Park", "3,800.00", "", "2,15,703.00"],
    ["25-02-2026", "Reliance Smart Groceries", "2,900.00", "", "2,12,803.00"],
    ["28-02-2026", "Adani Gas Bill", "1,100.00", "", "2,11,703.00"],
]

# --- Rohit's February statement (different month from CSV) ---
rohit_txns = [
    ["01-02-2026", "Opening Balance", "", "", "8,500.00"],
    ["01-02-2026", "Salary Credit Feb 2026", "", "40,000.00", "48,500.00"],
    ["02-02-2026", "Simpl BNPL Auto-Debit", "6,000.00", "", "42,500.00"],
    ["03-02-2026", "Kotak CC Min Due", "4,000.00", "", "38,500.00"],
    ["04-02-2026", "Swiggy Order", "290.00", "", "38,210.00"],
    ["05-02-2026", "Delhi Metro Recharge", "800.00", "", "37,410.00"],
    ["06-02-2026", "Zomato Order", "350.00", "", "37,060.00"],
    ["07-02-2026", "Groww SIP - Small Cap", "2,000.00", "", "35,060.00"],
    ["08-02-2026", "YouTube Premium", "149.00", "", "34,911.00"],
    ["09-02-2026", "Swiggy Order", "310.00", "", "34,601.00"],
    ["10-02-2026", "Airtel Recharge", "449.00", "", "34,152.00"],
    ["11-02-2026", "Flipkart - Headphones", "2,499.00", "", "31,653.00"],
    ["12-02-2026", "Swiggy Order", "280.00", "", "31,373.00"],
    ["13-02-2026", "PVR Movie + Popcorn", "780.00", "", "30,593.00"],
    ["14-02-2026", "Blinkit Groceries", "1,100.00", "", "29,493.00"],
    ["15-02-2026", "Spotify Premium", "119.00", "", "29,374.00"],
    ["16-02-2026", "Friends Party - UPI Split", "650.00", "", "28,724.00"],
    ["17-02-2026", "Zomato Order", "420.00", "", "28,304.00"],
    ["18-02-2026", "Electricity Bill Share", "600.00", "", "27,704.00"],
    ["19-02-2026", "Swiggy Order", "340.00", "", "27,364.00"],
    ["20-02-2026", "Rapido Rides (Week)", "380.00", "", "26,984.00"],
    ["21-02-2026", "Blinkit Groceries", "850.00", "", "26,134.00"],
    ["22-02-2026", "Myntra - Sneakers", "2,799.00", "", "23,335.00"],
    ["23-02-2026", "Swiggy Order", "260.00", "", "23,075.00"],
    ["24-02-2026", "UPI - Mom Contribution", "5,000.00", "", "18,075.00"],
    ["25-02-2026", "Zomato Order", "390.00", "", "17,685.00"],
    ["26-02-2026", "Uber Auto", "160.00", "", "17,525.00"],
    ["27-02-2026", "Swiggy Order", "300.00", "", "17,225.00"],
    ["28-02-2026", "Steam Game Purchase", "449.00", "", "16,776.00"],
]

if __name__ == "__main__":
    make_statement(
        "priya_feb_statement.pdf",
        "HDFC Bank",
        "Priya Sharma",
        "XXXX-XXXX-4521",
        "February 2026",
        priya_txns,
    )
    make_statement(
        "rohit_feb_statement.pdf",
        "Kotak Mahindra Bank",
        "Rohit Verma",
        "XXXX-XXXX-8834",
        "February 2026",
        rohit_txns,
    )
    print("\nDone! PDFs generated.")
