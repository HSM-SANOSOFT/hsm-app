import { Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../core/auth/auth.service';

/**
 * Patient landing (R17 — placeholder this round).
 *
 * A deliberate, trust-preserving home — NOT a blank screen or a spinner. It
 * welcomes the patient by name, gives them a real way to reach the hospital
 * (phone / address / hours), and sets a calm expectation that their records are
 * on the way. Real patient features land in a later round; until then this is
 * the page that has to earn a patient's trust on first sight.
 *
 * Contact details are placeholders (R17) — swap them for the real hospital
 * directory when patient features arrive.
 */
@Component({
  selector: 'app-patient',
  imports: [TranslocoPipe],
  templateUrl: './patient.html',
  styleUrl: './patient.scss',
})
export class Patient {
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  /**
   * First name for the greeting; falls back to a warm generic if absent.
   *
   * A plain method (not a `computed()`) so the fallback re-translates on
   * every template check instead of being cached at first evaluation — it
   * must track the active language like the rest of the template.
   */
  protected firstName(): string {
    return (
      this.auth.currentUser()?.firstName?.trim() ||
      this.transloco.translate('patient.home.greeting.fallbackName')
    );
  }
}
