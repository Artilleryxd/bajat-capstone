"use client";

import { useFormContext } from "react-hook-form";
import { Step1FormValues } from "@/lib/validation/onboardingSchema";

export function Step1({ onNext }: { onNext: () => void }) {
  const {
    register,
    trigger,
    formState: { errors },
  } = useFormContext<Step1FormValues>();

  const handleNext = async () => {
    // Only validate the fields present in Step 1
    const isStepValid = await trigger(["fullName", "age", "city", "maritalStatus"] as any);
    if (isStepValid) {
      onNext();
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="fullName"
          {...register("fullName")}
          placeholder="John Doe"
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {errors.fullName && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="age" className="text-sm font-medium text-gray-700">
          Age
        </label>
        <input
          id="age"
          type="number"
          {...register("age")}
          placeholder="25"
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {errors.age && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.age.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="city" className="text-sm font-medium text-gray-700">
          City
        </label>
        <input
          id="city"
          {...register("city")}
          placeholder="New York"
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {errors.city && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.city.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="maritalStatus"
          className="text-sm font-medium text-gray-700"
        >
          Marital Status
        </label>
        <select
          id="maritalStatus"
          {...register("maritalStatus")}
          className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="">Select status...</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
        </select>
        {errors.maritalStatus && (
          <p className="text-xs text-red-500 font-medium pt-1">
            {errors.maritalStatus.message as string}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="w-full inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 h-11 px-4 py-2 mt-6 shadow-sm"
      >
        Next step
      </button>
    </div>
  );
}
