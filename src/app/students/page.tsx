"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Header } from "@/components/layout/Header";
import { useHostel } from "@/contexts/HostelContext";
import { createClient } from "@/lib/supabase/client";
import { uploadStudentDocument } from "@/lib/studentUpload";
import { getMessCategorySummary, getMessTotal, hasAnyMess } from "@/lib/messUtils";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import type { Student, StudentCategory, StudentOrigin, StudentStatus } from "@/types/database";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Filter,
  User,
  Phone,
  FileText,
  School,
  Loader2,
  Utensils,
  Upload,
  ImageIcon,
} from "lucide-react";

type Classification =
  | "royal_student"
  | "royal_teacher"
  | "outside_student"
  | "outside_teacher"
  | "";

const classificationOptions: {
  value: Classification;
  label: string;
  origin: StudentOrigin;
  category: StudentCategory;
}[] = [
  { value: "royal_student", label: "Royal Student", origin: "royal", category: "student" },
  { value: "royal_teacher", label: "Royal Teacher", origin: "royal", category: "teacher" },
  { value: "outside_student", label: "Outside Student", origin: "outside", category: "student" },
  { value: "outside_teacher", label: "Outside Teacher / Job", origin: "outside", category: "teacher" },
];

function getClassification(origin?: StudentOrigin | null, category?: StudentCategory | null): Classification {
  if (origin === "royal" && category === "student") return "royal_student";
  if (origin === "royal" && category === "teacher") return "royal_teacher";
  if (origin === "outside" && category === "student") return "outside_student";
  if (origin === "outside" && category === "teacher") return "outside_teacher";
  return "";
}

function parseAccommodationSemester(value?: string | null) {
  if (!value) return { semester: "", year: "" };
  const match = value.match(/^(Fall|Spring)\s*(\d{4})?$/i);
  if (!match) return { semester: "", year: "" };
  return {
    semester: match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
    year: match[2] ?? "",
  };
}

function buildAccommodationSemester(semester: string, year: string) {
  if (!semester && !year) return null;
  if (semester && year) return `${semester} ${year}`;
  return semester || year;
}

interface FileUploadFieldProps {
  label: string;
  file: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function FileUploadField({ label, file, existingUrl, onChange, inputRef }: FileUploadFieldProps) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Browse Image
        </button>
        <div className="min-w-0 flex-1 text-xs text-gray-500 truncate">
          {file ? file.name : existingUrl ? "Current image saved" : "No image selected"}
        </div>
        {(previewUrl || existingUrl) && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : existingUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={existingUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const { currentHostel } = useHostel();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [classification, setClassification] = useState<Classification>("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [accommodationSemester, setAccommodationSemester] = useState("");
  const [accommodationYear, setAccommodationYear] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [landline, setLandline] = useState("");
  const [emergencyContact1, setEmergencyContact1] = useState("");
  const [emergencyContact2, setEmergencyContact2] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [status, setStatus] = useState<StudentStatus>("active");
  const [joiningDate, setJoiningDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState<number | "">("");
  const [hasMess, setHasMess] = useState(false);
  const [hasBreakfast, setHasBreakfast] = useState(false);
  const [hasLunch, setHasLunch] = useState(false);
  const [hasDinner, setHasDinner] = useState(false);
  const [breakfastFee, setBreakfastFee] = useState<number | "">("");
  const [lunchFee, setLunchFee] = useState<number | "">("");
  const [dinnerFee, setDinnerFee] = useState<number | "">("");

  const [studentImageFile, setStudentImageFile] = useState<File | null>(null);
  const [studentCnicFile, setStudentCnicFile] = useState<File | null>(null);
  const [fatherCnicFile, setFatherCnicFile] = useState<File | null>(null);
  const [studentImageUrl, setStudentImageUrl] = useState<string | null>(null);
  const [studentCnicUrl, setStudentCnicUrl] = useState<string | null>(null);
  const [fatherCnicUrl, setFatherCnicUrl] = useState<string | null>(null);

  const studentImageInputRef = useRef<HTMLInputElement>(null);
  const studentCnicInputRef = useRef<HTMLInputElement>(null);
  const fatherCnicInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const fetchStudents = async () => {
    if (!currentHostel) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("hostel_id", currentHostel.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [currentHostel]);

  const resetForm = () => {
    setClassification("");
    setRegistrationNo("");
    setRegistrationDate("");
    setFullName("");
    setStudentCode(`STU-${Math.floor(1000 + Math.random() * 9000)}`);
    setPhone("");
    setCnic("");
    setDepartment("");
    setBatch("");
    setAccommodationSemester("");
    setAccommodationYear("");
    setPermanentAddress("");
    setFatherName("");
    setFatherPhone("");
    setLandline("");
    setEmergencyContact1("");
    setEmergencyContact2("");
    setEmail("");
    setUniversity("");
    setStatus("active");
    setJoiningDate("");
    setMonthlyRent("");
    setHasMess(false);
    setHasBreakfast(false);
    setHasLunch(false);
    setHasDinner(false);
    setBreakfastFee("");
    setLunchFee("");
    setDinnerFee("");
    setStudentImageFile(null);
    setStudentCnicFile(null);
    setFatherCnicFile(null);
    setStudentImageUrl(null);
    setStudentCnicUrl(null);
    setFatherCnicUrl(null);
  };

  const openAddModal = () => {
    setEditingStudent(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (student: Student) => {
    const { semester, year } = parseAccommodationSemester(student.accommodation_semester);

    setEditingStudent(student);
    setClassification(getClassification(student.origin, student.category));
    setRegistrationNo(student.registration_no ?? "");
    setRegistrationDate(student.registration_date ?? "");
    setFullName(student.full_name ?? "");
    setStudentCode(student.student_code);
    setPhone(student.phone ?? "");
    setCnic(student.cnic ?? "");
    setDepartment(student.department ?? "");
    setBatch(student.batch ?? "");
    setAccommodationSemester(semester);
    setAccommodationYear(year);
    setPermanentAddress(student.permanent_address ?? "");
    setFatherName(student.father_name ?? "");
    setFatherPhone(student.father_phone ?? "");
    setLandline(student.landline ?? "");
    setEmergencyContact1(student.emergency_contact_1 ?? "");
    setEmergencyContact2(student.emergency_contact_2 ?? "");
    setEmail(student.email ?? "");
    setUniversity(student.university ?? "");
    setStatus(student.status);
    setJoiningDate(student.joining_date ?? "");
    setMonthlyRent(student.monthly_rent ?? "");
    setHasMess(hasAnyMess(student));
    setHasBreakfast(student.has_breakfast ?? false);
    setHasLunch(student.has_lunch ?? false);
    setHasDinner(student.has_dinner ?? false);
    setBreakfastFee(student.breakfast_fee ?? "");
    setLunchFee(student.lunch_fee ?? "");
    setDinnerFee(student.dinner_fee ?? "");
    setStudentImageFile(null);
    setStudentCnicFile(null);
    setFatherCnicFile(null);
    setStudentImageUrl(student.student_image_url);
    setStudentCnicUrl(student.student_cnic_url);
    setFatherCnicUrl(student.father_cnic_url);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHostel) return;
    setFormLoading(true);

    const selectedClassification = classificationOptions.find((option) => option.value === classification);
    const messTotal =
      (hasBreakfast ? Number(breakfastFee || 0) : 0) +
      (hasLunch ? Number(lunchFee || 0) : 0) +
      (hasDinner ? Number(dinnerFee || 0) : 0);
    const includesMess = hasMess && (hasBreakfast || hasLunch || hasDinner);

    const payload = {
      hostel_id: currentHostel.id,
      full_name: fullName.trim() || null,
      student_code: studentCode.trim() || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: phone.trim() || null,
      cnic: cnic.trim() || null,
      university: university.trim() || null,
      status,
      joining_date: joiningDate || null,
      origin: selectedClassification?.origin ?? null,
      category: selectedClassification?.category ?? null,
      registration_no: registrationNo.trim() || null,
      registration_date: registrationDate || null,
      department: department.trim() || null,
      batch: batch.trim() || null,
      accommodation_semester: buildAccommodationSemester(accommodationSemester, accommodationYear),
      permanent_address: permanentAddress.trim() || null,
      father_name: fatherName.trim() || null,
      father_phone: fatherPhone.trim() || null,
      landline: landline.trim() || null,
      emergency_contact_1: emergencyContact1.trim() || null,
      emergency_contact_2: emergencyContact2.trim() || null,
      email: email.trim() || null,
      monthly_rent: monthlyRent === "" ? 0 : Number(monthlyRent),
      has_mess: includesMess,
      mess_fee: includesMess ? messTotal : 0,
      has_breakfast: includesMess && hasBreakfast,
      has_lunch: includesMess && hasLunch,
      has_dinner: includesMess && hasDinner,
      breakfast_fee: includesMess && hasBreakfast ? Number(breakfastFee || 0) : 0,
      lunch_fee: includesMess && hasLunch ? Number(lunchFee || 0) : 0,
      dinner_fee: includesMess && hasDinner ? Number(dinnerFee || 0) : 0,
    };

    try {
      let studentId = editingStudent?.id;

      if (editingStudent) {
        const { error } = await supabase.from("students").update(payload).eq("id", editingStudent.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("students").insert([payload]).select("id").single();
        if (error) throw error;
        studentId = data.id;
      }

      if (!studentId) throw new Error("Unable to save student record.");

      const imageUpdates: Partial<Student> = {};

      if (studentImageFile) {
        imageUpdates.student_image_url = await uploadStudentDocument(
          supabase,
          studentImageFile,
          currentHostel.id,
          studentId,
          "student-image"
        );
      }

      if (studentCnicFile) {
        imageUpdates.student_cnic_url = await uploadStudentDocument(
          supabase,
          studentCnicFile,
          currentHostel.id,
          studentId,
          "student-cnic"
        );
      }

      if (fatherCnicFile) {
        imageUpdates.father_cnic_url = await uploadStudentDocument(
          supabase,
          fatherCnicFile,
          currentHostel.id,
          studentId,
          "father-cnic"
        );
      }

      if (Object.keys(imageUpdates).length > 0) {
        const { error } = await supabase.from("students").update(imageUpdates).eq("id", studentId);
        if (error) throw error;
      }

      setShowModal(false);
      fetchStudents();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save student.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (!error) {
      fetchStudents();
    } else {
      alert(error.message);
    }
  };

  const filteredStudents = students.filter((s) => {
    const displayName = s.full_name ?? "";
    const matchesSearch =
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.student_code.toLowerCase().includes(search.toLowerCase()) ||
      (s.university?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (s.registration_no?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <Header title="Student Directory" searchPlaceholder="Quick search..." />

      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name, code or university..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-gray-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-500">No students found</p>
            <p className="text-xs text-gray-400 mt-1">Try resetting your search query or add a new student.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Monthly Rent</th>
                    <th className="px-6 py-4">Mess Fee</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={student.full_name ?? student.student_code}
                            src={student.student_image_url}
                            size="sm"
                          />
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {student.full_name || "—"}
                            </span>
                            <span className="text-xs text-gray-400">{student.university ?? student.department ?? "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">{student.student_code}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        <div>{student.phone ?? "—"}</div>
                        <div className="text-gray-400">{student.cnic ?? ""}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {formatCurrency(student.monthly_rent ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {hasAnyMess(student) ? (
                          <div>
                            <span className="font-semibold text-green-700 block">
                              {formatCurrency(getMessTotal(student))}
                            </span>
                            <span className="text-[11px] text-gray-400">{getMessCategorySummary(student)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No Mess</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(student)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-3xl rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-6">
              {editingStudent ? "Edit Student Details" : "Hostel Registration Form"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto max-h-[80vh] pr-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Please Mark One Option
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classificationOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="classification"
                        value={option.value}
                        checked={classification === option.value}
                        onChange={() => setClassification(option.value)}
                        className="h-4 w-4 border-gray-300 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Registration No
                  </label>
                  <input
                    type="text"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Contact No
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      CNIC No
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={cnic}
                        onChange={(e) => setCnic(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <FileUploadField
                  label="Student Image"
                  file={studentImageFile}
                  existingUrl={studentImageUrl}
                  onChange={setStudentImageFile}
                  inputRef={studentImageInputRef}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Batch
                  </label>
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Accommodation Required For Semester
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={accommodationSemester}
                    onChange={(e) => setAccommodationSemester(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select</option>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                  </select>
                  <input
                    type="text"
                    value={accommodationYear}
                    onChange={(e) => setAccommodationYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-28 rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Permanent Address
                </label>
                <textarea
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Father&apos;s Name
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Parents Contact No
                  </label>
                  <input
                    type="text"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Land Line
                  </label>
                  <input
                    type="text"
                    value={landline}
                    onChange={(e) => setLandline(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    E-Mail Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Emergency Contact Person 1
                  </label>
                  <input
                    type="text"
                    value={emergencyContact1}
                    onChange={(e) => setEmergencyContact1(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Emergency Contact Person 2
                  </label>
                  <input
                    type="text"
                    value={emergencyContact2}
                    onChange={(e) => setEmergencyContact2(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileUploadField
                  label="Student CNIC Image"
                  file={studentCnicFile}
                  existingUrl={studentCnicUrl}
                  onChange={setStudentCnicFile}
                  inputRef={studentCnicInputRef}
                />
                <FileUploadField
                  label="Father CNIC Image"
                  file={fatherCnicFile}
                  existingUrl={fatherCnicUrl}
                  onChange={setFatherCnicFile}
                  inputRef={fatherCnicInputRef}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Hostel Management Details
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Student ID Code
                    </label>
                    <input
                      type="text"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StudentStatus)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Monthly Rent (Rs.)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 select-none">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-11 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1">
                    <Utensils className="h-3.5 w-3.5 text-green-600" /> Food / Mess
                  </label>
                  <label className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMess}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasMess(checked);
                        if (!checked) {
                          setHasBreakfast(false);
                          setHasLunch(false);
                          setHasDinner(false);
                          setBreakfastFee("");
                          setLunchFee("");
                          setDinnerFee("");
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-xs font-semibold text-gray-600 select-none">Includes Mess</span>
                  </label>
                </div>

                {hasMess && (
                  <div className="space-y-3 rounded-lg border border-green-100 bg-green-50/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Mess Categories
                    </p>
                    {[
                      {
                        label: "Breakfast",
                        checked: hasBreakfast,
                        setChecked: setHasBreakfast,
                        fee: breakfastFee,
                        setFee: setBreakfastFee,
                      },
                      {
                        label: "Lunch",
                        checked: hasLunch,
                        setChecked: setHasLunch,
                        fee: lunchFee,
                        setFee: setLunchFee,
                      },
                      {
                        label: "Dinner",
                        checked: hasDinner,
                        setChecked: setHasDinner,
                        fee: dinnerFee,
                        setFee: setDinnerFee,
                      },
                    ].map((category) => (
                      <div key={category.label} className="grid grid-cols-[1fr_140px] gap-3 items-center">
                        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={category.checked}
                            onChange={(e) => category.setChecked(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600"
                          />
                          <span className="text-sm font-medium text-gray-700">{category.label}</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 select-none">
                            Rs.
                          </span>
                          <input
                            type="number"
                            min={0}
                            disabled={!category.checked}
                            value={category.fee}
                            onChange={(e) =>
                              category.setFee(e.target.value === "" ? "" : Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-green-100 pt-3 text-sm">
                      <span className="font-medium text-gray-600">Total Mess Fee</span>
                      <span className="font-bold text-green-700">
                        {formatCurrency(
                          (hasBreakfast ? Number(breakfastFee || 0) : 0) +
                            (hasLunch ? Number(lunchFee || 0) : 0) +
                            (hasDinner ? Number(dinnerFee || 0) : 0)
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    University
                  </label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingStudent ? (
                  "Save Changes"
                ) : (
                  "Register Student"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
