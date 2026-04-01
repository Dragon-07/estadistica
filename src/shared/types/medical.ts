// Tipos base del proyecto - Analizador de Facturación Médica

export interface MedicalRecord {
  id: string;
  patient_name: string;
  patient_doc: string | null;
  doctor_name: string | null;
  entity_name: string;
  treatment_name: string | null;
  invoice_number: string | null;
  treatment_date: string | null;
  source_file: string | null;
  created_at: string;
}

export interface ParsedExcelRow {
  patient_name: string;
  patient_doc?: string;
  doctor_name?: string;
  entity_name: string;
  treatment_name?: string;
  invoice_number?: string;
  treatment_date?: string;
}

export interface DashboardStats {
  totalPatients: number;
  totalEntities: number;
  totalDoctors: number;
  totalRecords: number;
}

export interface DoctorSummary {
  doctor_name: string;
  patient_count: number;
  treatment_count: number;
}

export interface EntitySummary {
  entity_name: string;
  patient_count: number;
  record_count: number;
}
