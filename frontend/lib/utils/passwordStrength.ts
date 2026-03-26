export type PasswordStrength = {
  score: number;
  label: "Weak" | "Medium" | "Strong";
};

export const evaluatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { score: 0, label: "Weak" };
  }

  let score = 0;

  // Length
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  // Final label determination
  if (score < 40) {
    return { score, label: "Weak" };
  } else if (score < 80) {
    return { score, label: "Medium" };
  } else {
    return { score, label: "Strong" };
  }
};
