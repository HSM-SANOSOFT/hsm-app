import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LanguageService } from '../../core/i18n/language.service';
import { type AppLocale } from '../../core/i18n/locale-init';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [SelectButtonModule, FormsModule],
  templateUrl: './language-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  private readonly lang = inject(LanguageService);
  readonly options = [
    { label: 'ES', value: 'es' as AppLocale },
    { label: 'EN', value: 'en' as AppLocale },
  ];
  value = this.lang.current();

  choose(locale: AppLocale): void {
    this.lang.switch(locale);
  }
}
