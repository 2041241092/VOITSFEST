// Database types matching the Supabase schema

export type UserRole = "user" | "admin" | "security";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type TransactionStatus = "Pending" | "Verified" | "Rejected";
export type SubEventType = "BPC" | "BCC" | "SEMINAR" | "TENANT" | "CFR" | "FESTIVAL";
export type DiscountType = "percent" | "nominal" | "bundling";
export type ParticipantType = "bpc" | "bcc" | "general";
export type TicketEventType = "CFR" | "FESTIVAL";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  password_change_required: boolean;
  created_at: string;
}

export interface BpcRegistration {
  id: string;
  team_name: string;
  leader_name: string;
  leader_email: string;
  member_names: string[];
  institution: string;
  proposal_url: string | null;
  stage: number;
  status: RegistrationStatus;
  created_at: string;
}

export interface BccRegistration {
  id: string;
  team_name: string;
  leader_name: string;
  leader_email: string;
  member_names: string[];
  institution: string;
  proposal_url: string | null;
  stage: number;
  status: RegistrationStatus;
  created_at: string;
}

export interface SeminarRegistration {
  id: string;
  full_name: string;
  email: string;
  institution: string;
  participant_type: ParticipantType;
  created_at: string;
}

export interface TenantRegistration {
  id: string;
  tenant_name: string;
  owner_name: string;
  email: string;
  phone: string;
  category: string;
  payment_proof_url: string | null;
  status: RegistrationStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string | null;
  source_type: string;
  source_id: string | null;
  sub_event_type: SubEventType;
  amount: number;
  payment_proof_url: string | null;
  status: TransactionStatus;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  token: string;
  transaction_id: string;
  user_id: string;
  event_type: TicketEventType;
  scan_count: number;
  scanned_by: string | null;
  scanned_at: string | null;
  created_at: string;
}

export interface CmsSetting {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface Promo {
  id: string;
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  is_active: boolean;
  order: number;
  created_at: string;
}
