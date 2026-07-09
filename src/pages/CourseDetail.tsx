import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  BookOpen,
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  Users,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  PlayCircle,
  List,
  Award,
  HelpCircle,
  Loader2,
  Trash2,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Certificate } from "@/components/learning/Certificate";
import { Quiz, QuizQuestion } from "@/components/learning/Quiz";
import {
  CodingChallenge,
  CodingChallengeData,
} from "@/components/learning/CodingChallenge";
import { CreateLessonDialog } from "@/components/learning/CreateLessonDialog";
import { EditLessonDialog } from "@/components/learning/EditLessonDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Course, CourseModule, Lesson } from "@/types/learning";
import {
  LessonContent,
  RichTextEditor,
} from "@/components/markdown/RichTextEditor";

const iconMap: Record<string, React.ElementType> = {
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  BookOpen,
};

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCertificate, setShowCertificate] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(
    null,
  );
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const lessonItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lessonSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);

  const fetchCourseData = async (targetLessonId?: string) => {
    if (!courseId) return;

    setLoading(true);

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", courseId)
      .single();

    if (courseError || !courseData) {
      console.error("Error fetching course:", courseError);
      setLoading(false);
      return;
    }

    setCourse(courseData as Course);

    const { data: modulesData, error: modulesError } = await supabase
      .from("course_modules")
      .select(
        `
        *,
        lessons (*)
      `,
      )
      .eq("course_id", courseData.id)
      .order("order_index");

    if (modulesError) {
      console.error("Error fetching modules:", modulesError);
    } else {
      const transformedModules: CourseModule[] = (modulesData || []).map(
        (m: any) => ({
          ...m,
          lessons: (m.lessons || [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((l: any) => ({
              ...l,
              quiz: l.quiz as QuizQuestion[] | null,
              challenge: l.challenge as CodingChallengeData | null,
            })),
        }),
      );
      setModules(transformedModules);

      const allLessons = transformedModules.flatMap((m) => m.lessons);
      if (
        targetLessonId &&
        allLessons.some((lesson) => lesson.id === targetLessonId)
      ) {
        setCurrentLessonId(targetLessonId);
        setPendingLessonId(targetLessonId);
      } else if (
        allLessons.length > 0 &&
        (!currentLessonId ||
          !allLessons.some((lesson) => lesson.id === currentLessonId))
      ) {
        setCurrentLessonId(allLessons[0].id);
      } else if (allLessons.length === 0) {
        setCurrentLessonId(null);
      }
    }

    if (user) {
      const { data: progressData } = await supabase
        .from("user_course_progress")
        .select("completed_lessons")
        .eq("user_id", user.id)
        .eq("course_id", courseData.id)
        .maybeSingle();

      if (progressData) {
        setCompletedLessons(progressData.completed_lessons || []);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId, user]);

  useEffect(() => {
    if (!pendingLessonId || currentLessonId !== pendingLessonId) return;

    requestAnimationFrame(() => {
      lessonItemRefs.current[pendingLessonId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      lessonSectionRefs.current[pendingLessonId]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingLessonId(null);
    });
  }, [currentLessonId, pendingLessonId]);

  const allLessons = modules.flatMap((m) => m.lessons);

  const completedCount = completedLessons.length;
  const progressPercent =
    allLessons.length > 0
      ? Math.round((completedCount / allLessons.length) * 100)
      : 0;

  const markLessonComplete = async (lessonId: string) => {
    if (!user || !course) {
      toast.error("Please sign in to track progress");
      return;
    }

    const newCompletedLessons = completedLessons.includes(lessonId)
      ? completedLessons
      : [...completedLessons, lessonId];

    const newProgress = Math.round(
      (newCompletedLessons.length / allLessons.length) * 100,
    );

    const { error } = await supabase.from("user_course_progress").upsert(
      {
        user_id: user.id,
        course_id: course.id,
        completed_lessons: newCompletedLessons,
        progress_percent: newProgress,
        completed_at: newProgress === 100 ? new Date().toISOString() : null,
      },
      {
        onConflict: "user_id,course_id",
      },
    );

    if (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    } else {
      setCompletedLessons(newCompletedLessons);
      toast.success("Lesson marked as complete!");
    }
  };

  const scrollToLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    lessonSectionRefs.current[lessonId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    lessonItemRefs.current[lessonId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  const handleRemoveModule = async (moduleToRemove: CourseModule) => {
    setDeletingModuleId(moduleToRemove.id);

    const { error: lessonsError } = await supabase
      .from("lessons")
      .delete()
      .eq("module_id", moduleToRemove.id);

    if (lessonsError) {
      console.error("Error deleting module lessons:", lessonsError);
      toast.error("Failed to remove module");
      setDeletingModuleId(null);
      return;
    }

    const { error: moduleError } = await supabase
      .from("course_modules")
      .delete()
      .eq("id", moduleToRemove.id);

    if (moduleError) {
      console.error("Error deleting module:", moduleError);
      toast.error("Failed to remove module");
      setDeletingModuleId(null);
      return;
    }

    setDeletingModuleId(null);
    setModuleToDelete(null);
    toast.success("Module removed");
    fetchCourseData();
  };

  const handleDeleteCourse = async () => {
    if (!course) return;

    setDeletingCourse(true);

    const moduleIds = modules.map((module) => module.id);

    const { error: progressError } = await supabase
      .from("user_course_progress")
      .delete()
      .eq("course_id", course.id);

    if (progressError) {
      console.error("Error deleting course progress:", progressError);
      toast.error("Failed to delete course");
      setDeletingCourse(false);
      return;
    }

    if (moduleIds.length > 0) {
      const { error: lessonsError } = await supabase
        .from("lessons")
        .delete()
        .in("module_id", moduleIds);

      if (lessonsError) {
        console.error("Error deleting lessons:", lessonsError);
        toast.error("Failed to delete course");
        setDeletingCourse(false);
        return;
      }
    }

    const { error: modulesError } = await supabase
      .from("course_modules")
      .delete()
      .eq("course_id", course.id);

    if (modulesError) {
      console.error("Error deleting modules:", modulesError);
      toast.error("Failed to delete course");
      setDeletingCourse(false);
      return;
    }

    const { error: courseError } = await supabase
      .from("courses")
      .delete()
      .eq("id", course.id);

    setDeletingCourse(false);

    if (courseError) {
      console.error("Error deleting course:", courseError);
      toast.error("Failed to delete course");
      return;
    }

    toast.success("Course deleted successfully!");
    setDeleteCourseOpen(false);
    navigate("/learning");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold mb-4">
              Course Not Found
            </h1>
            <p className="text-muted-foreground mb-8">
              The course you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/learning">Back to Courses</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = iconMap[course.icon || "Code"] || Code;
  const levelColors = {
    Beginner: "bg-green-500/10 text-green-500",
    Intermediate: "bg-amber-500/10 text-amber-500",
    Advanced: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <div className="border-b border-border/50 bg-card/50">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link
                to="/learning"
                className="hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Courses
              </Link>
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 hidden sm:block">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="font-display text-2xl font-bold break-words">
                      {course.title}
                    </h1>
                    <Badge
                      variant="secondary"
                      className={levelColors[course.level]}
                    >
                      {course.level}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <List className="h-4 w-4" />
                      {modules.length} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {allLessons.length} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.students_count.toLocaleString()} students
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      {course.rating || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 xl:max-w-[48%]">
                {isAdmin && (
                  <>
                    <AlertDialog
                      open={deleteCourseOpen}
                      onOpenChange={setDeleteCourseOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Course
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete course?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete course "{course.title}" and all its modules,
                            lessons, and progress records? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deletingCourse}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteCourse}
                            disabled={deletingCourse}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingCourse && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <CreateLessonDialog
                      modules={modules}
                      courseId={course.id}
                      onLessonCreated={fetchCourseData}
                    />
                  </>
                )}
                <div className="hidden min-w-0 items-center gap-3 sm:flex">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">
                      Your Progress
                    </div>
                    <div className="text-lg font-bold text-primary whitespace-nowrap">
                      {progressPercent}% Complete
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                </div>
                {progressPercent === 100 && (
                  <Button
                    onClick={() => setShowCertificate(true)}
                    className="hidden sm:flex"
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Get Certificate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Certificate
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
          courseName={course.title}
          studentName={
            user?.user_metadata?.username ||
            user?.email?.split("@")[0] ||
            "Student"
          }
          completionDate={new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          instructorName={course.instructor_name || "Instructor"}
        />

        <AlertDialog
          open={Boolean(moduleToDelete)}
          onOpenChange={(open) => {
            if (!open && !deletingModuleId) {
              setModuleToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove module?</AlertDialogTitle>
              <AlertDialogDescription>
                {moduleToDelete
                  ? `Remove "${moduleToDelete.title}" and all of its lessons? This action cannot be undone.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(deletingModuleId)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!moduleToDelete || Boolean(deletingModuleId)}
                onClick={(event) => {
                  event.preventDefault();

                  if (!moduleToDelete) return;

                  handleRemoveModule(moduleToDelete);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingModuleId && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="container max-w-7xl mx-auto px-4 py-6">
          {allLessons.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
              <p className="text-muted-foreground mb-4">
                This course doesn't have any lessons yet.
              </p>
              {isAdmin && (
                <CreateLessonDialog
                  modules={modules}
                  courseId={course.id}
                  onLessonCreated={fetchCourseData}
                />
              )}
            </div>
          ) : (
            <div className="flex gap-6">
              <div
                className={cn(
                  "flex-1 space-y-6",
                  showSidebar ? "lg:mr-80" : "",
                )}
              >
                {modules.map((module, moduleIndex) => (
                  <section key={module.id} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/60" />
                      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Module {moduleIndex + 1}: {module.title}
                      </h2>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>

                    {module.lessons.map((lesson, lessonIndex) => {
                      const isCompleted = completedLessons.includes(lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          ref={(node) => {
                            lessonSectionRefs.current[lesson.id] = node;
                          }}
                          className={cn(
                            "scroll-mt-28 rounded-2xl border border-slate-200 bg-card p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#131a24] dark:shadow-[0_22px_80px_rgba(2,8,20,0.4)]",
                            currentLessonId === lesson.id &&
                              "ring-1 ring-cyan-400/40",
                          )}
                        >
                          <div className="flex items-center justify-between mb-4 gap-4">
                            <div className="flex items-center gap-3">
                              <span className="rounded-md bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                {moduleIndex + 1}.{lessonIndex + 1}
                              </span>
                              <h3 className="font-display text-xl font-semibold text-foreground dark:text-slate-50">
                                {lesson.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <Button
                                  variant="destructive"
                                  onClick={() => setModuleToDelete(module)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Module
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingLessonId(lesson.id);
                                    setEditingContent(lesson.content || "");
                                  }}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Lesson
                                </Button>
                              )}
                              <Button
                                variant={isCompleted ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => markLessonComplete(lesson.id)}
                                disabled={isCompleted}
                                className={cn(
                                  "border-slate-300 bg-background text-foreground hover:bg-slate-100 hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white",
                                  isCompleted &&
                                    "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
                                )}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {isCompleted ? "Completed" : "Mark Complete"}
                              </Button>
                            </div>
                          </div>

                          {editingLessonId === lesson.id ? (
                            <div className="space-y-4">
                              <RichTextEditor
                                value={editingContent}
                                onChange={setEditingContent}
                              />

                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingLessonId(null);
                                    setEditingContent("");
                                  }}
                                >
                                  Cancel
                                </Button>

                                <Button
                                  disabled={savingLessonId === lesson.id}
                                  onClick={async () => {
                                    setSavingLessonId(lesson.id);

                                    const { error } = await supabase
                                      .from("lessons")
                                      .update({ content: editingContent })
                                      .eq("id", lesson.id);

                                    setSavingLessonId(null);

                                    if (error) {
                                      toast.error("Failed to save lesson");
                                      return;
                                    }

                                    toast.success("Lesson saved");
                                    setEditingLessonId(null);
                                    fetchCourseData(lesson.id);
                                  }}
                                >
                                  {savingLessonId === lesson.id
                                    ? "Saving..."
                                    : "Save Lesson"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <LessonContent content={lesson.content} />
                          )}

                          {lesson.quiz && lesson.quiz.length > 0 && (
                            <div className="mt-8 space-y-4">
                              <h4 className="font-display text-lg font-semibold flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-primary" />
                                Knowledge Check
                              </h4>
                              <Quiz
                                questions={lesson.quiz}
                                onComplete={(score, total) => {
                                  toast.success(
                                    `Quiz completed! You scored ${score}/${total}`,
                                  );
                                }}
                              />
                            </div>
                          )}

                          {lesson.challenge && (
                            <div className="mt-8 space-y-4">
                              <h4 className="font-display text-lg font-semibold flex items-center gap-2">
                                <Code className="h-5 w-5 text-primary" />
                                Coding Challenge
                              </h4>
                              <CodingChallenge
                                challenge={lesson.challenge}
                                lessonId={lesson.id}
                                onComplete={(passed) => {
                                  if (passed) {
                                    toast.success(
                                      "Challenge completed! Great job!",
                                    );
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </section>
                ))}
              </div>

              {showSidebar && (
                <div className="hidden lg:block fixed right-4 top-[140px] bottom-4 w-80">
                  <div className="glass-card h-full flex flex-col">
                    <div className="p-4 border-b border-border/50">
                      <h3 className="font-semibold">Course Content</h3>
                      <p className="text-sm text-muted-foreground">
                        {completedCount} / {allLessons.length} lessons completed
                      </p>
                    </div>
                    <ScrollArea className="flex-1">
                      <Accordion
                        type="multiple"
                        defaultValue={modules.map((m) => m.id)}
                        className="p-2"
                      >
                        {modules.map((module) => (
                          <AccordionItem
                            key={module.id}
                            value={module.id}
                            className="border-none"
                          >
                            <AccordionTrigger className="px-3 py-2 hover:bg-secondary/50 rounded-lg text-sm font-medium">
                              {module.title}
                            </AccordionTrigger>
                            <AccordionContent className="pb-0">
                              <div className="space-y-1 pl-2">
                                {module.lessons.map((lesson) => {
                                  const isCompleted = completedLessons.includes(
                                    lesson.id,
                                  );
                                  return (
                                    <button
                                      key={lesson.id}
                                      ref={(node) => {
                                        lessonItemRefs.current[lesson.id] =
                                          node;
                                      }}
                                      onClick={() => scrollToLesson(lesson.id)}
                                      className={cn(
                                        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                                        currentLessonId === lesson.id
                                          ? "bg-primary/10 text-primary"
                                          : "hover:bg-secondary/50",
                                      )}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      ) : currentLessonId === lesson.id ? (
                                        <PlayCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className={cn(
                                            "text-sm truncate",
                                            isCompleted &&
                                              "text-muted-foreground",
                                          )}
                                        >
                                          {lesson.title}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CourseDetail;
