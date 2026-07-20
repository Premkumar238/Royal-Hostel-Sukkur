import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentDocumentType =
  | "student-image"
  | "student-cnic"
  | "father-cnic";

export async function uploadStudentDocument(
  supabase: SupabaseClient,
  file: File,
  hostelId: string,
  studentId: string,
  type: StudentDocumentType
): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${hostelId}/${studentId}/${type}.${extension}`;

  const { error } = await supabase.storage
    .from("student-documents")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from("student-documents").getPublicUrl(path);
  return data.publicUrl;
}
