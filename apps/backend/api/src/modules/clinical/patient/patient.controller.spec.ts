jest.mock('@hsm/config/api', () => ({
  envs: { ENVIRONMENT: 'test' },
}));

import { RolesEnum } from '@hsm/common/enums';
import { InsufficientRolesException } from '@hsm/common/errors';
import type { ISignedUser } from '@hsm/common/interfaces';
import type { Patient } from '@medplum/fhirtypes';
import type { ExecutionContext } from '@nestjs/common';
import { UnprocessableEntityException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../security/roles/roles.decorator';
import { RolesGuard } from '../../security/roles/roles.guard';
import { PatientController } from './patient.controller';
import type { PatientService } from './patient.service';

describe('PatientController', () => {
  const service = {
    create: jest.fn(),
    getByIdAsFhir: jest.fn(),
    searchByIdentifier: jest.fn(),
  };
  const controller = new PatientController(
    service as unknown as PatientService,
  );

  afterEach(() => jest.clearAllMocks());

  it('read delegates to the service', async () => {
    const patient: Patient = { resourceType: 'Patient', id: 'p1' };
    service.getByIdAsFhir.mockResolvedValue(patient);
    expect(await controller.read('p1')).toBe(patient);
    expect(service.getByIdAsFhir).toHaveBeenCalledWith('p1');
  });

  it('create delegates to the service', async () => {
    const patient: Patient = { resourceType: 'Patient', gender: 'male' };
    service.create.mockResolvedValue({ ...patient, id: 'new' });
    const out = await controller.create(patient);
    expect(out).toMatchObject({ id: 'new' });
  });

  it('search returns a searchset Bundle from identifier results', async () => {
    service.searchByIdentifier.mockResolvedValue([
      { resourceType: 'Patient', id: 'p1' },
    ]);
    const bundle = await controller.search({ identifier: 'urn:mrn|123' });
    expect(bundle).toMatchObject({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
    });
    expect(service.searchByIdentifier).toHaveBeenCalledWith({
      system: 'urn:mrn',
      value: '123',
    });
  });

  it('search rejects a request with no identifier param (422)', async () => {
    await expect(controller.search({})).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  // Covers SP11 — PHI authorization gate (KTD11).
  describe('authorization (@Roles clinical gate)', () => {
    function makeContext(user: Partial<ISignedUser>): ExecutionContext {
      return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => controller.read,
        getClass: () => PatientController,
      } as unknown as ExecutionContext;
    }

    it('declares a clinical @Roles gate on the controller', () => {
      const roles = new Reflector().get<string[]>(ROLES_KEY, PatientController);
      expect(roles).toEqual(
        expect.arrayContaining([RolesEnum.Clinical.Doctor]),
      );
    });

    it('rejects a user with NO clinical role (403)', () => {
      const guard = new RolesGuard(new Reflector());
      const ctx = makeContext({
        roles: [RolesEnum.Administrative.Billing],
      } as Partial<ISignedUser>);
      expect(() => guard.canActivate(ctx)).toThrow(InsufficientRolesException);
    });

    it('allows a clinical user (doctor)', () => {
      const guard = new RolesGuard(new Reflector());
      const ctx = makeContext({
        roles: [RolesEnum.Clinical.Doctor],
      } as Partial<ISignedUser>);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
