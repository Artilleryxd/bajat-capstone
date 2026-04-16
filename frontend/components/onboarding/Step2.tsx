"use client";

import { useFormContext } from "react-hook-form";
import { Step2FormValues, OnboardingFormValues } from "@/lib/validation/onboardingSchema";
import { Loader2 } from "lucide-react";
import { getCurrencySymbolByCountry } from "@/lib/utils/countryToCurrency";
import { useMemo } from "react";

export function Step2({
  onBack,
  isSubmitting,
}: {
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    watch,
    formState: { errors, isValid },
  } = useFormContext<OnboardingFormValues>();

  const countryCode = watch("country");
  const currencySymbol = useMemo(() => getCurrencySymbolByCountry(countryCode), [countryCode]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-1.5">
        <label
          htmlFor="occupation"
          className="text-sm font-medium text-gray-700"
        >
          Occupation
        </label>
        <input
          id="occupation"
          {...register("occupation")}
          placeholder="Software Engineer"
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {errors.occupation && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.occupation.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="income" className="text-sm font-medium text-gray-700">
          Expected Monthly Income
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
            {currencySymbol}
          </span>
          <input
            id="income"
            type="number"
            {...register("income")}
            placeholder="5000"
            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pl-8 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        {errors.income && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.income.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="incomeGrowth"
          className="text-sm font-medium text-gray-700"
        >
          Yearly Income Growth (%)
        </label>
        <input
          id="incomeGrowth"
          type="number"
          {...register("incomeGrowth")}
          placeholder="5"
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {errors.incomeGrowth && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.incomeGrowth.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dependants"
          className="text-sm font-medium text-gray-700"
        >
          Number of Dependants
        </label>
        <input
          id="dependants"
          type="number"
          {...register("dependants")}
          placeholder="0"
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {errors.dependants && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.dependants.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="housingStatus"
          className="text-sm font-medium text-gray-700"
        >
          Housing Status
        </label>
        <select
          id="housingStatus"
          {...register("housingStatus")}
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="">Select status...</option>
          <option value="Rented">Rented</option>
          <option value="Owned">Owned</option>
        </select>
        {errors.housingStatus && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.housingStatus.message as string}
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50 ring-offset-background bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 h-11 px-4 py-2"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-blue-600 text-white hover:bg-blue-700 h-11 px-4 py-2 shadow-sm"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Finish
        </button>
      </div>
    </div>
  );
}
