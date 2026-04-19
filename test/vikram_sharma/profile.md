# Test Profile: Vikram Sharma — Senior Banker

## Onboarding — Step 1 (Personal Info)

| Field          | Value                              |
|----------------|------------------------------------|
| Full Name      | Vikram Sharma                      |
| Gender         | Male                               |
| Date of Birth  | 1989-07-22                         |
| Age            | 36                                 |
| Neighbourhood  | Baner, Pune — owned apartment      |
| Country        | IN (India)                         |
| State          | MH (Maharashtra)                   |
| City           | Pune                               |
| Marital Status | Married                            |

## Onboarding — Step 2 (Financial Info)

| Field               | Value                      |
|---------------------|----------------------------|
| Occupation          | Senior Bank Manager        |
| Monthly Income      | ₹1,00,000                  |
| Yearly Income Growth| 8%                         |
| Dependants          | 3 (wife + 2 children)      |
| Housing Status      | Owned                      |

## Loans

| Loan Type     | Lender   | Principal Outstanding | Interest Rate | EMI      | EMIs Remaining |
|---------------|----------|-----------------------|---------------|----------|----------------|
| Home Loan     | HDFC     | ₹44,50,000            | 8.5% p.a.     | ₹42,000  | 156            |
| Car Loan      | ICICI    | ₹7,20,000             | 9.0% p.a.     | ₹9,500   | 84             |
| Personal Loan | SBI      | ₹1,35,000             | 16.0% p.a.    | ₹5,000   | 29             |
| Gold Loan     | Muthoot  | ₹48,000               | 12.0% p.a.    | ₹2,200   | 24             |

**Total Monthly EMI: ₹58,700**  
**EMI-to-Income Ratio: 58.7%**

> ⚠️ DTI exceeds 40% — budget should enter **debt-heavy mode**. Investment and emergency allocations expected to be suppressed.

## Investment Goal

| Field                   | Value                              |
|-------------------------|------------------------------------|
| Goal Description        | Children's higher education + retirement corpus |
| Goal Amount             | ₹1,00,00,000                       |
| Current Portfolio Value | ₹12,00,000                         |
| Monthly SIP (current)   | ₹10,000 (constrained by EMIs)      |
| Payout / Target Date    | 2040-07-01                         |
| Investment Experience   | Intermediate                       |

## Expense Coverage

| File                          | Period            | Transactions |
|-------------------------------|-------------------|--------------|
| `expenses_apr2026_first.csv`  | April 1–15, 2026  | 15 rows      |
| `expenses_apr2026_second.pdf` | April 16–30, 2026 | 15 rows      |

## Notes for Testing

- EMI-to-income ratio is 58.7% — MUST trigger debt-heavy mode
- Married with dependants + owned home → conservative risk profile expected
- Large home loan dominates liabilities; net worth still positive due to property asset value
- Portfolio exists (₹12L) but SIP gap will be large given EMI burden
- Good candidate to test the avalanche repayment strategy (high-rate personal loan should be prioritised)
