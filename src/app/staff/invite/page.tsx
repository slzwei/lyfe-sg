import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import InviteClient from "./InviteClient";

export default async function InvitePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("staff_session")?.value;

  if (!session || session !== process.env.STAFF_SECRET) {
    redirect("/staff/login");
  }

  return <InviteClient />;
}
