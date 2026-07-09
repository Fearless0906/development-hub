import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  BookOpen,
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  Clock,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Course, CourseModule, Lesson } from "@/types/learning";

const iconMap: Record<string, React.ElementType> = {
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  BookOpen,
};

import { VideoPlayer } from "@/components/learning/VideoPlayer";

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCertificate, setShowCertificate] = useState(false);

  const fetchCourseData = async () => {
    if (!courseId) return;

    setLoading(true);

    // Fetch course by slug
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

    // Fetch modules with lessons
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

      // Set first lesson as current if not set
      const allLessons = transformedModules.flatMap((m) => m.lessons);
      if (allLessons.length > 0 && !currentLessonId) {
        setCurrentLessonId(allLessons[0].id);
      }
    }

    // Fetch user progress if logged in
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

  const allLessons = modules.flatMap((m) => m.lessons);
  const currentLesson =
    allLessons.find((l) => l.id === currentLessonId) || allLessons[0];
  const currentLessonIndex = allLessons.findIndex(
    (l) => l.id === currentLesson?.id,
  );

  const completedCount = completedLessons.length;
  const progressPercent =
    allLessons.length > 0
      ? Math.round((completedCount / allLessons.length) * 100)
      : 0;

  const markLessonComplete = async () => {
    if (!user || !course || !currentLesson) {
      toast.error("Please sign in to track progress");
      return;
    }

    const newCompletedLessons = completedLessons.includes(currentLesson.id)
      ? completedLessons
      : [...completedLessons, currentLesson.id];

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

  const goToNextLesson = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonId(allLessons[currentLessonIndex + 1].id);
    }
  };

  const goToPrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonId(allLessons[currentLessonIndex - 1].id);
    }
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
        {/* Course Header */}
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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 hidden sm:block">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="font-display text-2xl font-bold">
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
                      <Clock className="h-4 w-4" />
                      {course.duration || "TBD"}
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
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <CreateLessonDialog
                    modules={modules}
                    courseId={course.id}
                    onLessonCreated={fetchCourseData}
                  />
                )}
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-muted-foreground mb-1">
                    Your Progress
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {progressPercent}% Complete
                  </div>
                </div>
                <div className="w-24">
                  <Progress value={progressPercent} className="h-2" />
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

        {/* Certificate Modal */}
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

        {/* Main Content */}
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
              {/* Video & Content Area */}
              <div
                className={cn(
                  "flex-1 space-y-6",
                  showSidebar ? "lg:mr-80" : "",
                )}
              >
                {/* Video Player */}
                {/* <VideoPlayer videoUrl={currentLesson?.video_url} /> */}

                {/* Lesson Navigation */}
                {/* <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={goToPrevLesson}
                    disabled={currentLessonIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setShowSidebar(!showSidebar)}
                    >
                      <List className="h-5 w-5" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Lesson {currentLessonIndex + 1} of {allLessons.length}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={goToNextLesson}
                    disabled={currentLessonIndex === allLessons.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div> */}

                {/* Lesson Content */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-semibold">
                      {currentLesson?.title}
                    </h2>
                    <Button
                      variant={
                        completedLessons.includes(currentLesson?.id || "")
                          ? "secondary"
                          : "outline"
                      }
                      size="sm"
                      onClick={markLessonComplete}
                      disabled={completedLessons.includes(
                        currentLesson?.id || "",
                      )}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {completedLessons.includes(currentLesson?.id || "")
                        ? "Completed"
                        : "Mark Complete"}
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    {currentLesson?.content?.split("\n").map((line, i) => {
                      if (line.startsWith("## ")) {
                        return (
                          <h3
                            key={i}
                            className="text-lg font-semibold mt-6 mb-3"
                          >
                            {line.replace("## ", "")}
                          </h3>
                        );
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <li key={i} className="text-muted-foreground ml-4">
                            {line.replace("- ", "")}
                          </li>
                        );
                      }
                      if (line.startsWith("```")) {
                        return null;
                      }
                      if (line.trim() === "") {
                        return <br key={i} />;
                      }
                      return (
                        <p key={i} className="text-muted-foreground mb-2">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Quiz Section */}
                {currentLesson?.quiz && currentLesson.quiz.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-primary" />
                      Knowledge Check
                    </h3>
                    <Quiz
                      questions={currentLesson.quiz}
                      onComplete={(score, total) => {
                        toast.success(
                          `Quiz completed! You scored ${score}/${total}`,
                        );
                      }}
                    />
                  </div>
                )}

                {/* Coding Challenge Section */}
                {currentLesson?.challenge && (
                  <div className="space-y-4">
                    <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                      <Code className="h-5 w-5 text-primary" />
                      Coding Challenge
                    </h3>
                    <CodingChallenge
                      challenge={currentLesson.challenge}
                      lessonId={currentLesson.id}
                      onComplete={(passed) => {
                        if (passed) {
                          toast.success("Challenge completed! Great job!");
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Sidebar - Lesson List */}
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
                                      onClick={() =>
                                        setCurrentLessonId(lesson.id)
                                      }
                                      className={cn(
                                        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                                        currentLesson?.id === lesson.id
                                          ? "bg-primary/10 text-primary"
                                          : "hover:bg-secondary/50",
                                      )}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      ) : currentLesson?.id === lesson.id ? (
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
                                        <p className="text-xs text-muted-foreground">
                                          {lesson.duration || "—"}
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
