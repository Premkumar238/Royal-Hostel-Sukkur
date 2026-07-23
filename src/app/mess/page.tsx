import { redirect } from "next/navigation";

export default function MessPage() {
  redirect("/students?mess=1");
}
