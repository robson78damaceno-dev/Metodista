import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { createCsrfToken } from "@/lib/csrf";
import { getAdminAccountEmail } from "@/lib/admin-credentials";
import { getAdminDashboardData } from "@/lib/admin-data";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const [csrfToken, data, adminEmail] = await Promise.all([
    createCsrfToken(),
    getAdminDashboardData(),
    getAdminAccountEmail()
  ]);

  return (
    <AdminDashboard
      csrfToken={csrfToken}
      adminName={session.name}
      adminEmail={adminEmail}
      elections={data.elections}
      feedbackCount={data.feedbackCount}
      canCreateElection={data.canCreateElection}
      blockingElectionTitle={data.blockingElectionTitle}
    />
  );
}
