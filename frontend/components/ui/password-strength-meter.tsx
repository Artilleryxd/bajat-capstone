import { FC } from "react";
import { evaluatePasswordStrength } from "@/lib/utils/passwordStrength";

interface PasswordStrengthMeterProps {
  password?: string;
}

export const PasswordStrengthMeter: FC<PasswordStrengthMeterProps> = ({
  password = "",
}) => {
  if (!password || password.trim() === "") return null;

  const strength = evaluatePasswordStrength(password);

  const getMeterColor = () => {
    switch (strength.label) {
      case "Weak":
        return "bg-red-500";
      case "Medium":
        return "bg-yellow-500";
      case "Strong":
        return "bg-green-500";
      default:
        return "bg-gray-200";
    }
  };

  return (
    <div className="w-full mt-2 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span
          className={`font-medium ${
            strength.label === "Weak"
              ? "text-red-500"
              : strength.label === "Medium"
              ? "text-yellow-500"
              : "text-green-500"
          }`}
        >
          {password ? strength.label : "Enter password"}
        </span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden flex">
        <div
          className={`h-full transition-all duration-300 ease-in-out ${getMeterColor()}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>
    </div>
  );
};
