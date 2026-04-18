# FinSight AI — Test User Profiles

Complete test data for 3 user personas matching PRD personas.

---

## User 1: Arjun Mehta — Young Professional (Primary Persona)

### Onboarding Data

```json
{
  "full_name": "Arjun Mehta",
  "gender": "male",
  "date_of_birth": "1996-08-14",
  "country": "IN",
  "state": "MH",
  "city": "Mumbai",
  "neighbourhood": "Andheri West",
  "currency": "INR",
  "marital_status": "single",
  "num_dependents": 0,
  "housing_status": "rented",
  "monthly_income": 95000.00,
  "income_type": "salaried",
  "has_existing_loans": true
}
```

### Loans

| # | loan_type       | lender              | principal_outstanding | interest_rate | emi_amount | emis_remaining | tenure_months | down_payment |
|---|-----------------|----------------------|----------------------|---------------|------------|----------------|---------------|-------------|
| 1 | education_loan  | SBI                  | 380000.00            | 8.50          | 8500.00    | 48             | 60            | 0           |
| 2 | personal_loan   | HDFC Bank            | 150000.00            | 14.00         | 6200.00    | 30             | 36            | 0           |
| 3 | credit_card     | ICICI Bank           | 42000.00             | 36.00         | 3500.00    | 14             | 18            | 0           |

```json
[
  {
    "loan_type": "education_loan",
    "lender": "SBI",
    "principal_outstanding": 380000.00,
    "interest_rate": 8.50,
    "emi_amount": 8500.00,
    "emis_remaining": 48,
    "tenure_months": 60,
    "down_payment": 0
  },
  {
    "loan_type": "personal_loan",
    "lender": "HDFC Bank",
    "principal_outstanding": 150000.00,
    "interest_rate": 14.00,
    "emi_amount": 6200.00,
    "emis_remaining": 30,
    "tenure_months": 36,
    "down_payment": 0
  },
  {
    "loan_type": "credit_card",
    "lender": "ICICI Bank",
    "principal_outstanding": 42000.00,
    "interest_rate": 36.00,
    "emi_amount": 3500.00,
    "emis_remaining": 14,
    "tenure_months": 18,
    "down_payment": 0
  }
]
```

### Assets

| # | asset_type | name                      | purchase_price | purchase_date | current_value | metadata                                    |
|---|-----------|---------------------------|----------------|---------------|---------------|---------------------------------------------|
| 1 | equity    | Zerodha MF Portfolio      | 120000.00      | 2023-06-01    | 168000.00     | {"broker": "Zerodha", "funds": 4}          |
| 2 | fd        | SBI Fixed Deposit         | 100000.00      | 2024-01-15    | 107500.00     | {"maturity_date": "2027-01-15", "rate": 7.1} |
| 3 | gold      | Digital Gold (PhonePe)    | 25000.00       | 2024-09-10    | 32000.00      | {"weight_grams": 3.2, "purity": "24K"}     |
| 4 | gadget    | MacBook Pro M3            | 175000.00      | 2025-03-20    | 148000.00     | {"model": "14-inch M3 Pro", "storage": "512GB"} |

```json
[
  {
    "asset_type": "equity",
    "name": "Zerodha MF Portfolio",
    "purchase_price": 120000.00,
    "purchase_date": "2023-06-01",
    "current_value": 168000.00,
    "metadata": {"broker": "Zerodha", "funds": 4}
  },
  {
    "asset_type": "fd",
    "name": "SBI Fixed Deposit",
    "purchase_price": 100000.00,
    "purchase_date": "2024-01-15",
    "current_value": 107500.00,
    "metadata": {"maturity_date": "2027-01-15", "rate": 7.1}
  },
  {
    "asset_type": "gold",
    "name": "Digital Gold (PhonePe)",
    "purchase_price": 25000.00,
    "purchase_date": "2024-09-10",
    "current_value": 32000.00,
    "metadata": {"weight_grams": 3.2, "purity": "24K"}
  },
  {
    "asset_type": "gadget",
    "name": "MacBook Pro M3",
    "purchase_price": 175000.00,
    "purchase_date": "2025-03-20",
    "current_value": 148000.00,
    "metadata": {"model": "14-inch M3 Pro", "storage": "512GB"}
  }
]
```

### Expense File: `arjun_expenses.csv`

### Expected Budget Profile
- Total EMI load: ₹18,200/month (19.2% of income)
- Investable surplus after needs/wants: ~₹12,000–15,000
- Risk profile: Aggressive (young, single, no dependents, salaried)
- Key insight: Credit card debt at 36% should be priority payoff

---

## User 2: Priya Sharma — Family Breadwinner (Secondary Persona)

### Onboarding Data

```json
{
  "full_name": "Priya Sharma",
  "gender": "female",
  "date_of_birth": "1984-03-22",
  "country": "IN",
  "state": "KA",
  "city": "Bangalore",
  "neighbourhood": "Whitefield",
  "currency": "INR",
  "marital_status": "married",
  "num_dependents": 2,
  "housing_status": "owned",
  "monthly_income": 185000.00,
  "income_type": "salaried",
  "has_existing_loans": true
}
```

### Loans

| # | loan_type       | lender              | principal_outstanding | interest_rate | emi_amount | emis_remaining | tenure_months | down_payment  |
|---|-----------------|----------------------|----------------------|---------------|------------|----------------|---------------|-------------- |
| 1 | home_loan       | HDFC Ltd             | 3200000.00           | 8.75          | 42000.00   | 180            | 240           | 800000        |
| 2 | car_loan        | Axis Bank            | 520000.00            | 9.25          | 15500.00   | 38             | 60            | 200000        |
| 3 | education_loan  | Bank of Baroda       | 280000.00            | 7.50          | 7000.00    | 42             | 48            | 0             |

```json
[
  {
    "loan_type": "home_loan",
    "lender": "HDFC Ltd",
    "principal_outstanding": 3200000.00,
    "interest_rate": 8.75,
    "emi_amount": 42000.00,
    "emis_remaining": 180,
    "tenure_months": 240,
    "down_payment": 800000
  },
  {
    "loan_type": "car_loan",
    "lender": "Axis Bank",
    "principal_outstanding": 520000.00,
    "interest_rate": 9.25,
    "emi_amount": 15500.00,
    "emis_remaining": 38,
    "tenure_months": 60,
    "down_payment": 200000
  },
  {
    "loan_type": "education_loan",
    "lender": "Bank of Baroda",
    "principal_outstanding": 280000.00,
    "interest_rate": 7.50,
    "emi_amount": 7000.00,
    "emis_remaining": 42,
    "tenure_months": 48,
    "down_payment": 0
  }
]
```

### Assets

| # | asset_type    | name                        | purchase_price | purchase_date | current_value | metadata                                           |
|---|--------------|-----------------------------| --------------|---------------|---------------|-----------------------------------------------------|
| 1 | real_estate  | 3BHK Whitefield Apartment   | 7500000.00    | 2020-06-15    | 10200000.00   | {"area_sqft": 1450, "location": "Whitefield, Bangalore"} |
| 2 | vehicle      | Hyundai Creta 2022          | 1400000.00    | 2022-11-01    | 980000.00     | {"make": "Hyundai", "model": "Creta SX(O)", "year": 2022} |
| 3 | gold         | Physical Gold Jewellery     | 350000.00     | 2018-05-20    | 680000.00     | {"weight_grams": 45, "purity": "22K"}              |
| 4 | equity       | Groww MF + Direct Equity    | 450000.00     | 2021-01-10    | 720000.00     | {"broker": "Groww", "funds": 6, "stocks": 3}       |
| 5 | fd           | ICICI FD (Children's fund)  | 300000.00     | 2023-08-01    | 330000.00     | {"maturity_date": "2028-08-01", "rate": 7.25, "purpose": "children_education"} |
| 6 | other        | PPF Account                 | 480000.00     | 2015-04-01    | 820000.00     | {"maturity_year": 2030, "annual_contribution": 50000} |

```json
[
  {
    "asset_type": "real_estate",
    "name": "3BHK Whitefield Apartment",
    "purchase_price": 7500000.00,
    "purchase_date": "2020-06-15",
    "current_value": 10200000.00,
    "metadata": {"area_sqft": 1450, "location": "Whitefield, Bangalore"}
  },
  {
    "asset_type": "vehicle",
    "name": "Hyundai Creta 2022",
    "purchase_price": 1400000.00,
    "purchase_date": "2022-11-01",
    "current_value": 980000.00,
    "metadata": {"make": "Hyundai", "model": "Creta SX(O)", "year": 2022}
  },
  {
    "asset_type": "gold",
    "name": "Physical Gold Jewellery",
    "purchase_price": 350000.00,
    "purchase_date": "2018-05-20",
    "current_value": 680000.00,
    "metadata": {"weight_grams": 45, "purity": "22K"}
  },
  {
    "asset_type": "equity",
    "name": "Groww MF + Direct Equity",
    "purchase_price": 450000.00,
    "purchase_date": "2021-01-10",
    "current_value": 720000.00,
    "metadata": {"broker": "Groww", "funds": 6, "stocks": 3}
  },
  {
    "asset_type": "fd",
    "name": "ICICI FD (Children's fund)",
    "purchase_price": 300000.00,
    "purchase_date": "2023-08-01",
    "current_value": 330000.00,
    "metadata": {"maturity_date": "2028-08-01", "rate": 7.25, "purpose": "children_education"}
  },
  {
    "asset_type": "other",
    "name": "PPF Account",
    "purchase_price": 480000.00,
    "purchase_date": "2015-04-01",
    "current_value": 820000.00,
    "metadata": {"maturity_year": 2030, "annual_contribution": 50000}
  }
]
```

### Expense File: `priya_expenses.csv`

### Expected Budget Profile
- Total EMI load: ₹64,500/month (34.9% of income) — high
- Net worth: ~₹13.73M assets − ₹4.0M liabilities = ₹9.73M
- Risk profile: Moderate (married, 2 dependents, heavy EMI load, strong asset base)
- Key insight: Car loan at 9.25% should be prioritized over education loan at 7.5%

---

## User 3: Rohit Verma — First-Time Earner (Tertiary Persona)

### Onboarding Data

```json
{
  "full_name": "Rohit Verma",
  "gender": "male",
  "date_of_birth": "2002-11-30",
  "country": "IN",
  "state": "DL",
  "city": "Delhi",
  "neighbourhood": "Dwarka Sector 21",
  "currency": "INR",
  "marital_status": "single",
  "num_dependents": 0,
  "housing_status": "family",
  "monthly_income": 40000.00,
  "income_type": "salaried",
  "has_existing_loans": true
}
```

### Loans

| # | loan_type       | lender         | principal_outstanding | interest_rate | emi_amount | emis_remaining | tenure_months | down_payment |
|---|-----------------|----------------|----------------------|---------------|------------|----------------|---------------|-------------|
| 1 | bnpl            | Simpl          | 18000.00             | 0.00          | 6000.00    | 3              | 3             | 0           |
| 2 | credit_card     | Kotak Bank     | 35000.00             | 42.00         | 4000.00    | 12             | 12            | 0           |

```json
[
  {
    "loan_type": "bnpl",
    "lender": "Simpl",
    "principal_outstanding": 18000.00,
    "interest_rate": 0.00,
    "emi_amount": 6000.00,
    "emis_remaining": 3,
    "tenure_months": 3,
    "down_payment": 0
  },
  {
    "loan_type": "credit_card",
    "lender": "Kotak Bank",
    "principal_outstanding": 35000.00,
    "interest_rate": 42.00,
    "emi_amount": 4000.00,
    "emis_remaining": 12,
    "tenure_months": 12,
    "down_payment": 0
  }
]
```

### Assets

| # | asset_type | name                  | purchase_price | purchase_date | current_value | metadata                                     |
|---|-----------|------------------------|----------------|---------------|---------------|----------------------------------------------|
| 1 | gadget    | iPhone 15              | 79900.00       | 2025-10-15    | 62000.00      | {"model": "iPhone 15 128GB", "color": "Blue"} |
| 2 | equity    | Groww SIP (just started)| 6000.00       | 2026-01-01    | 6200.00       | {"broker": "Groww", "funds": 1, "monthly_sip": 2000} |

```json
[
  {
    "asset_type": "gadget",
    "name": "iPhone 15",
    "purchase_price": 79900.00,
    "purchase_date": "2025-10-15",
    "current_value": 62000.00,
    "metadata": {"model": "iPhone 15 128GB", "color": "Blue"}
  },
  {
    "asset_type": "equity",
    "name": "Groww SIP (just started)",
    "purchase_price": 6000.00,
    "purchase_date": "2026-01-01",
    "current_value": 6200.00,
    "metadata": {"broker": "Groww", "funds": 1, "monthly_sip": 2000}
  }
]
```

### Expense File: `rohit_expenses.csv`

### Expected Budget Profile
- Total EMI load: ₹10,000/month (25% of income) — dangerously high for income level
- Net worth: ₹68,200 assets − ₹53,000 liabilities = ₹15,200
- Risk profile: Conservative (young but low income, high debt ratio, no dependents)
- Key insight: 42% credit card interest is catastrophic — must be cleared ASAP

---

## Summary Comparison

| Metric                  | Arjun (Young Pro)  | Priya (Family)      | Rohit (First Earner) |
|-------------------------|--------------------|---------------------|----------------------|
| Monthly Income          | ₹95,000            | ₹1,85,000           | ₹40,000              |
| Total EMI               | ₹18,200            | ₹64,500             | ₹10,000              |
| EMI-to-Income Ratio     | 19.2%              | 34.9%               | 25.0%                |
| Total Assets            | ₹4,55,500          | ₹1,37,30,000        | ₹68,200              |
| Total Liabilities       | ₹5,72,000          | ₹40,00,000          | ₹53,000              |
| Net Worth               | −₹1,16,500         | ₹97,30,000          | ₹15,200              |
| Dependents              | 0                  | 2                   | 0                    |
| Housing                 | Rented             | Owned               | Family               |
| Expected Risk Profile   | Aggressive         | Moderate            | Conservative         |
| Loan Priority           | Credit card (36%)  | Car loan (9.25%)    | Credit card (42%)    |
