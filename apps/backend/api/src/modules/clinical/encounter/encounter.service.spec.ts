import { EncounterEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import type { Encounter } from '@medplum/fhirtypes';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientService } from '../patient/patient.service';
import { EncounterService } from './encounter.service';
import { EncounterTranslator } from './encounter.translator';

const encounterResource: Encounter = {
  resourceType: 'Encounter',
  status: 'in-progress',
  class: { code: 'IMP' },
  subject: { reference: 'Patient/patient-uuid' },
};

describe('EncounterService', () => {
  let service: EncounterService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let patientService: { getEntity: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn(dto => ({ ...dto })),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    patientService = { getEntity: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EncounterService,
        EncounterTranslator,
        {
          provide: getRepositoryToken(
            EncounterEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: repo,
        },
        { provide: PatientService, useValue: patientService },
      ],
    }).compile();

    service = moduleRef.get(EncounterService);
  });

  it('create persists with the resolved subject FK and returns FHIR', async () => {
    patientService.getEntity.mockResolvedValue({ id: 'patient-uuid' });
    repo.save.mockResolvedValue({
      id: 'enc-1',
      status: 'in-progress',
      class: { code: 'IMP' },
      subjectId: 'patient-uuid',
    });

    const result = await service.create(encounterResource);
    expect(patientService.getEntity).toHaveBeenCalledWith('patient-uuid');
    expect(repo.save.mock.calls[0][0].subjectId).toBe('patient-uuid');
    expect(result).toMatchObject({
      resourceType: 'Encounter',
      subject: { reference: 'Patient/patient-uuid' },
    });
  });

  it('create raises 422 for a dangling Patient reference (not a raw FK error)', async () => {
    patientService.getEntity.mockResolvedValue(null);
    await expect(service.create(encounterResource)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('create raises 422 when subject is missing/invalid', async () => {
    await expect(
      service.create({
        resourceType: 'Encounter',
        status: 'planned',
        class: { code: 'AMB' },
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('getByIdAsFhir throws 404 when absent', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getByIdAsFhir('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('searchBySubject binds the subject param and returns FHIR', async () => {
    repo.find.mockResolvedValue([
      {
        id: 'enc-1',
        status: 'finished',
        class: { code: 'IMP' },
        subjectId: 'p1',
      },
    ]);
    const out = await service.searchBySubject('p1');
    expect(repo.find).toHaveBeenCalledWith({
      where: { subjectId: 'p1' },
      order: { createdAt: 'DESC' },
    });
    expect(out[0]).toMatchObject({
      resourceType: 'Encounter',
      subject: { reference: 'Patient/p1' },
    });
  });
});
