"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Step1FormValues } from "@/lib/validation/onboardingSchema";
import { Country, State } from "country-state-city";
import { detectUserLocation, searchAddressLocation, ReverseGeoResult } from "@/lib/utils/geolocation";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";

type LocationStatus = "idle" | "loading" | "success" | "error";

export function Step1({ onNext }: { onNext: () => void }) {
  const {
    register,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<Step1FormValues>();

  const selectedCountry = watch("country");
  const dateOfBirth = watch("dateOfBirth");

  useEffect(() => {
    if (dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setValue("age", calculatedAge, { shouldValidate: true });
    }
  }, [dateOfBirth, setValue]);

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => {
    return selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
  }, [selectedCountry]);

  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState("");
  
  const [searchResults, setSearchResults] = useState<ReverseGeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const neighbourhoodValue = watch("neighbourhood");
  
  useEffect(() => {
    if (!neighbourhoodValue || neighbourhoodValue.length < 3) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!showResults) return;

      setIsSearching(true);
      try {
        const results = await searchAddressLocation(neighbourhoodValue);
        setSearchResults(results);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [neighbourhoodValue, showResults]);

  const applyGeoResultToForm = useCallback(
    (result: ReverseGeoResult) => {
      if (result.countryCode) {
        const matchedCountry = countries.find(
          (c) => c.isoCode === result.countryCode
        );
        if (matchedCountry) {
          setValue("country", matchedCountry.isoCode, { shouldValidate: true });

          if (result.state) {
            setTimeout(() => {
              const countryStates = State.getStatesOfCountry(matchedCountry.isoCode);
              const matchedState = countryStates.find(
                (s) =>
                  s.name.toLowerCase() === result.state?.toLowerCase() ||
                  s.isoCode.toLowerCase() === result.state?.toLowerCase()
              );
              if (matchedState) {
                setValue("state", matchedState.isoCode, { shouldValidate: true });
              }
            }, 100);
          }
        }
      }

      if (result.city) {
        setValue("city", result.city, { shouldValidate: true });
      }

      if (result.neighbourhood) {
        setValue("neighbourhood", result.neighbourhood, { shouldValidate: true });
      } else if (result.city) {
        setValue("neighbourhood", result.city, { shouldValidate: true });
      } else {
        setValue("neighbourhood", result.displayName.split(",")[0], { shouldValidate: true });
      }
    },
    [countries, setValue]
  );

  const handleDetectLocation = useCallback(async () => {
    setLocationStatus("loading");
    setLocationError("");

    try {
      const result: ReverseGeoResult = await detectUserLocation();
      applyGeoResultToForm(result);

      setLocationStatus("success");
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to detect location.";
      setLocationError(message);
      setLocationStatus("error");
    }
  }, [applyGeoResultToForm]);

  const handleSelectAddress = (result: ReverseGeoResult) => {
    setShowResults(false);
    applyGeoResultToForm(result);
  };


  const handleNext = async () => {
    const isStepValid = await trigger([
      "fullName",
      "gender",
      "dateOfBirth",
      "age",
      "country",
      "state",
      "city",
      "maritalStatus",
    ] as (keyof Step1FormValues)[]);
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

      <div className="grid grid-cols-2 gap-4 space-y-0">
        <div className="space-y-1.5">
          <label htmlFor="gender" className="text-sm font-medium text-gray-700">
            Gender
          </label>
          <select
            id="gender"
            {...register("gender")}
            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Select gender...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && (
            <p className="text-xs text-red-500 font-medium pt-1">
              {errors.gender.message as string}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="dateOfBirth"
            className="text-sm font-medium text-gray-700"
          >
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            {...register("dateOfBirth")}
            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {errors.dateOfBirth && (
            <p className="text-xs text-red-500 font-medium pt-1">
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>
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

      {/* ─── Address ─── */}
      <div className="space-y-3 relative">
        <div className="flex items-center justify-between">
          <label htmlFor="neighbourhood" className="text-sm font-medium text-gray-700">
            Current Address (Building/Locality)
          </label>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locationStatus === "loading"}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-100"
          >
            {locationStatus === "loading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Detecting…
              </>
            ) : locationStatus === "success" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Detected
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5" />
                Auto-detect
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <input
            id="neighbourhood"
            {...register("neighbourhood", {
              onChange: (e) => setShowResults(true)
            })}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="e.g. 123 Main St, Apartment 4B"
            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            autoComplete="off"
          />

          {isSearching && (
            <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-gray-400" />
          )}

          {showResults && searchResults.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm">
              {searchResults.map((result, index) => (
                <li
                  key={index}
                  onClick={() => handleSelectAddress(result)}
                  className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900"
                >
                  <span className="block truncate font-medium">{result.displayName.split(',')[0]}</span>
                  <span className="block truncate text-xs text-gray-500">{result.displayName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {locationStatus === "error" && locationError && (
          <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
            {locationError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 space-y-0">
        <div className="space-y-1.5">
          <label
            htmlFor="country"
            className="text-sm font-medium text-gray-700"
          >
            Country
          </label>
          <select
            id="country"
            {...register("country")}
            onChange={(e) => {
              register("country").onChange(e);
              setValue("state", ""); // Reset state when country changes
            }}
            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Select country...</option>
            {countries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="text-xs text-red-500 font-medium pt-1">
              {errors.country.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="state" className="text-sm font-medium text-gray-700">
            State / Province
          </label>
          <select
            id="state"
            {...register("state")}
            disabled={!selectedCountry || states.length === 0}
            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-gray-50"
          >
            <option value="">Select state...</option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="text-xs text-red-500 font-medium pt-1">
              {errors.state.message}
            </p>
          )}
        </div>
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
