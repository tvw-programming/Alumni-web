import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../../core/config/app-config';
import { QueryCache } from '../../core/http/query-cache';
import { UserService } from './user.service';

import type { NewUser } from './user.types';

const NEW_USER: NewUser = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  age: 36,
};

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), QueryCache, UserService],
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  it('posts the new user and returns the server representation', async () => {
    const created = service.create(NEW_USER);

    const request = http.expectOne(`${API_BASE_URL}/users/add`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(NEW_USER);

    request.flush({ id: 209, ...NEW_USER });
    await expect(created).resolves.toMatchObject({ id: 209, firstName: 'Ada' });
  });

  it('does not refetch the list after a create', async () => {
    // The response already carries the row, so a refetch would only discard the
    // caller's local insert — and on the demo API, lose the row entirely.
    const before = TestBed.inject(QueryCache).version(['users']);

    const created = service.create(NEW_USER);
    http.expectOne(`${API_BASE_URL}/users/add`).flush({ id: 209, ...NEW_USER });
    await created;

    expect(TestBed.inject(QueryCache).version(['users'])).toBe(before);
  });

  it('clears the in-flight flag even when the request fails', async () => {
    const created = service.create(NEW_USER);
    expect(service.creating()).toBe(true);

    http
      .expectOne(`${API_BASE_URL}/users/add`)
      .flush({ message: 'nope' }, { status: 500, statusText: 'Server Error' });

    // A stuck flag would leave the form's submit button disabled forever.
    await expect(created).rejects.toBeDefined();
    expect(service.creating()).toBe(false);
  });

  it('rethrows the failure so the page can surface it', async () => {
    const created = service.create(NEW_USER);
    http
      .expectOne(`${API_BASE_URL}/users/add`)
      .flush({ message: 'nope' }, { status: 500, statusText: 'Server Error' });
    await expect(created).rejects.toBeDefined();
  });
});
