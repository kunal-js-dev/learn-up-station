import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const StudentDashboard = lazy(() => import("./StudentDashboard"));
const TeacherDashboard = lazy(() => import("./TeacherDashboard"));

const DashboardLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
  </div>
);

export default function Dashboard() {
  const { user, role, loading } = useAuth();

  if (loading) return <DashboardLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Suspense fallback={<DashboardLoader />}>
      {role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />}
    </Suspense>
  );
}
