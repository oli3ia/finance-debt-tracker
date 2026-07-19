/** The strength rules a new password must satisfy, each with its met/unmet state. */
export interface PasswordRule {
  label: string;
  met: boolean;
}

export function passwordRules(pw: string): PasswordRule[] {
  return [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'An uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'A lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'A number', met: /[0-9]/.test(pw) },
    { label: 'A symbol', met: /[^A-Za-z0-9]/.test(pw) },
  ];
}

/** True only when every rule is met. */
export function passwordOk(pw: string): boolean {
  return passwordRules(pw).every((r) => r.met);
}
