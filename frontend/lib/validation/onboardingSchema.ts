import { z } from "zod";

export const step1Schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  age: z.coerce.number().min(18, "Age must be at least 18"),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  maritalStatus: z.enum(["Single", "Married"], {
    required_error: "Please select a marital status",
  }),
});

export type Step1FormValues = z.infer<typeof step1Schema>;

export const step2Schema = z.object({
  occupation: z.string().min(1, "Occupation is required"),
  income: z.coerce.number().min(1, "Income must be greater than 0"),
  incomeGrowth: z.coerce.number().min(0, "Income growth must be 0 or greater"),
  dependants: z.coerce.number().min(0, "Number of dependants must be 0 or greater"),
  housingStatus: z.enum(["Rented", "Owned"], {
    required_error: "Please select a housing status",
  }),
});

export type Step2FormValues = z.infer<typeof step2Schema>;

export type OnboardingFormValues = Step1FormValues & Step2FormValues;
