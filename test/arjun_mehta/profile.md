# Test Profile: Arjun Mehta — Young IT Professional

## Onboarding — Step 1 (Personal Info)

| Field          | Value                        |
|----------------|------------------------------|
| Full Name      | Arjun Mehta                  |
| Gender         | Male                         |
| Date of Birth  | 2000-03-15                   |
| Age            | 26                           |
| Neighbourhood  | Andheri West PG, Lokhandwala |
| Country        | IN (India)                   |
| State          | MH (Maharashtra)             |
| City           | Mumbai                       |
| Marital Status | Single                       |

## Onboarding — Step 2 (Financial Info)

| Field               | Value                  |
|---------------------|------------------------|
| Occupation          | Software Engineer      |
| Monthly Income      | ₹50,000                |
| Yearly Income Growth| 12%                    |
| Dependants          | 0                      |
| Housing Status      | Rented                 |

## Loans

| Loan Type      | Lender | Principal Outstanding | Interest Rate | EMI     | EMIs Remaining |
|----------------|--------|-----------------------|---------------|---------|----------------|
| Personal Loan  | HDFC   | ₹1,85,000             | 14.0% p.a.    | ₹5,500  | 38             |
| Education Loan | SBI    | ₹2,80,000             | 9.5% p.a.     | ₹3,800  | 84             |
| Credit Card    | ICICI  | ₹22,000               | 36.0% p.a.    | ₹3,000  | 8              |

**Total Monthly EMI: ₹12,300**  
**EMI-to-Income Ratio: 24.6%**

## Investment Goal

| Field                   | Value               |
|-------------------------|---------------------|
| Goal Description        | First home down payment + emergency corpus |
| Goal Amount             | ₹20,00,000          |
| Current Portfolio Value | ₹1,50,000           |
| Monthly SIP (current)   | ₹8,000              |
| Payout / Target Date    | 2030-03-01          |
| Investment Experience   | Beginner            |

## Assets

| Asset Type | Name                        | Purchase Date | Purchase Price | Current Value | Appreciation Rate | Notes                              |
|------------|-----------------------------|---------------|---------------|---------------|-------------------|------------------------------------|
| gadget     | MacBook Pro 14" (M3)        | 2024-01-10    | ₹1,85,000     | ₹1,30,000     | –8% p.a.          | Primary work laptop                |
| gadget     | iPhone 15                   | 2023-10-20    | ₹79,000       | ₹55,000       | –15% p.a.         | Personal phone                     |
| gadget     | Sony 43" 4K Smart TV        | 2024-03-05    | ₹45,000       | ₹30,000       | –12% p.a.         | Living room TV at PG               |
| gadget     | PlayStation 5               | 2023-12-18    | ₹54,000       | ₹36,000       | –15% p.a.         | Gaming console                     |
| gadget     | Dell 27" Monitor + desk     | 2023-08-14    | ₹38,000       | ₹24,000       | –10% p.a.         | WFH setup — monitor, stand, chair  |
| vehicle    | Honda Activa 6G             | 2022-06-30    | ₹75,000       | ₹52,000       | –10% p.a.         | Daily commute within Mumbai        |

**Total Assets: ~₹3,27,000**  
**Net Worth (approx): ₹3,27,000 − ₹4,87,000 (loans) = −₹1,60,000**

> Arjun is net-negative due to outstanding loans exceeding physical assets — realistic for a 26-year-old early in career.

## Expense Coverage

| File                          | Period            | Transactions |
|-------------------------------|-------------------|--------------|
| `expenses_apr2026_first.csv`  | April 1–15, 2026  | 15 rows      |
| `expenses_apr2026_second.pdf` | April 16–30, 2026 | 15 rows      |

## Notes for Testing

- EMI-to-income ratio is 24.6% — should NOT trigger debt-heavy mode
- Credit card at 36% interest → avalanche strategy should prioritise it first
- Young age + no dependants → aggressive/moderate risk profile expected
- Rented housing → monthly rent is the biggest fixed expense
- Small existing portfolio → SIP gap likely to be positive (needs to invest more to hit goal)
