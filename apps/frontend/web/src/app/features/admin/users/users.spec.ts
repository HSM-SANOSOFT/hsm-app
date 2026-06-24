import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import type { TableLazyLoadEvent } from 'primeng/table';

import { environment } from '../../../../environments/environment';
import type { Pagination, SuccessResponse } from '../../../core/api/response';
import { AdminUsers } from './users';
import type { AdminUser } from './users.types';

const base = environment.apiBaseUrl;

function wrapList(
  data: AdminUser[],
  pagination: Pagination,
): SuccessResponse<AdminUser[]> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/user',
      message: 'OK',
      extra: { pagination },
    },
  };
}

function wrap<T>(data: T): SuccessResponse<T> {
  return {
    data,
    metadata: {
      success: true,
      statusCode: 200,
      timestamp: '2026-06-24T00:00:00.000Z',
      path: '/v1/user',
      message: 'OK',
    },
  };
}

const pageOne: AdminUser[] = [
  {
    id: 'u1',
    username: 'alice',
    email: 'alice@x.com',
    firstName: 'Alice',
    roles: [{ id: 'r1', role: 'doctor', domain: 'prod' }],
  },
  {
    id: 'u2',
    username: 'bob',
    email: 'bob@x.com',
    firstName: 'Bob',
    roles: [{ id: 'r2', role: 'nurse', domain: 'prod' }],
  },
];

const pageTwo: AdminUser[] = [
  {
    id: 'u3',
    username: 'carol',
    email: 'carol@x.com',
    firstName: 'Carol',
    roles: [{ id: 'r3', role: 'auditor', domain: 'prod' }],
  },
];

// NOTE: Non-admin route/guard unreachability (a non-admin never reaches this
// screen) is covered by U8/U9 (auth guard + adminGuard + nav role gating);
// this spec only exercises the admin-facing list/paginate/role-change behaviour.

describe('AdminUsers component', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function lazy(first: number, rows: number): TableLazyLoadEvent {
    return { first, rows };
  }

  it('renders the first page and paging triggers the next-page fetch', () => {
    const fixture = TestBed.createComponent(AdminUsers);
    const cmp = fixture.componentInstance;
    // `[lazy]` + `lazyLoadOnInit` makes the table fire `onLazyLoad` (→
    // `loadUsers`) once on first render — that drives the initial page fetch.
    fixture.detectChanges();

    httpMock.expectOne(`${base}/user?page=1&limit=20`).flush(
      wrapList(pageOne, {
        page: 1,
        pageSize: 20,
        totalItems: 3,
        totalPages: 2,
      }),
    );

    expect(cmp.users().map(u => u.id)).toEqual(['u1', 'u2']);
    expect(cmp.totalRecords()).toBe(3);

    // Paging to the second page issues a new fetch with page=2.
    cmp.loadUsers(lazy(20, 20));
    httpMock.expectOne(`${base}/user?page=2&limit=20`).flush(
      wrapList(pageTwo, {
        page: 2,
        pageSize: 20,
        totalItems: 3,
        totalPages: 2,
      }),
    );

    expect(cmp.users().map(u => u.id)).toEqual(['u3']);
  });

  it('changing a role calls the admin endpoint and reflects the new role', () => {
    const fixture = TestBed.createComponent(AdminUsers);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();

    // Initial page load is auto-fired by the lazy table on first render.
    httpMock.expectOne(`${base}/user?page=1&limit=20`).flush(
      wrapList(pageOne, {
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      }),
    );

    const alice = cmp.users()[0];
    expect(cmp.currentRoleValue(alice)).toBe('doctor');

    // Promote Alice to admin (a flattened RolesEnum value).
    cmp.changeRole(alice, 'admin');
    const req = httpMock.expectOne(`${base}/user/u1/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: 'admin' });

    const updated: AdminUser = {
      ...alice,
      roles: [{ id: 'r1', role: 'admin', domain: 'prod' }],
    };
    req.flush(wrap(updated));

    // The row reflects the new role on success.
    expect(cmp.currentRoleValue(cmp.users()[0])).toBe('admin');
    expect(cmp.roleLabels(cmp.users()[0])).toBe('admin');
  });

  it('flattens RolesEnum groups into "Group / Member" options', () => {
    const fixture = TestBed.createComponent(AdminUsers);
    const cmp = fixture.componentInstance;

    const admin = cmp.roleOptions.find(o => o.value === 'admin');
    expect(admin?.label).toBe('System / Admin');
    // Multiple groups are flattened, not just System.
    expect(cmp.roleOptions.some(o => o.value === 'doctor')).toBe(true);
  });
});
