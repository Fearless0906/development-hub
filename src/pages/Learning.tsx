import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { 
  BookOpen, Code, Database, Globe, Layers, Lock, 
  Play, Clock, Users, Star, ChevronRight, CheckCircle, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CreateCourseDialog } from "@/components/learning/CreateCourseDialog";
import { Course, UserCourseProgress } from "@/types/learning";

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
}

const CourseCard = ({ course }: { course: CourseWithProgress }) => {
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
        <Badge variant="secondary" className={levelColors[course.level]}>
          {course.level}
        </Badge>
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
            <Clock className="h-4 w-4" />
            {course.duration || "TBD"}
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
      };
    });

    setCourses(transformedCourses);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

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
                    <CourseCard key={course.id} course={course} />
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
