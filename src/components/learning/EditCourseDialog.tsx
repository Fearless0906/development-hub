import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";
import { Course } from "@/types/learning";

interface EditCourseDialogProps {
  course: Course;
  onCourseUpdated: () => void;
  isAdmin?: boolean;
}

export const EditCourseDialog = ({
  course,
  onCourseUpdated,
  isAdmin = false,
}: EditCourseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: course.title,
    description: course.description || "",
    level: course.level,
    instructorName: course.instructor_name || "",
    instructorTitle: course.instructor_title || "",
    topics: (course.topics || []).join(", "),
    thumbnailUrl: course.thumbnail_url || "",
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        title: course.title,
        description: course.description || "",
        level: course.level,
        instructorName: course.instructor_name || "",
        instructorTitle: course.instructor_title || "",
        topics: (course.topics || []).join(", "),
        thumbnailUrl: course.thumbnail_url || "",
      });
    }
  }, [course, open]);

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);

    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { error } = await api
      .from("courses")
      .update({
        title: formData.title,
        description: formData.description || null,
        slug,
        level: formData.level,
        instructor_name: formData.instructorName || null,
        instructor_title: formData.instructorTitle || null,
        topics: formData.topics
          ? formData.topics.split(",").map((topic) => topic.trim())
          : [],
        thumbnail_url: formData.thumbnailUrl.trim(),
      })
      .eq("id", course.id);

    setLoading(false);

    if (error) {
      console.error("Error updating course:", error);
      if (error.code === "23505") {
        toast.error("A course with this title already exists");
      } else {
        toast.error("Failed to update course");
      }
      return;
    }

    toast.success("Course updated successfully!");
    setOpen(false);
    onCourseUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`title-${course.id}`}>Course Title *</Label>
            <Input
              id={`title-${course.id}`}
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., JavaScript Fundamentals"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`description-${course.id}`}>Description</Label>
            <Textarea
              id={`description-${course.id}`}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe what students will learn..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`level-${course.id}`}>Level</Label>
            <Select
              value={formData.level}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  level: value as typeof formData.level,
                })
              }
            >
              <SelectTrigger id={`level-${course.id}`}>
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
              <Label htmlFor={`instructorName-${course.id}`}>
                Instructor Name
              </Label>
              <Input
                id={`instructorName-${course.id}`}
                value={formData.instructorName}
                onChange={(e) =>
                  setFormData({ ...formData, instructorName: e.target.value })
                }
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`instructorTitle-${course.id}`}>
                Instructor Title
              </Label>
              <Input
                id={`instructorTitle-${course.id}`}
                value={formData.instructorTitle}
                onChange={(e) =>
                  setFormData({ ...formData, instructorTitle: e.target.value })
                }
                placeholder="e.g., Senior Developer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`thumbnail-${course.id}`}>
              Thumbnail URL (optional)
            </Label>
            <Input
              id={`thumbnail-${course.id}`}
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) =>
                setFormData({ ...formData, thumbnailUrl: e.target.value })
              }
              placeholder="https://example.com/course-thumbnail.jpg"
            />
            {formData.thumbnailUrl && (
              <img
                src={formData.thumbnailUrl}
                alt="Course thumbnail preview"
                className="h-32 w-full rounded-lg border border-border bg-white p-2 object-contain dark:bg-slate-950"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`topics-${course.id}`}>Topics (comma-separated)</Label>
            <Input
              id={`topics-${course.id}`}
              value={formData.topics}
              onChange={(e) =>
                setFormData({ ...formData, topics: e.target.value })
              }
              placeholder="e.g., Variables, Functions, DOM"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
