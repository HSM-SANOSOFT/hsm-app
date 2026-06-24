import { TestBed } from '@angular/core/testing';

import type { Tokens } from '../api/response';
import { TokenStorage } from './token-storage';

describe('TokenStorage', () => {
  let storage: TokenStorage;

  const tokens: Tokens = {
    access_token: 'at-123',
    refresh_token: 'rt-456',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    storage = TestBed.inject(TokenStorage);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('round-trips access and refresh tokens', () => {
    storage.save(tokens);

    expect(storage.getAccessToken()).toBe('at-123');
    expect(storage.getRefreshToken()).toBe('rt-456');
  });

  it('updates only the access token via setAccessToken', () => {
    storage.save(tokens);
    storage.setAccessToken('at-new');

    expect(storage.getAccessToken()).toBe('at-new');
    expect(storage.getRefreshToken()).toBe('rt-456');
  });

  it('clears both tokens on logout', () => {
    storage.save(tokens);
    storage.clear();

    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });
});
