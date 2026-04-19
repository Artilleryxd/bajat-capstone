"""Generate Arjun's investment portfolio statement PDF for testing parse-portfolio endpoint."""
import os

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
except ImportError:
    print("Installing reportlab...")
    os.system("pip install reportlab")
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm

DIR = os.path.dirname(os.path.abspath(__file__))

BRAND   = colors.HexColor("#1a3c5e")
ACCENT  = colors.HexColor("#2563eb")
LIGHT   = colors.HexColor("#f0f4ff")
SUCCESS = colors.HexColor("#16a34a")
WARN    = colors.HexColor("#d97706")
GREY    = colors.HexColor("#6b7280")


def build_pdf():
    path = os.path.join(DIR, "arjun_portfolio_statement.pdf")
    doc = SimpleDocTemplate(path, pagesize=A4,
                            topMargin=15*mm, bottomMargin=15*mm,
                            leftMargin=15*mm, rightMargin=15*mm)
    styles = getSampleStyleSheet()
    bold   = ParagraphStyle("bold",   parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9)
    small  = ParagraphStyle("small",  parent=styles["Normal"], fontSize=7.5, textColor=GREY)
    header = ParagraphStyle("header", parent=styles["Normal"], fontName="Helvetica-Bold",
                             fontSize=14, textColor=BRAND)
    sub    = ParagraphStyle("sub",    parent=styles["Normal"], fontSize=9, textColor=GREY)

    elems = []

    # ── Header ────────────────────────────────────────────────────────────────
    elems.append(Paragraph("FinSight Portfolio Statement", header))
    elems.append(Paragraph("Groww &amp; Zerodha — Combined Holdings | 19 April 2026", sub))
    elems.append(Spacer(1, 4*mm))
    elems.append(HRFlowable(width="100%", thickness=1.5, color=BRAND))
    elems.append(Spacer(1, 3*mm))

    # ── Investor + Goal summary ───────────────────────────────────────────────
    summary_data = [
        ["Investor", "Arjun Mehta",         "PAN", "ABCPA1234Z"],
        ["Account",  "Groww + Zerodha",     "Statement Period", "01 Jan 2026 – 19 Apr 2026"],
        ["Investment Goal", "₹50,00,000",   "Target Year", "2041"],
        ["Current Portfolio Value", "₹8,52,450", "Overall XIRR", "14.20 %"],
        ["Monthly SIP Amount", "₹18,000",   "SIP Debit Date", "5th of every month"],
    ]
    summary_table = Table(summary_data, colWidths=[45*mm, 55*mm, 45*mm, 45*mm])
    summary_table.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",  (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (0, -1), BRAND),
        ("TEXTCOLOR", (2, 0), (2, -1), BRAND),
        ("BACKGROUND",(0, 0), (-1, -1), LIGHT),
        ("GRID",      (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("TOPPADDING", (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
    ]))
    elems.append(summary_table)
    elems.append(Spacer(1, 5*mm))

    # ── Asset Allocation ──────────────────────────────────────────────────────
    elems.append(Paragraph("Asset Allocation", bold))
    elems.append(Spacer(1, 2*mm))
    alloc_data = [
        ["Category", "Current Value (₹)", "Allocation (%)"],
        ["Equity Mutual Funds",      "5,03,081",  "59.02 %"],
        ["Debt Mutual Funds",        "1,15,811",  "13.59 %"],
        ["Gold (Bonds + Digital)",   "1,40,109",  "16.44 %"],
        ["PPF / Fixed Income",         "93,550",  "10.98 %"],
        ["TOTAL",                    "8,52,450", "100.00 %"],
    ]
    alloc_table = Table(alloc_data, colWidths=[90*mm, 55*mm, 45*mm])
    alloc_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",    (0, -1),(-1, -1),"Helvetica-Bold"),
        ("BACKGROUND",  (0, -1),(-1, -1), LIGHT),
        ("FONTSIZE",    (0, 0), (-1, -1), 8.5),
        ("ALIGN",       (1, 0), (-1, -1), "RIGHT"),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS",(0,1),(-1,-2),[colors.white, colors.HexColor("#f9fafb")]),
        ("TOPPADDING",  (0,0),(-1,-1), 3),
        ("BOTTOMPADDING",(0,0),(-1,-1), 3),
    ]))
    elems.append(alloc_table)
    elems.append(Spacer(1, 5*mm))

    # ── Holdings Detail ───────────────────────────────────────────────────────
    elems.append(Paragraph("Holdings Detail", bold))
    elems.append(Spacer(1, 2*mm))
    holdings_header = ["Fund / Instrument", "Type", "Units", "NAV (₹)",
                        "Current Value (₹)", "Invested (₹)", "Returns (%)"]
    holdings = [
        ["Mirae Asset Large Cap Fund",        "Eq – Large Cap",    "312.45", "185.30",   "57,898",  "48,000", "+20.62%"],
        ["Axis Midcap Fund – Direct Growth",  "Eq – Mid Cap",      "198.72",  "96.45",   "19,167",  "15,000", "+27.78%"],
        ["Parag Parikh Flexi Cap Fund",        "Eq – Flexi Cap",    "520.10",  "68.20",   "35,471",  "28,000", "+26.68%"],
        ["SBI Nifty 50 Index Fund",            "Eq – Index",      "1450.00", "215.60",  "3,12,620", "2,60,000", "+20.24%"],
        ["ICICI Nifty Next 50 Index",          "Eq – Index",        "680.00",  "52.30",   "35,564",  "30,000", "+18.55%"],
        ["Nippon India Small Cap Fund",        "Eq – Small Cap",    "145.80", "142.75",   "20,813",  "12,000", "+73.44%"],
        ["HDFC Nifty 500 Multicap Index",      "Eq – Multi Cap",    "890.00",  "24.10",   "21,449",  "18,000", "+19.16%"],
        ["Kotak Gilt Investment Fund",         "Debt – Gilt",       "420.00",  "85.60",   "35,952",  "33,000",  "+8.94%"],
        ["ICICI Corporate Bond Fund",          "Debt – Corp Bond",  "310.00",  "35.90",   "11,129",  "10,000", "+11.29%"],
        ["Aditya Birla Savings Fund",          "Debt – Liquid",     "150.00", "458.20",   "68,730",  "65,000",  "+5.74%"],
        ["Sovereign Gold Bond 2023-24 S-II",   "Gold Bond",           "8.00","6248.00",   "49,984",  "43,200", "+15.70%"],
        ["Digital Gold – PhonePe",             "Gold",               "12.50","7210.00",   "90,125",  "82,000",  "+9.91%"],
        ["SBI PPF Account",                    "PPF",                  "—",       "—",   "93,550",  "85,000", "+10.06%"],
    ]
    col_w = [55*mm, 28*mm, 16*mm, 18*mm, 25*mm, 22*mm, 18*mm]
    htable = Table([holdings_header] + holdings, colWidths=col_w)
    htable.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, -1), 7.5),
        ("ALIGN",        (2, 0), (-1, -1), "RIGHT"),
        ("GRID",         (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#f9fafb")]),
        ("TOPPADDING",   (0,0), (-1,-1), 3),
        ("BOTTOMPADDING",(0,0), (-1,-1), 3),
    ]))
    elems.append(htable)
    elems.append(Spacer(1, 5*mm))

    # ── Goal Tracker ──────────────────────────────────────────────────────────
    elems.append(Paragraph("Goal Tracker — Retirement Corpus", bold))
    elems.append(Spacer(1, 2*mm))
    goal_data = [
        ["Target Amount",             "₹50,00,000",  "Current Progress",        "17.05 %"],
        ["Current Portfolio Value",   "₹8,52,450",   "Gap to Goal",             "₹41,47,550"],
        ["Monthly SIP",               "₹18,000",     "SIP Date",                "5th of every month"],
        ["Projected Completion Year", "2039",         "Assumed XIRR",            "14.20 %"],
    ]
    gtable = Table(goal_data, colWidths=[50*mm, 45*mm, 50*mm, 45*mm])
    gtable.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",  (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (0, -1), BRAND),
        ("TEXTCOLOR", (2, 0), (2, -1), BRAND),
        ("BACKGROUND",(0, 0), (-1, -1), LIGHT),
        ("GRID",      (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("TOPPADDING",(0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
    ]))
    elems.append(gtable)
    elems.append(Spacer(1, 4*mm))

    # ── Footer ────────────────────────────────────────────────────────────────
    elems.append(HRFlowable(width="100%", thickness=0.5, color=GREY))
    elems.append(Spacer(1, 2*mm))
    elems.append(Paragraph(
        "This statement is for educational and testing purposes only. "
        "Mutual fund investments are subject to market risks. "
        "Past performance is not indicative of future results.",
        small
    ))

    doc.build(elems)
    print(f"Created: {path}")


if __name__ == "__main__":
    build_pdf()
    print("Done!")
