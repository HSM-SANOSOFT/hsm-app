import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  it('fetches /i18n/<lang>.json', () => {
    TestBed.configureTestingModule({
      providers: [
        TranslocoHttpLoader,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const loader = TestBed.inject(TranslocoHttpLoader);
    const http = TestBed.inject(HttpTestingController);

    let result: unknown;
    loader.getTranslation('es').subscribe(t => (result = t));
    http.expectOne('/i18n/es.json').flush({ auth: { login: { title: 'x' } } });

    expect(result).toEqual({ auth: { login: { title: 'x' } } });
    http.verify();
  });
});
