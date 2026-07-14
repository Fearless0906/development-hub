import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";

interface CreateCourseDialogProps {
  onCourseCreated: () => void;
}

export const CreateCourseDialog = ({ onCourseCreated }: CreateCourseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: "Beginner" as "Beginner" | "Intermediate" | "Advanced",
    instructorName: "",
    instructorTitle: "",
    topics: "",
    thumbnailUrl: "",
  });

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

    const { error } = await api.from("courses").insert({
      title: formData.title,
      description: formData.description || null,
      slug,
      level: formData.level,
      duration: null,
      instructor_name: formData.instructorName || null,
      instructor_title: formData.instructorTitle || null,
      topics: formData.topics ? formData.topics.split(",").map((t) => t.trim()) : [],
      thumbnail_url: formData.thumbnailUrl.trim(),
      is_published: true,
    });

    setLoading(false);

    if (error) {
      console.error("Error creating course:", error);
      if (error.code === "23505") {
        toast.error("A course with this title already exists");
      } else {
        toast.error("Failed to create course");
      }
      return;
    }

    toast.success("Course created successfully!");
    setFormData({
      title: "",
      description: "",
      level: "Beginner",
      instructorName: "",
      instructorTitle: "",
      topics: "",
      thumbnailUrl: "",
    });
    setOpen(false);
    onCourseCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., JavaScript Fundamentals"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what students will learn..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
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
              <Label htmlFor="instructorName">Instructor Name</Label>
              <Input
                id="instructorName"
                value={formData.instructorName}
                onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructorTitle">Instructor Title</Label>
              <Input
                id="instructorTitle"
                value={formData.instructorTitle}
                onChange={(e) => setFormData({ ...formData, instructorTitle: e.target.value })}
                placeholder="e.g., Senior Developer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
            <Input
              id="thumbnailUrl"
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
            <Label htmlFor="topics">Topics (comma-separated)</Label>
            <Input
              id="topics"
              value={formData.topics}
              onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
              placeholder="e.g., Variables, Functions, DOM"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Course
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
