import { PatientEntity, PatientIdentifierEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import type { Patient } from '@medplum/fhirtypes';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { PatientService } from './patient.service';
import { PatientTranslator } from './patient.translator';

const validPatient: Patient = {
  resourceType: 'Patient',
  gender: 'female',
  birthDate: '1990-01-01',
  name: [{ family: 'Doe', given: ['Jane'] }],
  identifier: [{ system: 'urn:mrn', value: '123' }],
};

function makePatientsRepo() {
  return {
    create: jest.fn(dto => ({ ...dto })),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('PatientService', () => {
  let service: PatientService;
  let patientsRepo: ReturnType<typeof makePatientsRepo>;

  beforeEach(async () => {
    patientsRepo = makePatientsRepo();
    const identifiersRepo = { create: jest.fn(dto => ({ ...dto })) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientService,
        PatientTranslator,
        {
          provide: getRepositoryToken(
            PatientEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: patientsRepo,
        },
        {
          provide: getRepositoryToken(
            PatientIdentifierEntity,
            DatabasesEnum.HsmDbPostgres,
          ),
          useValue: identifiersRepo,
        },
      ],
    }).compile();

    service = moduleRef.get(PatientService);
  });

  it('create persists entity + identifier rows and returns FHIR', async () => {
    patientsRepo.save.mockResolvedValue({
      id: 'new-uuid',
      active: true,
      gender: 'female',
      birthDate: '1990-01-01',
      name: validPatient.name,
      identifiers: [{ system: 'urn:mrn', value: '123' }],
    });

    const result = await service.create(validPatient);
    expect(patientsRepo.save).toHaveBeenCalled();
    const savedArg = patientsRepo.save.mock.calls[0][0];
    expect(savedArg.identifiers).toEqual([
      { system: 'urn:mrn', value: '123', use: undefined },
    ]);
    expect(result).toMatchObject({ resourceType: 'Patient', id: 'new-uuid' });
  });

  it('create maps a unique-violation to 409 Conflict (KTD2)', async () => {
    patientsRepo.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT',
        [],
        new Error(
          'duplicate key value violates unique constraint "uq_patient_identifier_system_value"',
        ),
      ),
    );
    await expect(service.create(validPatient)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('getByIdAsFhir returns FHIR for an existing patient', async () => {
    patientsRepo.findOne.mockResolvedValue({
      id: 'p1',
      active: true,
      identifiers: [],
    });
    const fhir = await service.getByIdAsFhir('p1');
    expect(fhir).toMatchObject({ resourceType: 'Patient', id: 'p1' });
  });

  it('getByIdAsFhir throws 404 when absent', async () => {
    patientsRepo.findOne.mockResolvedValue(null);
    await expect(service.getByIdAsFhir('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('searchByIdentifier binds params and returns matching patients', async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
    };
    patientsRepo.createQueryBuilder.mockReturnValue(qb);
    patientsRepo.find.mockResolvedValue([
      {
        id: 'p1',
        active: true,
        identifiers: [{ system: 'urn:mrn', value: '123' }],
      },
    ]);

    const results = await service.searchByIdentifier({
      system: 'urn:mrn',
      value: '123',
    });

    expect(qb.where).toHaveBeenCalledWith('identifier.value = :value', {
      value: '123',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('identifier.system = :system', {
      system: 'urn:mrn',
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ resourceType: 'Patient', id: 'p1' });
  });

  it('searchByIdentifier returns [] when nothing matches', async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    patientsRepo.createQueryBuilder.mockReturnValue(qb);
    expect(await service.searchByIdentifier({ value: 'nope' })).toEqual([]);
  });
});
