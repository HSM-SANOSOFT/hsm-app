import { ServiceRequestEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import type { ServiceRequest } from '@medplum/fhirtypes';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientService } from '../patient/patient.service';
import { ServiceRequestService } from './service-request.service';
import { ServiceRequestTranslator } from './service-request.translator';

const labOrder: ServiceRequest = {
  resourceType: 'ServiceRequest',
  status: 'active',
  intent: 'order',
  category: [{ coding: [{ code: 'laboratory' }] }],
  code: { coding: [{ code: '58410-2' }] },
  subject: { reference: 'Patient/patient-uuid' },
};

describe('ServiceRequestService (SP9 routing spine)', () => {
  let service: ServiceRequestService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let patientService: { getEntity: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn(dto => ({ ...dto })),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    patientService = {
      getEntity: jest.fn().mockResolvedValue({ id: 'patient-uuid' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ServiceRequestService,
        ServiceRequestTranslator,
        {
          provide: getRepositoryToken(
            ServiceRequestEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: repo,
        },
        { provide: PatientService, useValue: patientService },
      ],
    }).compile();

    service = moduleRef.get(ServiceRequestService);
  });

  it('create persists a lab order with denormalized routing code', async () => {
    repo.save.mockResolvedValue({
      id: 'sr-1',
      status: 'active',
      intent: 'order',
      categoryCode: 'laboratory',
      category: labOrder.category,
      subjectId: 'patient-uuid',
    });
    const result = await service.create(labOrder);
    expect(repo.save.mock.calls[0][0].categoryCode).toBe('laboratory');
    expect(result).toMatchObject({
      resourceType: 'ServiceRequest',
      id: 'sr-1',
    });
  });

  it('rejects an invalid status code with 422 (KTD6 — routing cannot break)', async () => {
    await expect(
      service.create({
        ...labOrder,
        status: 'bogus' as ServiceRequest['status'],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects an invalid category code with 422', async () => {
    await expect(
      service.create({
        ...labOrder,
        category: [{ coding: [{ code: 'not-a-category' }] }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a dangling Patient subject with 422', async () => {
    patientService.getEntity.mockResolvedValue(null);
    await expect(service.create(labOrder)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects a dangling basedOn self-reference with 422', async () => {
    repo.findOne.mockResolvedValue(null); // basedOn lookup misses
    await expect(
      service.create({
        ...labOrder,
        basedOn: [{ reference: 'ServiceRequest/missing' }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('resolves a valid basedOn self-reference', async () => {
    repo.findOne.mockResolvedValue({ id: 'sr-parent' });
    repo.save.mockResolvedValue({
      id: 'sr-2',
      status: 'active',
      intent: 'order',
      subjectId: 'patient-uuid',
      basedOnId: 'sr-parent',
    });
    const result = await service.create({
      ...labOrder,
      basedOn: [{ reference: 'ServiceRequest/sr-parent' }],
    });
    expect(result.basedOn).toEqual([{ reference: 'ServiceRequest/sr-parent' }]);
  });

  it('routing search binds category + status and excludes other categories', async () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'sr-1',
          status: 'active',
          intent: 'order',
          categoryCode: 'laboratory',
          subjectId: 'p1',
        },
      ]),
    };
    repo.createQueryBuilder.mockReturnValue(qb);

    const out = await service.search({
      categoryCode: 'laboratory',
      status: 'active',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'sr.categoryCode = :categoryCode',
      {
        categoryCode: 'laboratory',
      },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('sr.status = :status', {
      status: 'active',
    });
    expect(out).toHaveLength(1);
  });

  it('getByIdAsFhir throws 404 when absent', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getByIdAsFhir('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
