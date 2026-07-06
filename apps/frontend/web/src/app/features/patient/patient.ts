import { Component, computed, inject } from '@angular/core';

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
  imports: [],
  templateUrl: './patient.html',
  styleUrl: './patient.css',
})
export class Patient {
  private readonly auth = inject(AuthService);

  /** First name for the greeting; falls back to a warm generic if absent. */
  protected readonly firstName = computed(
    () =>
      this.auth.currentUser()?.firstName?.trim() ||
      $localize`:@@patient.home.greeting.fallbackName:allí`,
  );
}
