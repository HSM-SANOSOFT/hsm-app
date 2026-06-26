import type { Bundle, Patient } from '@medplum/fhirtypes';
import {
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { toSearchsetBundle } from '../fhir/fhir-bundle.util';
import { FhirController } from '../fhir/fhir-controller.base';
import { FhirSearchPipe } from '../fhir/fhir-search.pipe';
import { FhirValidationPipe } from '../fhir/fhir-validation.pipe';
import { PatientService } from './patient.service';

const patientSearchPipe = new FhirSearchPipe({
  identifierParams: ['identifier'],
});

/**
 * FHIR `Patient` facade at `/fhir/R4/Patient` (SP7). `@FhirController` supplies the
 * path, VERSION_NEUTRAL (no `/v1` prefix), envelope/error bypass, and the clinical
 * `@Roles` PHI gate (KTD11).
 */
@FhirController('Patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  /** Search by business identifier (`?identifier=system|value`) → searchset Bundle. */
  @Get()
  async search(@Query() query: unknown): Promise<Bundle<Patient>> {
    const { identifiers } = patientSearchPipe.transform(query);
    const token = identifiers.identifier;
    if (!token) {
      throw new UnprocessableEntityException(
        "Patient search requires an 'identifier' parameter",
      );
    }
    const results = await this.patientService.searchByIdentifier(token);
    return toSearchsetBundle(results);
  }

  /** Read by logical id → FHIR Patient (404 OperationOutcome if absent). */
  @Get(':id')
  async read(@Param('id') id: string): Promise<Patient> {
    return await this.patientService.getByIdAsFhir(id);
  }

  /** Create from a validated FHIR Patient body → stored resource (201). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(FhirValidationPipe) resource: Patient): Promise<Patient> {
    return await this.patientService.create(resource);
  }
}
