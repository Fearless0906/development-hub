import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Pencil,
  Trash2,
  Loader2,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";
import { CreateCourseDialog } from "@/components/learning/CreateCourseDialog";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  level: string;
  category: string | null;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  thumbnail_url: string | null;
  students_count: number;
}

const CATEGORIES = [
  "Web Development",
  "Data Science",
  "Mobile",
  "DevOps",
  "AI/ML",
  "Design",
  "Other",
];

const AdminCourses = () => {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [deleting, setDeleting] = useState<CourseRow | null>(null);

  const load = async () => {
    const { data, error } = await api
      .from("courses")
      .select(
        "id, title, slug, level, category, tags, is_published, is_featured, thumbnail_url, students_count",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCourses((data as CourseRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (
    course: CourseRow,
    field: "is_published" | "is_featured",
  ) => {
    const payload =
      field === "is_published"
        ? { is_published: !course.is_published }
        : { is_featured: !course.is_featured };
    const { error } = await api
      .from("courses")
      .update(payload)
      .eq("id", course.id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  const del = async () => {
    if (!deleting) return;
    const { error } = await api.from("courses").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Course deleted");
    setDeleting(null);
    load();
  };

  return (
    <AdminLayout
      title="Course Management"
      description="Create, edit and organize your courses"
      actions={<CreateCourseDialog onCourseCreated={load} />}
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No courses yet
                  </TableCell>
                </TableRow>
              )}
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{c.title}</div>
                    {c.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="text-xs"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.category || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.level}</Badge>
                  </TableCell>
                  <TableCell>{c.students_count}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle(c, "is_featured")}
                      aria-label="Toggle featured"
                    >
                      <Star
                        className={`h-4 w-4 ${c.is_featured ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                      />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.is_published}
                        onCheckedChange={() => toggle(c, "is_published")}
                      />
                      <span className="text-xs text-muted-foreground">
                        {c.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(c)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing && (
        <EditCourseDialog
          course={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleting?.title}" and all of its
              modules and lessons.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={del}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

interface EditProps {
  course: CourseRow;
  onClose: () => void;
  onSaved: () => void;
}

const EditCourseDialog = ({ course, onClose, onSaved }: EditProps) => {
  const [title, setTitle] = useState(course.title);
  const [category, setCategory] = useState(course.category || "");
  const [level, setLevel] = useState(course.level);
  const [tagsStr, setTagsStr] = useState((course.tags || []).join(", "));
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const { error } = await api
      .from("courses")
      .update({
        title,
        category: category || null,
        level,
        tags,
        thumbnail_url: thumbnailUrl.trim(),
      })
      .eq("id", course.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Course updated");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update course metadata, categories and tags.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
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
          </div>
          <div className="space-y-2">
            <Label>Thumbnail URL (optional)</Label>
            <Input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://example.com/course-thumbnail.jpg"
            />
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="Course thumbnail preview"
                className="h-32 w-full rounded-lg border border-border bg-white p-2 object-contain dark:bg-slate-950"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Textarea
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="react, typescript, hooks"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminCourses;
