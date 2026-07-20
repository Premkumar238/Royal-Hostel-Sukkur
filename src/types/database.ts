export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | "platform_super_admin"
  | "hostel_super_admin"
  | "hostel_manager"
  | "hostel_staff";

export type StudentStatus = "active" | "inactive";
export type RoomStatus = "available" | "full" | "maintenance";
export type AllocationStatus = "active" | "moving_out" | "checked_out";
export type FeeStatus = "pending" | "paid" | "partial";
export type ExpenseStatus = "pending" | "paid" | "due";
export type FeeType = "rent" | "mess";
export type ComplaintStatus = "open" | "completed";
export type EmployeeRole = "Watchman" | "Cook" | "Cleaner" | "Manager" | "Other";
export type EmployeeStatus = "active" | "inactive";
export type MessExpenseType = "initial" | "daily";

export interface Hostel {
  id: string;
  name: string;
  slug: string;
  contact_phone: string | null;
  address: string | null;
  logo_url: string | null;
  currency: string;
  timezone: string;
  subscription_status: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

export interface HostelMember {
  id: string;
  hostel_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  hostel?: Hostel;
}

export type StudentCategory = "student" | "teacher";
export type StudentOrigin = "royal" | "outside";

export interface Student {
  id: string;
  hostel_id: string;
  student_code: string;
  full_name: string | null;
  phone: string | null;
  cnic: string | null;
  university: string | null;
  status: StudentStatus;
  category: StudentCategory | null;
  origin: StudentOrigin | null;
  registration_no: string | null;
  registration_date: string | null;
  department: string | null;
  batch: string | null;
  accommodation_semester: string | null;
  permanent_address: string | null;
  father_name: string | null;
  father_phone: string | null;
  landline: string | null;
  emergency_contact_1: string | null;
  emergency_contact_2: string | null;
  email: string | null;
  student_image_url: string | null;
  student_cnic_url: string | null;
  father_cnic_url: string | null;
  monthly_rent: number | null;
  has_mess: boolean | null;
  mess_fee: number | null;
  joining_date: string | null;
  has_breakfast: boolean | null;
  has_lunch: boolean | null;
  has_dinner: boolean | null;
  breakfast_fee: number | null;
  lunch_fee: number | null;
  dinner_fee: number | null;
  created_at: string;
}

export interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  floor: number;
  room_type: string;
  capacity: number;
  price_per_month: number;
  status: RoomStatus;
  image_url: string | null;
}

export interface Expense {
  id: string;
  hostel_id: string;
  category_id: string | null;
  employee_id: string | null;
  title: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  expense_date: string;
  status: ExpenseStatus;
  expense_categories?: { name: string };
}

export interface Employee {
  id: string;
  hostel_id: string;
  full_name: string;
  role: EmployeeRole;
  monthly_salary: number;
  phone: string | null;
  status: EmployeeStatus;
  last_salary_paid_at: string | null;
  created_at: string;
}

export interface MessExpense {
  id: string;
  hostel_id: string;
  expense_type: MessExpenseType;
  billing_month: string;
  expense_date: string;
  amount: number;
  description: string | null;
  expense_id: string | null;
  created_at: string;
}

export interface FeeRecord {
  id: string;
  hostel_id: string;
  student_id: string;
  billing_month: string;
  amount: number;
  payment_date: string | null;
  status: FeeStatus;
  fee_type: FeeType;
  invoice_code: string | null;
  students?: Student;
}

export interface Complaint {
  id: string;
  hostel_id: string;
  student_id: string;
  description: string;
  status: ComplaintStatus;
  completed_at: string | null;
  created_at: string;
  students?: Student;
}

export interface PoliceVerification {
  id: string;
  hostel_id: string;
  owner_name: string | null;
  owner_contact: string | null;
  owner_email: string | null;
  manager_name: string | null;
  manager_contact: string | null;
  hostel_name: string | null;
  address: string | null;
  police_verification_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_students: number;
  active_students: number;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  maintenance_rooms: number;
  monthly_income: number;
  monthly_expenses: number;
  pending_fees: number;
}

export interface FinancialChartPoint {
  month: string;
  income: number;
  expenses: number;
}

export type Database = {
  public: {
    Tables: {
      hostels: {
        Row: Hostel;
        Insert: Partial<Hostel>;
        Update: Partial<Hostel>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      hostel_members: {
        Row: HostelMember;
        Insert: Partial<HostelMember>;
        Update: Partial<HostelMember>;
        Relationships: [];
      };
      students: {
        Row: Student;
        Insert: Partial<Student>;
        Update: Partial<Student>;
        Relationships: [];
      };
      rooms: {
        Row: Room;
        Insert: Partial<Room>;
        Update: Partial<Room>;
        Relationships: [];
      };
      expenses: {
        Row: Expense;
        Insert: Partial<Expense>;
        Update: Partial<Expense>;
        Relationships: [];
      };
      fee_records: {
        Row: FeeRecord;
        Insert: Partial<FeeRecord>;
        Update: Partial<FeeRecord>;
        Relationships: [];
      };
      complaints: {
        Row: Complaint;
        Insert: Partial<Complaint>;
        Update: Partial<Complaint>;
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: Partial<Employee>;
        Update: Partial<Employee>;
        Relationships: [];
      };
      mess_expenses: {
        Row: MessExpense;
        Insert: Partial<MessExpense>;
        Update: Partial<MessExpense>;
        Relationships: [];
      };
      police_verifications: {
        Row: PoliceVerification;
        Insert: Partial<PoliceVerification>;
        Update: Partial<PoliceVerification>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_dashboard_stats: {
        Args: { p_hostel_id: string };
        Returns: Json;
      };
      get_financial_chart: {
        Args: { p_hostel_id: string; p_months?: number };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
