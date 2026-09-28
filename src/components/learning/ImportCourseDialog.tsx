import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, FileText } from "lucide-react";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  detectCourseMeta,
  extractPdfTextLines,
  formatImportedLessonContent,
  parseModulesFromLines,
  type ImportedModule,
} from "@/lib/pdfCourseImport";

interface ImportCourseDialogProps {
  onCourseImported: () => void;
}

const INITIAL_FORM = {
  title: "",
  description: "",
  level: "Beginner" as "Beginner" | "Intermediate" | "Advanced",
  instructorName: "",
  instructorTitle: "",
  topics: "",
  thumbnailUrl: "",
};

export const ImportCourseDialog = ({ onCourseImported }: ImportCourseDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedModules, setParsedModules] = useState<ImportedModule[] | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const defaultInstructorName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "";

  const resetForm = () => {
    setFile(null);
    setParsedModules(null);
    setFormData(INITIAL_FORM);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setFormData((prev) => ({
        ...prev,
        instructorName: prev.instructorName || defaultInstructorName,
      }));
    } else {
      resetForm();
    }
  };

  const handleFileSelected = async (selected: File) => {
    setFile(selected);
    setParsedModules(null);
    setParsing(true);

    try {
      const lines = await extractPdfTextLines(selected);
      const meta = detectCourseMeta(lines);
      const modules = parseModulesFromLines(lines, "Course Content");
      setParsedModules(modules);

      setFormData((prev) => ({
        ...prev,
        title:
          prev.title ||
          meta.title ||
          selected.name.replace(/\.pdf$/i, "").trim(),
        description: prev.description || meta.description,
      }));

      if (modules.length === 0) {
        toast.error("No modules and lessons were found in this PDF format");
      }
    } catch (error) {
      console.error("Error reading PDF:", error);
      toast.error("Failed to read PDF file");
      setParsedModules([]);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Choose a PDF file to import");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!parsedModules || parsedModules.length === 0) {
      toast.error("No modules and lessons were found in this PDF format");
      return;
    }

    setImporting(true);

    try {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data: createdCourse, error: courseError } = await api
        .from("courses")
        .insert({
          title: formData.title,
          description: formData.description,
          slug,
          level: formData.level,
          duration: null,
          instructor_name: formData.instructorName,
          instructor_title: formData.instructorTitle,
          topics: formData.topics
            ? formData.topics.split(",").map((topic) => topic.trim())
            : [],
          thumbnail_url: formData.thumbnailUrl.trim(),
          is_published: true,
        })
        .select()
        .single();

      if (courseError || !createdCourse) {
        if (courseError?.code === "23505") {
          toast.error("A course with this title already exists");
        } else {
          console.error("Error creating course from PDF:", courseError);
          toast.error("Failed to create course");
        }
        return;
      }

      let lessonCount = 0;

      for (let moduleIndex = 0; moduleIndex < parsedModules.length; moduleIndex += 1) {
        const importedModule = parsedModules[moduleIndex];
        const { data: createdModule, error: moduleError } = await api
          .from("course_modules")
          .insert({
            course_id: createdCourse.id,
            title: importedModule.title,
            order_index: moduleIndex,
            is_published: true,
          })
          .select()
          .single();
        if (moduleError || !createdModule) throw moduleError || new Error("Module import failed");

        for (let lessonIndex = 0; lessonIndex < importedModule.lessons.length; lessonIndex += 1) {
          const importedLesson = importedModule.lessons[lessonIndex];
          const content = formatImportedLessonContent(importedLesson.lines);
          const { error: lessonError } = await api.from("lessons").insert({
            module_id: createdModule.id,
            title: importedLesson.title,
            content,
            order_index: lessonIndex,
            is_published: true,
          });
          if (lessonError) throw lessonError;
          lessonCount += 1;
        }
      }

      toast.success(
        `Imported "${formData.title}" with ${parsedModules.length} module${parsedModules.length === 1 ? "" : "s"} and ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`,
      );
      handleOpenChange(false);
      onCourseImported();
    } catch (error) {
      console.error("Error importing course from PDF:", error);
      toast.error("Failed to import course from PDF");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Course from PDF</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-file">PDF File *</Label>
            <Input
              id="pdf-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) void handleFileSelected(selected);
              }}
            />
            {parsing && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reading PDF…
              </p>
            )}
            {!parsing && parsedModules && parsedModules.length > 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Detected {parsedModules.length} module
                {parsedModules.length === 1 ? "" : "s"} and{" "}
                {parsedModules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons
              </p>
            )}
            {!parsing && parsedModules && parsedModules.length === 0 && (
              <p className="text-sm text-destructive">
                No modules and lessons were found in this PDF format
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-title">Course Title *</Label>
            <Input
              id="import-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., JavaScript Fundamentals"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-description">Description</Label>
            <Textarea
              id="import-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what students will learn..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-level">Level</Label>
            <Select
              value={formData.level}
              onValueChange={(value) => setFormData({ ...formData, level: value as typeof formData.level })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import-instructorName">Instructor Name</Label>
              <Input
                id="import-instructorName"
                value={formData.instructorName}
                onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-instructorTitle">Instructor Title</Label>
              <Input
                id="import-instructorTitle"
                value={formData.instructorTitle}
                onChange={(e) => setFormData({ ...formData, instructorTitle: e.target.value })}
                placeholder="e.g., Senior Developer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-thumbnailUrl">Thumbnail URL (optional)</Label>
            <Input
              id="import-thumbnailUrl"
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              placeholder="https://example.com/course-thumbnail.jpg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-topics">Topics (comma-separated)</Label>
            <Input
              id="import-topics"
              value={formData.topics}
              onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
              placeholder="e.g., Variables, Functions, DOM"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={importing || parsing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import Course
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
