import type { Bundle, Encounter } from '@medplum/fhirtypes';
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
import { EncounterService } from './encounter.service';

const encounterSearchPipe = new FhirSearchPipe({
  referenceParams: { subject: 'Patient' },
});

/**
 * FHIR `Encounter` facade at `/fhir/R4/Encounter` (SP8).
 */
@FhirController('Encounter')
export class EncounterController {
  constructor(private readonly encounterService: EncounterService) {}

  /** Search by subject (`?subject=Patient/{uuid}`) → searchset Bundle. */
  @Get()
  async search(@Query() query: unknown): Promise<Bundle<Encounter>> {
    const { references } = encounterSearchPipe.transform(query);
    const subjectId = references.subject;
    if (!subjectId) {
      throw new UnprocessableEntityException(
        "Encounter search requires a 'subject' parameter (Patient/{id})",
      );
    }
    const results = await this.encounterService.searchBySubject(subjectId);
    return toSearchsetBundle(results);
  }

  @Get(':id')
  async read(@Param('id') id: string): Promise<Encounter> {
    return await this.encounterService.getByIdAsFhir(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(FhirValidationPipe) resource: Encounter,
  ): Promise<Encounter> {
    return await this.encounterService.create(resource);
  }
}
