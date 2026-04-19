from fpdf import FPDF

def make_statement_pdf(output_path, profile_name, period, transactions, total):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "FinSight AI - Expense Statement", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Account Holder: {profile_name}", ln=True, align="C")
    pdf.cell(0, 6, f"Period: {period}", ln=True, align="C")
    pdf.ln(6)

    pdf.set_draw_color(180, 180, 180)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)

    pdf.set_fill_color(230, 240, 255)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(28, 8, "Date", border=1, fill=True)
    pdf.cell(38, 8, "Category", border=1, fill=True)
    pdf.cell(84, 8, "Description", border=1, fill=True)
    pdf.cell(30, 8, "Amount (INR)", border=1, fill=True, align="R")
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    fill = False
    for row in transactions:
        pdf.set_fill_color(245, 248, 255) if fill else pdf.set_fill_color(255, 255, 255)
        pdf.cell(28, 7, row["date"], border=1, fill=True)
        pdf.cell(38, 7, row["category"], border=1, fill=True)
        pdf.cell(84, 7, row["description"], border=1, fill=True)
        pdf.cell(30, 7, f"Rs. {row['amount']:,}", border=1, fill=True, align="R")
        pdf.ln()
        fill = not fill

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(210, 230, 255)
    pdf.cell(150, 8, "TOTAL", border=1, fill=True, align="R")
    pdf.cell(30, 8, f"Rs. {total:,}", border=1, fill=True, align="R")
    pdf.ln(10)

    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, "This statement was exported for upload to FinSight AI for expense tracking and budget analysis.", ln=True)
    pdf.cell(0, 6, "All amounts are in Indian Rupees (INR).", ln=True)

    pdf.output(output_path)
    print(f"Created: {output_path}")


# Arjun Mehta - April 16-30
arjun_transactions = [
    {"date": "2026-04-16", "category": "Transport",        "description": "Rapido - office commute",                  "amount": 150},
    {"date": "2026-04-17", "category": "Food & Dining",    "description": "Office team lunch",                        "amount": 450},
    {"date": "2026-04-18", "category": "Groceries",        "description": "BigBasket fortnightly order",              "amount": 3200},
    {"date": "2026-04-19", "category": "Food & Dining",    "description": "Swiggy - lunch",                          "amount": 350},
    {"date": "2026-04-20", "category": "Health",           "description": "Pharmacy - vitamins and medicines",        "amount": 380},
    {"date": "2026-04-21", "category": "Food & Dining",    "description": "Swiggy - dinner",                         "amount": 320},
    {"date": "2026-04-22", "category": "Household",        "description": "Laundry service - monthly",                "amount": 600},
    {"date": "2026-04-23", "category": "Personal Care",    "description": "Salon - haircut",                          "amount": 400},
    {"date": "2026-04-24", "category": "Food & Dining",    "description": "Office canteen",                           "amount": 250},
    {"date": "2026-04-25", "category": "Transport",        "description": "Petrol - bike refill",                     "amount": 600},
    {"date": "2026-04-26", "category": "Entertainment",    "description": "Netflix subscription",                     "amount": 649},
    {"date": "2026-04-27", "category": "Food & Dining",    "description": "Zomato - dinner",                         "amount": 280},
    {"date": "2026-04-28", "category": "Entertainment",    "description": "Spotify Premium",                          "amount": 119},
    {"date": "2026-04-29", "category": "Shopping",         "description": "Amazon - tech books",                      "amount": 599},
    {"date": "2026-04-30", "category": "Food & Dining",    "description": "Sunday brunch - Third Wave Coffee",        "amount": 750},
]
arjun_total = sum(r["amount"] for r in arjun_transactions)

make_statement_pdf(
    "/Users/kron/Coding/Projects/capstone/test/arjun_mehta/expenses_apr2026_second.pdf",
    "Arjun Mehta",
    "April 16 to 30, 2026",
    arjun_transactions,
    arjun_total,
)

# Vikram Sharma - April 16-30
vikram_transactions = [
    {"date": "2026-04-16", "category": "Transport",        "description": "Petrol refill - Honda City",               "amount": 2500},
    {"date": "2026-04-17", "category": "Groceries",        "description": "DMart monthly shopping",                   "amount": 3000},
    {"date": "2026-04-18", "category": "Education",        "description": "Kids tuition fees - Math and Science",     "amount": 3000},
    {"date": "2026-04-19", "category": "Health",           "description": "Paediatrician visit + medicines",           "amount": 1800},
    {"date": "2026-04-20", "category": "Education",        "description": "Kids activity class - chess and painting",  "amount": 2000},
    {"date": "2026-04-21", "category": "Utilities",        "description": "Broadband + mobile family plan",            "amount": 1500},
    {"date": "2026-04-22", "category": "Food & Dining",    "description": "Office lunch - bank cafeteria",            "amount": 450},
    {"date": "2026-04-23", "category": "Food & Dining",    "description": "Cook salary - second fortnight",           "amount": 1500},
    {"date": "2026-04-24", "category": "Home",             "description": "Home maintenance - plumber visit",          "amount": 800},
    {"date": "2026-04-25", "category": "Groceries",        "description": "Swiggy Instamart essentials",              "amount": 1200},
    {"date": "2026-04-26", "category": "Food & Dining",    "description": "Family birthday dinner - Mainland China",  "amount": 2000},
    {"date": "2026-04-27", "category": "Entertainment",    "description": "Weekend movie + popcorn - PVR",            "amount": 1200},
    {"date": "2026-04-28", "category": "Shopping",         "description": "Kids school supplies - books stationery",  "amount": 900},
    {"date": "2026-04-29", "category": "Transport",        "description": "Ola cab - wife commute",                   "amount": 600},
    {"date": "2026-04-30", "category": "Personal Care",    "description": "Grooming and household toiletries",         "amount": 700},
]
vikram_total = sum(r["amount"] for r in vikram_transactions)

make_statement_pdf(
    "/Users/kron/Coding/Projects/capstone/test/vikram_sharma/expenses_apr2026_second.pdf",
    "Vikram Sharma",
    "April 16 to 30, 2026",
    vikram_transactions,
    vikram_total,
)
