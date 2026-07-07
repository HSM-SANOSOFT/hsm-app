import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LanguageService } from '../../core/i18n/language.service';
import { provideTranslocoTestingModule } from '../../core/i18n/transloco-testing';
import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  it('calls LanguageService.switch on select', () => {
    const spy = {
      switch: vi.fn(),
      current: () => 'es',
      SUPPORTED: ['es', 'en'],
    };
    TestBed.configureTestingModule({
      imports: [LanguageSwitcher],
      providers: [
        ...provideTranslocoTestingModule(),
        { provide: LanguageService, useValue: spy },
      ],
    });
    const fixture = TestBed.createComponent(LanguageSwitcher);
    fixture.componentInstance.choose('en');
    expect(spy.switch).toHaveBeenCalledWith('en');
  });
});
