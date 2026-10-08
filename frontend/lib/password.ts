export const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\sA-Za-z0-9]).{8,72}$/;

export function passwordChecks(pw: string) {
  return {
    length: pw.length >= 8 && pw.length <= 72,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[^\sA-Za-z0-9]/.test(pw),
  };
}

export function isStrongPassword(pw: string): boolean {
  return PASSWORD_RULES.test(pw);
}

export const NAME_INPUT_RE = /^[\p{L}\p{M}\s.'-]+$/u;
