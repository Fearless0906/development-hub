import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Code,
  Database,
  Grid2X2,
  Globe,
  Layers,
  Loader2,
  Lock,
  Star,
  Table2,
  Trash2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/integrations/django/api";
import { CreateCourseDialog } from "@/components/learning/CreateCourseDialog";
import { EditCourseDialog } from "@/components/learning/EditCourseDialog";
import { Course } from "@/types/learning";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  BookOpen,
};

interface AdminCourse extends Course {
  lessonsCount?: number;
  modulesCount?: number;
}

const AdminLearning = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState<AdminCourse | null>(
    null,
  );
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);

    const { data: coursesData, error: coursesError } = await api
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
      toast.error("Failed to load courses");
      setLoading(false);
      return;
    }

    const { data: modulesData } = await api
      .from("course_modules")
      .select("id, course_id");
    const { data: lessonsData } = await api
      .from("lessons")
      .select("id, module_id");

    const moduleCourseMap = (modulesData || []).reduce<Record<string, string>>(
      (map, module) => ({
        ...map,
        [module.id]: module.course_id,
      }),
      {},
    );
    const moduleCounts = (modulesData || []).reduce<Record<string, number>>(
      (counts, module) => ({
        ...counts,
        [module.course_id]: (counts[module.course_id] || 0) + 1,
      }),
      {},
    );
    const lessonCounts = (lessonsData || []).reduce<Record<string, number>>(
      (counts, lesson) => {
        const courseId = moduleCourseMap[lesson.module_id];
        if (!courseId) return counts;

        return {
          ...counts,
          [courseId]: (counts[courseId] || 0) + 1,
        };
      },
      {},
    );

    setCourses(
      ((coursesData || []) as Course[]).map((course) => ({
        ...course,
        modulesCount: moduleCounts[course.id] || 0,
        lessonsCount: lessonCounts[course.id] || 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    setDeletingCourseId(courseToDelete.id);

    const { error: progressError } = await api
      .from("user_course_progress")
      .delete()
      .eq("course_id", courseToDelete.id);

    if (progressError) {
      console.error("Error deleting course progress:", progressError);
      toast.error("Failed to delete course");
      setDeletingCourseId(null);
      return;
    }

    const { data: modulesData, error: modulesFetchError } = await api
      .from("course_modules")
      .select("id")
      .eq("course_id", courseToDelete.id);

    if (modulesFetchError) {
      console.error("Error fetching course modules:", modulesFetchError);
      toast.error("Failed to delete course");
      setDeletingCourseId(null);
      return;
    }

    const moduleIds = (modulesData || []).map((module) => module.id);

    if (moduleIds.length > 0) {
      const { error: lessonsError } = await api
        .from("lessons")
        .delete()
        .in("module_id", moduleIds);

      if (lessonsError) {
        console.error("Error deleting course lessons:", lessonsError);
        toast.error("Failed to delete course");
        setDeletingCourseId(null);
        return;
      }
    }

    const { error: modulesError } = await api
      .from("course_modules")
      .delete()
      .eq("course_id", courseToDelete.id);

    if (modulesError) {
      console.error("Error deleting course modules:", modulesError);
      toast.error("Failed to delete course");
      setDeletingCourseId(null);
      return;
    }

    const { error: courseError } = await api
      .from("courses")
      .delete()
      .eq("id", courseToDelete.id);

    if (courseError) {
      console.error("Error deleting course:", courseError);
      toast.error("Failed to delete course");
      setDeletingCourseId(null);
      return;
    }

    toast.success("Course deleted successfully");
    setDeletingCourseId(null);
    setCourseToDelete(null);
    fetchCourses();
  };

  return (
    <AdminLayout
      title="Learning"
      description="Create, edit, delete, and open course content."
      actions={<CreateCourseDialog onCourseCreated={fetchCourses} />}
    >
      <AlertDialog
        open={Boolean(courseToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingCourseId) {
            setCourseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              {courseToDelete
                ? `Delete "${courseToDelete.title}" and all of its modules, lessons, and progress records? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingCourseId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDeleteCourse();
              }}
              disabled={!courseToDelete || Boolean(deletingCourseId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCourseId && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-border/60 p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No courses yet</h3>
          <p className="mb-4 text-muted-foreground">
            Create your first course to start building the learning area.
          </p>
          <CreateCourseDialog onCourseCreated={fetchCourses} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Courses</h2>
              <p className="text-sm text-muted-foreground">
                {courses.length} course{courses.length === 1 ? "" : "s"} in your
                learning catalog.
              </p>
            </div>
            <div className="flex rounded-lg border border-border/60 bg-background p-1">
              <Button
                type="button"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => setViewMode("table")}
              >
                <Table2 className="h-4 w-4" />
                Table
              </Button>
              <Button
                type="button"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => setViewMode("grid")}
              >
                <Grid2X2 className="h-4 w-4" />
                Cards
              </Button>
            </div>
          </div>

          {viewMode === "table" ? (
            <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b border-border/60 bg-secondary/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Course</th>
                      <th className="px-4 py-3 font-medium">Level</th>
                      <th className="px-4 py-3 font-medium">Content</th>
                      <th className="px-4 py-3 font-medium">Rating</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => {
                      const Icon = iconMap[course.icon || "Code"] || Code;

                      return (
                        <tr
                          key={course.id}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-primary/10 p-2">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {course.title}
                                </p>
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {course.description ||
                                    "No description provided."}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="secondary">{course.level}</Badge>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {course.modulesCount || 0} modules /{" "}
                            {course.lessonsCount || 0} lessons
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                              {course.rating || 0}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              variant={
                                course.is_published ? "secondary" : "outline"
                              }
                            >
                              {course.is_published ? "Published" : "Draft"}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <Button asChild size="sm">
                                <Link to={`/admin/learning/${course.slug}`}>
                                  Open
                                </Link>
                              </Button>
                              <EditCourseDialog
                                course={course}
                                onCourseUpdated={fetchCourses}
                                isAdmin
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                disabled={deletingCourseId === course.id}
                                onClick={() => setCourseToDelete(course)}
                                aria-label={`Delete ${course.title}`}
                              >
                                {deletingCourseId === course.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const Icon = iconMap[course.icon || "Code"] || Code;

                return (
                  <div
                    key={course.id}
                    className="rounded-lg border border-border/60 bg-card p-5"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-3">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-semibold">
                            {course.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {course.modulesCount || 0} modules /{" "}
                            {course.lessonsCount || 0} lessons
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{course.level}</Badge>
                    </div>

                    <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                      {course.description || "No description provided."}
                    </p>

                    <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      {course.rating || 0}
                    </div>

                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link to={`/admin/learning/${course.slug}`}>Open</Link>
                      </Button>
                      <EditCourseDialog
                        course={course}
                        onCourseUpdated={fetchCourses}
                        isAdmin
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={deletingCourseId === course.id}
                        onClick={() => setCourseToDelete(course)}
                        aria-label={`Delete ${course.title}`}
                      >
                        {deletingCourseId === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminLearning;
