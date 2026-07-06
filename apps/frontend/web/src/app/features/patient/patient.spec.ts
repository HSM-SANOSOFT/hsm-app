import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { UserProfile } from '../../core/api/response';
import { AuthService } from '../../core/auth/auth.service';
import { Patient } from './patient';

function profile(firstName: string): UserProfile {
  return {
    id: 'p1',
    username: 'jane',
    email: 'jane@x.com',
    firstName,
    firstLastName: 'Doe',
    roles: ['patient'],
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    iat: 1,
    exp: 2,
  };
}

describe('Patient', () => {
  const currentUser = signal<UserProfile | null>(null);

  function setup() {
    TestBed.configureTestingModule({
      imports: [Patient],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuthService,
          useValue: { currentUser: currentUser.asReadonly() },
        },
      ],
    });
    const fixture = TestBed.createComponent(Patient);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('greets the patient by name and shows hospital contact info', () => {
    currentUser.set(profile('Jane'));
    const host = setup();

    expect(
      host.querySelector('[data-testid="patient-greeting"]')?.textContent,
    ).toContain('Jane');
    // A real way to reach the hospital (trust-preserving, not a blank screen).
    expect(host.querySelector('a[href^="tel:"]')).not.toBeNull();
    expect(host.textContent).toContain('Próximamente');
  });

  it('falls back to a warm generic greeting when no name is present', () => {
    currentUser.set(null);
    const host = setup();

    expect(
      host.querySelector('[data-testid="patient-greeting"]')?.textContent,
    ).toContain('allí');
  });
});
