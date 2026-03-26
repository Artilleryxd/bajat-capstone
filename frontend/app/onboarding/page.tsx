"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  OnboardingFormValues,
  step1Schema,
  step2Schema,
} from "@/lib/validation/onboardingSchema";
import { Step1 } from "@/components/onboarding/Step1";
import { Step2 } from "@/components/onboarding/Step2";

const fullSchema = step1Schema.merge(step2Schema);

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(fullSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      age: undefined,
      city: "",
      maritalStatus: undefined,
      occupation: "",
      income: undefined,
      incomeGrowth: undefined,
      dependants: undefined,
      housingStatus: undefined,
    },
  });

  const onSubmit = async (data: OnboardingFormValues) => {
    setIsSubmitting(true);
    // Placeholder for API call
    console.log("Onboarding complete", data);
    
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/dashboard");
    }, 1500);
  };

  const nextStep = () => setCurrentStep(2);
  const prevStep = () => setCurrentStep(1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8 p-6 border border-gray-100 relative overflow-hidden">
        
        {/* Progress header map */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {currentStep === 1 ? "Personal Details" : "Financial Details"}
            </h1>
            <span className="text-sm font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              Step {currentStep} / 2
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: currentStep === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* Form container */}
        <div className="relative min-h-[400px]">
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              {currentStep === 1 && <Step1 onNext={nextStep} />}
              {currentStep === 2 && (
                <Step2 onBack={prevStep} isSubmitting={isSubmitting} />
              )}
            </form>
          </FormProvider>
        </div>

      </div>
    </div>
  );
}
