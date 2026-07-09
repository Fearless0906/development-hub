import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  BookOpen, Code, Database, Globe, Layers, Lock,
  Play, List, Users, Star, ChevronRight, CheckCircle, Loader2, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CreateCourseDialog } from "@/components/learning/CreateCourseDialog";
import { EditCourseDialog } from "@/components/learning/EditCourseDialog";
import { Course, UserCourseProgress } from "@/types/learning";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  BookOpen,
};

interface CourseWithProgress extends Course {
  progress?: number;
  lessonsCount?: number;
  modulesCount?: number;
}

interface CourseCardProps {
  course: CourseWithProgress;
  isAdmin: boolean;
  deletingCourseId: string | null;
  onEditComplete: () => void;
  onRequestDelete: (course: CourseWithProgress) => void;
}

const CourseCard = ({
  course,
  isAdmin,
  deletingCourseId,
  onEditComplete,
  onRequestDelete,
}: CourseCardProps) => {
  const Icon = iconMap[course.icon || "Code"] || Code;
  const levelColors = {
    Beginner: "bg-green-500/10 text-green-500",
    Intermediate: "bg-amber-500/10 text-amber-500",
    Advanced: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="glass-card-hover p-6 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={levelColors[course.level]}>
            {course.level}
          </Badge>
          {isAdmin && (
            <>
              <EditCourseDialog
                course={course}
                onCourseUpdated={onEditComplete}
                isAdmin={isAdmin}
              />
              <Button
                variant="destructive"
                size="icon"
                disabled={deletingCourseId === course.id}
                onClick={() => onRequestDelete(course)}
              >
                {deletingCourseId === course.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <h3 className="font-display text-xl font-semibold mb-2">{course.title}</h3>
      <p className="text-muted-foreground text-sm mb-4 flex-1">{course.description}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(course.topics || []).slice(0, 3).map((topic) => (
          <span key={topic} className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
            {topic}
          </span>
        ))}
        {(course.topics || []).length > 3 && (
          <span className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground">
            +{(course.topics || []).length - 3} more
          </span>
        )}
      </div>

      {course.progress !== undefined && course.progress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-primary font-medium">{course.progress}%</span>
          </div>
          <Progress value={course.progress} className="h-2" />
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border/50 pt-4 mt-auto">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <List className="h-4 w-4" />
            {course.modulesCount || 0} modules
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {course.lessonsCount || 0} lessons
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span className="font-medium text-foreground">{course.rating || 0}</span>
        </div>
      </div>

      <Button className="w-full mt-4" variant={course.progress ? "outline" : "default"} asChild>
        <Link to={`/learning/${course.slug}`}>
          {course.progress ? (
            <>
              Continue Learning
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Course
            </>
          )}
        </Link>
      </Button>
    </div>
  );
};

const Learning = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState<CourseWithProgress | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const fetchCourses = async () => {
    setLoading(true);
    
    // Fetch courses with lesson counts
    const { data: coursesData, error: coursesError } = await supabase
      .from("courses")
      .select(`
        *,
        course_modules (
          id,
          lessons (id)
        )
      `)
      .order("created_at", { ascending: false });

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
      setLoading(false);
      return;
    }

    // Fetch user progress if logged in
    let progressMap: Record<string, number> = {};
    if (user) {
      const { data: progressData } = await supabase
        .from("user_course_progress")
        .select("course_id, progress_percent")
        .eq("user_id", user.id);

      if (progressData) {
        progressMap = progressData.reduce((acc, p) => {
          acc[p.course_id] = p.progress_percent;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Transform courses with progress and lesson counts
    const transformedCourses: CourseWithProgress[] = (coursesData || []).map((course: any) => {
      const lessonsCount = course.course_modules?.reduce(
        (sum: number, m: any) => sum + (m.lessons?.length || 0),
        0
      ) || 0;

      return {
        ...course,
        progress: progressMap[course.id] || undefined,
        lessonsCount,
        modulesCount: course.course_modules?.length || 0,
      };
    });

    setCourses(transformedCourses);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    setDeletingCourseId(courseToDelete.id);

    const { error: progressError } = await supabase
      .from("user_course_progress")
      .delete()
      .eq("course_id", courseToDelete.id);

    if (progressError) {
      console.error("Error deleting course progress:", progressError);
      toast.error("Failed to delete course");
      setDeletingCourseId(null);
      return;
    }

    const { data: modulesData, error: modulesFetchError } = await supabase
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
      const { error: lessonsError } = await supabase
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

    const { error: modulesError } = await supabase
      .from("course_modules")
      .delete()
      .eq("course_id", courseToDelete.id);

    if (modulesError) {
      console.error("Error deleting course modules:", modulesError);
      toast.error("Failed to delete course");
      setDeletingCourseId(null);
      return;
    }

    const { error: courseError } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseToDelete.id);

    if (courseError) {
      console.error("Error deleting course:", courseError);
      toast.error("Failed to delete course");
      setDeletingCourseId(null);
      return;
    }

    toast.success("Course deleted successfully!");
    setDeletingCourseId(null);
    setCourseToDelete(null);
    fetchCourses();
  };

  const inProgressCourses = courses.filter((c) => c.progress && c.progress > 0);
  const filteredCourses = activeTab === "all" 
    ? courses 
    : activeTab === "in-progress"
    ? inProgressCourses
    : courses.filter((c) => c.level.toLowerCase() === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-7xl mx-auto px-4">
          {isAdmin && (
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
          )}

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Learning Platform</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Level up your{" "}
              <span className="text-gradient-primary">developer skills</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Structured courses designed by industry experts. Learn at your own pace
              with hands-on projects and real-world examples.
            </p>
            
            {/* Admin: Create Course Button */}
            {isAdmin && (
              <div className="mt-6">
                <CreateCourseDialog onCourseCreated={fetchCourses} />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { icon: BookOpen, value: `${courses.length}+`, label: "Courses" },
              { icon: Users, value: `${courses.reduce((sum, c) => sum + c.students_count, 0).toLocaleString()}+`, label: "Students" },
              { icon: CheckCircle, value: `${courses.reduce((sum, c) => sum + (c.lessonsCount || 0), 0)}+`, label: "Lessons" },
              { icon: Star, value: "4.8", label: "Avg Rating" },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center">
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="font-display text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs & Courses */}
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full max-w-2xl mx-auto grid grid-cols-5 mb-8">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="beginner">Beginner</TabsTrigger>
              <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "in-progress"
                      ? "Start a course to see your progress here"
                      : "No courses available for this filter"}
                  </p>
                  {isAdmin && (
                    <div className="mt-4">
                      <CreateCourseDialog onCourseCreated={fetchCourses} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isAdmin={isAdmin}
                      deletingCourseId={deletingCourseId}
                      onEditComplete={fetchCourses}
                      onRequestDelete={setCourseToDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Learning;
