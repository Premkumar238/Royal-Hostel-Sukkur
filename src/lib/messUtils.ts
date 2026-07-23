import type { Student } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

export function hasAnyMess(student: Pick<
  Student,
  "has_mess" | "has_breakfast" | "has_lunch" | "has_dinner"
>): boolean {
  return !!(
    student.has_mess ||
    student.has_breakfast ||
    student.has_lunch ||
    student.has_dinner
  );
}

export function getMessTotal(
  student: Pick<
    Student,
    | "has_mess"
    | "mess_fee"
    | "has_breakfast"
    | "has_lunch"
    | "has_dinner"
    | "breakfast_fee"
    | "lunch_fee"
    | "dinner_fee"
  >
): number {
  if (student.has_mess && Number(student.mess_fee || 0) > 0) {
    return Number(student.mess_fee || 0);
  }

  const categoryTotal =
    (student.has_breakfast ? Number(student.breakfast_fee || 0) : 0) +
    (student.has_lunch ? Number(student.lunch_fee || 0) : 0) +
    (student.has_dinner ? Number(student.dinner_fee || 0) : 0);

  if (categoryTotal > 0) return categoryTotal;
  return student.has_mess ? Number(student.mess_fee || 0) : 0;
}

export function getMessCategorySummary(student: Student): string {
  const total = getMessTotal(student);
  if (total <= 0) return "—";
  return formatCurrency(total);
}

export function getMessCategoryBadges(student: Student): string[] {
  if (hasAnyMess(student)) return ["Mess"];
  return [];
}
