import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsCategoryEnum } from '@hsm/common/enums';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';

import { ApiClient } from '../../../core/api/api-client';
import { toErrorMessage } from '../../../core/api/api-error';
import type {
  GetSettingsResponse,
  SettingItem,
  UpdateSettingItem,
  UpdateSettingsPayload,
} from './settings.types';

/** A setting plus its editable form state. */
interface SettingField {
  item: SettingItem;
  /** Current input value. For secrets this starts blank (never the value). */
  draft: string;
  /** Whether the user has touched this field this session. */
  dirty: boolean;
}

/** The category tabs rendered across the screen, in display order. */
const CATEGORY_TABS: ReadonlyArray<{
  value: SettingsCategoryEnum;
  label: string;
}> = [
  {
    value: SettingsCategoryEnum.EMAIL,
    label: 'admin.settings.tab.email',
  },
  {
    value: SettingsCategoryEnum.WEBHOOK,
    label: 'admin.settings.tab.webhook',
  },
  {
    value: SettingsCategoryEnum.STORAGE,
    label: 'admin.settings.tab.storage',
  },
  {
    value: SettingsCategoryEnum.APP_BEHAVIOR,
    label: 'admin.settings.tab.appBehavior',
  },
];

/**
 * Admin live-settings screen (U12 — R8–R11, AE3/AE4).
 *
 * A category-tabbed editor over `GET /v1/settings?category=` /
 * `PUT /v1/settings`. Selecting a tab loads that category. Each setting renders
 * as a form field; secret settings render a password input that starts BLANK
 * with an "a value is set" hint and are only sent on the PUT when the admin
 * actually types into them — so submitting blank leaves the stored secret
 * unchanged (KTD4 masking semantics). Save reloads the category to reflect the
 * persisted (re-masked) values.
 */
@Component({
  selector: 'app-admin-settings',
  imports: [
    FormsModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    ToastModule,
    TranslocoPipe,
  ],
  providers: [MessageService],
  templateUrl: './settings.html',
  styles: `
    :host ::ng-deep .field > label {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .settings-loading {
      display: flex;
      justify-content: center;
      padding: 3rem 1rem;
    }
    form .page-actions {
      margin-top: 0.5rem;
    }
  `,
})
export class AdminSettings {
  private readonly api = inject(ApiClient);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  protected readonly tabs = CATEGORY_TABS;
  protected readonly activeCategory = signal<SettingsCategoryEnum>(
    CATEGORY_TABS[0].value,
  );

  protected readonly fields = signal<SettingField[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadCategory(this.activeCategory());
  }

  /** Tab change handler — `p-tabs` emits the active value. */
  protected onTabChange(value: string | number | undefined): void {
    if (value === undefined) {
      return;
    }
    const category = value as SettingsCategoryEnum;
    this.activeCategory.set(category);
    this.loadCategory(category);
  }

  /** Placeholder for a secret input, based on whether a value is stored. */
  protected secretPlaceholder(item: SettingItem): string {
    return item.isSet
      ? this.transloco.translate('admin.settings.secret.placeholderSet')
      : this.transloco.translate('admin.settings.secret.placeholderUnset');
  }

  /** Tracks per-field edits, marking the field dirty. */
  protected onFieldInput(field: SettingField, value: string): void {
    this.fields.update(list =>
      list.map(f =>
        f.item.key === field.item.key ? { ...f, draft: value, dirty: true } : f,
      ),
    );
  }

  /** Loads a category's settings into editable fields. */
  protected loadCategory(category: SettingsCategoryEnum): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .get<GetSettingsResponse>('/settings', { params: { category } })
      .subscribe({
        next: response => {
          this.fields.set(response.settings.map(toField));
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(
            toErrorMessage(
              err,
              this.transloco.translate('admin.settings.error.generic'),
            ),
          );
        },
      });
  }

  /**
   * Saves the active category. Non-secret fields are always included; secret
   * fields are OMITTED unless the admin typed a (non-blank) value — so an
   * untouched/blank secret is never sent and the stored value stays unchanged.
   */
  protected save(): void {
    if (this.saving()) {
      return;
    }

    const category = this.activeCategory();
    const settings: UpdateSettingItem[] = [];

    for (const field of this.fields()) {
      if (field.item.isSecret) {
        // Omit untouched / blank secrets — leaves the stored value unchanged.
        if (!field.dirty || field.draft.trim() === '') {
          continue;
        }
        settings.push({ key: field.item.key, value: field.draft });
      } else {
        settings.push({ key: field.item.key, value: field.draft });
      }
    }

    if (settings.length === 0) {
      this.messages.add({
        severity: 'info',
        summary: this.transloco.translate(
          'admin.settings.toast.nothingToSave.summary',
        ),
        detail: this.transloco.translate(
          'admin.settings.toast.nothingToSave.detail',
        ),
      });
      return;
    }

    const payload: UpdateSettingsPayload = { category, settings };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.api.put<GetSettingsResponse>('/settings', payload).subscribe({
      next: response => {
        // Reflect the persisted (re-masked) values on reload.
        this.fields.set(response.settings.map(toField));
        this.saving.set(false);
        this.messages.add({
          severity: 'success',
          summary: this.transloco.translate(
            'admin.settings.toast.saved.summary',
          ),
          detail: this.transloco.translate('admin.settings.toast.saved.detail'),
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const detail = toErrorMessage(
          err,
          this.transloco.translate('admin.settings.error.generic'),
        );
        this.errorMessage.set(detail);
        this.messages.add({
          severity: 'error',
          summary: this.transloco.translate(
            'admin.settings.toast.saveFailed.summary',
          ),
          detail,
        });
      },
    });
  }
}

/**
 * Builds editable field state. Secret fields start with a BLANK draft (the
 * masked placeholder is shown as a hint, never as an editable value), so an
 * unmodified secret is never echoed back into the PUT payload.
 */
function toField(item: SettingItem): SettingField {
  return {
    item,
    draft: item.isSecret ? '' : (item.value ?? ''),
    dirty: false,
  };
}
