import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Cross-field validator: the `confirmPassword` control must match the
 * `newPassword` control. Apply it to the form group, e.g.
 * `fb.group({ ... }, { validators: passwordsMatch })`.
 */
export function passwordsMatch(
  group: AbstractControl,
): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { mismatch: true };
}
