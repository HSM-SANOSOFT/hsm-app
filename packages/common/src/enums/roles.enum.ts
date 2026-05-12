export enum RolesSystemEnum {
  Admin = 'admin',
  Developer = 'developer',
  Integration = 'integration',
  Auditor = 'auditor',
}

export enum RolesClinicalEnum {
  Doctor = 'doctor',
  Nurse = 'nurse',
  Technician = 'technician',
  Therapist = 'therapist',
  Pharmacist = 'pharmacist',
}

export enum RolesAdministrativeEnum {
  Admission = 'admission',
  Billing = 'billing',
  Scheduling = 'scheduling',
  HumanResources = 'human_resources',
}

export enum RolesOperationalEnum {
  Maintenance = 'maintenance',
  Housekeeping = 'housekeeping',
  Security = 'security',
  IT = 'it',
}

export enum RolesFinanceEnum {
  Accountant = 'accountant',
  Payroll = 'payroll',
  FinancialAnalyst = 'financial_analyst',
  InsuranceSpecialist = 'insurance_specialist',
}

export enum RolesMarketingEnum {
  CommunityManager = 'community_manager',
  Designer = 'designer',
  CRMSpecialist = 'crm_specialist',
}

export enum RolesQualityEnum {
  QualityOfficer = 'quality_officer',
  ComplianceOfficer = 'compliance_officer',
  ProcessAnalyst = 'process_analyst',
}

export enum RolesLegalEnum {
  LegalCounsel = 'legal_counsel',
  Paralegal = 'paralegal',
}

export enum RolesResearchEnum {
  ClinicalResearcher = 'clinical_researcher',
  ResearchCoordinator = 'research_coordinator',
  DataAnalyst = 'data_analyst',
}

export enum RolesSocialWorkEnum {
  SocialWorker = 'social_worker',
  CaseManager = 'case_manager',
  PatientAdvocate = 'patient_advocate',
}

export enum RolesHospitalityEnum {
  GuestRelations = 'guest_relations',
  PatientServices = 'patient_services',
}

export enum RolesPatientEnum {
  Patient = 'patient',
  Family = 'family',
}

export const RolesEnum = {
  System: RolesSystemEnum,
  Clinical: RolesClinicalEnum,
  Administrative: RolesAdministrativeEnum,
  Operational: RolesOperationalEnum,
  Finance: RolesFinanceEnum,
  Marketing: RolesMarketingEnum,
  Quality: RolesQualityEnum,
  Legal: RolesLegalEnum,
  Research: RolesResearchEnum,
  SocialWork: RolesSocialWorkEnum,
  Hospitality: RolesHospitalityEnum,
  Patient: RolesPatientEnum,
} as const;

export enum RoleFunctionalityEnum {
  Prod = 'prod',
  Staging = 'staging',
  Dev = 'dev',
}
