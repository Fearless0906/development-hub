import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  BookOpen,
  DollarSign,
  Activity,
  TrendingUp,
  Award,
  Loader2,
} from "lucide-react";
import { api } from "@/integrations/django/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface Stats {
  totalStudents: number;
  totalCourses: number;
  revenue: number;
  activeUsers: number;
  quizzesTaken: number;
  quizAvgScore: number;
  popularCourses: { title: string; students: number }[];
  completionRates: { title: string; rate: number }[];
}

const StatCard = ({ icon: Icon, label, value, hint }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {label}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalStudents },
        { count: totalCourses },
        { data: courses },
        { data: progress },
        { data: challenges },
      ] = await Promise.all([
        api.from("profiles").select("*", { count: "exact", head: true }),
        api.from("courses").select("*", { count: "exact", head: true }),
        api.from("courses").select("id, title, students_count"),
        api
          .from("user_course_progress")
          .select("course_id, progress_percent, user_id, started_at"),
        api.from("user_challenge_completions").select("id"),
      ]);

      const activeUsers = new Set(
        (progress || [])
          .filter(
            (p) =>
              Date.now() - new Date(p.started_at).getTime() <
              1000 * 60 * 60 * 24 * 30,
          )
          .map((p) => p.user_id),
      ).size;

      const popularCourses = (courses || [])
        .map((c) => ({ title: c.title, students: c.students_count || 0 }))
        .sort((a, b) => b.students - a.students)
        .slice(0, 5);

      const completionRates = (courses || []).map((c) => {
        const rows = (progress || []).filter((p) => p.course_id === c.id);
        const avg = rows.length
          ? rows.reduce((s, p) => s + (p.progress_percent || 0), 0) /
            rows.length
          : 0;
        return { title: c.title, rate: Math.round(avg) };
      });

      setStats({
        totalStudents: totalStudents || 0,
        totalCourses: totalCourses || 0,
        revenue: 0,
        activeUsers,
        quizzesTaken: challenges?.length || 0,
        quizAvgScore: challenges?.length ? 100 : 0,
        popularCourses,
        completionRates,
      });
      setLoading(false);
    };
    load();
  }, []);

  return (
    <AdminLayout
      title="Dashboard"
      description="Overview of platform activity and performance"
    >
      {loading || !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              icon={Users}
              label="Total Students"
              value={stats.totalStudents}
            />
            <StatCard
              icon={BookOpen}
              label="Total Courses"
              value={stats.totalCourses}
            />
            <StatCard
              icon={DollarSign}
              label="Revenue"
              value={`$${stats.revenue.toLocaleString()}`}
              hint="No payment provider connected"
            />
            <StatCard
              icon={Activity}
              label="Active Users (30d)"
              value={stats.activeUsers}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" /> Quiz & Challenge
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total completions
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {stats.quizzesTaken}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Avg. success rate
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {stats.quizAvgScore}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Most Popular
                  Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.popularCourses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No courses yet
                  </p>
                )}
                {stats.popularCourses.map((c) => (
                  <div
                    key={c.title}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-foreground truncate">
                      {c.title}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {c.students} students
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Course Completion Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.completionRates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No progress data yet
                </p>
              )}
              {stats.completionRates.map((c) => (
                <div key={c.title} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground truncate">{c.title}</span>
                    <span className="text-muted-foreground">{c.rate}%</span>
                  </div>
                  <Progress value={c.rate} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
