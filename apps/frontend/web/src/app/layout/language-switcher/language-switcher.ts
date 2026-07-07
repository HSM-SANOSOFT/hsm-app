import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SelectButtonModule } from 'primeng/selectbutton';
import {
  type AppLang,
  LanguageService,
} from '../../core/i18n/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [SelectButtonModule, FormsModule, TranslocoPipe],
  templateUrl: './language-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  private readonly lang = inject(LanguageService);
  readonly options = [
    { label: 'ES', value: 'es' as AppLang },
    { label: 'EN', value: 'en' as AppLang },
  ];
  value = this.lang.current();

  choose(locale: AppLang): void {
    this.lang.switch(locale);
  }
}
