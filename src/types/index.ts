import { PrismaClient } from "@prisma/client";
import type {
  User as PrismaUser,
  Patient as PrismaPatient,
  Test as PrismaTest,
  TestAssignment as PrismaTestAssignment,
  Sample as PrismaSample,
  Invoice as PrismaInvoice,
  InvoiceItem as PrismaInvoiceItem,
  QueueNumber as PrismaQueueNumber,
  Report as PrismaReport,
  RadiationResult as PrismaRadiationResult,
} from "@/generated/prisma";

type PrismaTypes = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type User = PrismaUser;
export type Role =
  | "ADMIN"
  | "RECEPTIONIST"
  | "LAB_TECHNICIAN"
  | "ACCOUNTANT"
  | "PENDING";
export type Patient = PrismaPatient;
export type Gender = "MALE" | "FEMALE";
export type Test = PrismaTest;
export type TestAssignment = PrismaTestAssignment;
export type TestStatus =
  | "PENDING"
  | "SAMPLE_COLLECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";
export type Sample = PrismaSample;
export type Invoice = PrismaInvoice;
export type InvoiceItem = PrismaInvoiceItem;
export type QueueNumber = PrismaQueueNumber;
export type QueueStatus = "WAITING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type Report = PrismaReport;
export type ReportType =
  | "PATIENT"
  | "TEST"
  | "FINANCIAL"
  | "SAMPLE"
  | "SUMMARY";

// نوع نتيجة الأشعة
export type RadiationResult = PrismaRadiationResult;

// Extended types with relations
export type UserWithRelations = User & {
  patients?: Patient[];
  testAssignments?: TestAssignment[];
  invoices?: Invoice[];
  samples?: Sample[];
  reports?: Report[];
};

export type PatientWithRelations = Patient & {
  createdBy?: User;
  testAssignments?: TestAssignment[];
  invoices?: Invoice[];
  queueNumbers?: QueueNumber[];
};

export type TestWithRelations = Test & {
  testAssignments?: TestAssignment[];
};

export type TestAssignmentWithRelations = TestAssignment & {
  patient?: Patient;
  test?: Test;
  assignedBy?: User;
  samples?: Sample[];
  invoiceItems?: InvoiceItem[];
};

export type SampleWithRelations = Sample & {
  testAssignment?: TestAssignmentWithRelations;
  collectedBy?: User;
};

export type InvoiceWithRelations = Invoice & {
  patient?: Patient;
  createdBy?: User;
  items?: InvoiceItem[];
};

export type InvoiceItemWithRelations = InvoiceItem & {
  invoice?: Invoice;
  testAssignment?: TestAssignment;
};

export type QueueNumberWithRelations = QueueNumber & {
  patient?: Patient;
};

export type ReportWithRelations = Report & {
  createdBy?: User;
};

// نوع نتيجة الأشعة مع العلاقات
export type RadiationResultWithRelations = RadiationResult & {
  patient?: Patient;
  testAssignment?: TestAssignment;
  createdBy?: User;
};

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    approved: boolean;
  };
  token: string;
}

export interface PatientFormData {
  fileNumber: string;
  name: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date | string;
  gender: Gender;
}

export interface TestFormData {
  name: string;
  category: string;
  price: number;
  description?: string;
}

export interface TestAssignmentFormData {
  patientId: string;
  testId: string;
}

export interface SampleFormData {
  testAssignmentId: string;
  notes?: string;
}

// نموذج بيانات نتيجة الأشعة
export interface RadiationResultFormData {
  title: string;
  description?: string;
  resultDetails: string;
  reportText?: string;
  patientId: string;
  testAssignmentId: string;
  imageUrl?: string;
  pdfUrl?: string;
}

export interface InvoiceFormData {
  patientId: string;
  items: {
    testAssignmentId: string;
    price: number;
    quantity: number;
  }[];
  dueDate?: Date | string;
}

export interface QueueFormData {
  patientId: string;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  token?: string;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

// Page Prop Types
export interface PageProps {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
}
