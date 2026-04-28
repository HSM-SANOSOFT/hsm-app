import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [PatientsModule, AppointmentsModule],
})
export class ClinicalModule {}
