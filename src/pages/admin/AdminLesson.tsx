import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Trash2, Loader2, FileText, Paperclip } from "lucide-react";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";
import { CreateLessonDialog } from "@/components/learning/CreateLessonDialog";
import { CourseModule } from "@/types/learning";

interface CourseOption {
  id: string;
  title: string;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  module_title: string;
}

const AdminLessons = () => {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [deleting, setDeleting] = useState<LessonRow | null>(null);

  const loadCourses = async () => {
    const { data, error } = await api
      .from("courses")
      .select("id, title")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setCourses(data || []);
    if (data && data.length && !selectedCourse) setSelectedCourse(data[0].id);
    setLoading(false);
  };

  const loadLessons = async (courseId: string) => {
    if (!courseId) return;
    const { data: mods, error: modErr } = await api
      .from("course_modules")
      .select(
        "id, title, order_index, lessons(id, module_id, title, content, video_url, order_index)",
      )
      .eq("course_id", courseId)
      .order("order_index");
    if (modErr) return toast.error(modErr.message);

    const modList: CourseModule[] = (mods || []).map((m: any) => ({
      id: m.id,
      course_id: courseId,
      title: m.title,
      order_index: m.order_index,
      lessons: (m.lessons || []).sort(
        (a: any, b: any) => a.order_index - b.order_index,
      ),
    }));
    setModules(modList);

    const flat: LessonRow[] = [];
    modList.forEach((m) => {
      m.lessons.forEach((l: any) => {
        flat.push({
          id: l.id,
          module_id: l.module_id,
          title: l.title,
          content: l.content,
          video_url: l.video_url,
          order_index: l.order_index,
          module_title: m.title,
        });
      });
    });
    setLessons(flat);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) loadLessons(selectedCourse);
  }, [selectedCourse]);

  const del = async () => {
    if (!deleting) return;
    const { error } = await api.from("lessons").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Lesson deleted");
    setDeleting(null);
    loadLessons(selectedCourse);
  };

  return (
    <AdminLayout
      title="Lesson Management"
      description="Manage lessons across your courses"
      actions={
        selectedCourse && (
          <CreateLessonDialog
            modules={modules}
            courseId={selectedCourse}
            onLessonCreated={() => loadLessons(selectedCourse)}
          />
        )
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No courses yet. Create a course first.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Label className="text-sm text-muted-foreground">Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border/50 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No lessons yet
                    </TableCell>
                  </TableRow>
                )}
                {lessons.map((l, i) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {l.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.module_title}</Badge>
                    </TableCell>
                    <TableCell>
                      {l.video_url ? (
                        <a
                          href={l.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Paperclip className="h-3 w-3" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(l)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(l)}
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
        </>
      )}

      {editing && (
        <EditLessonDialog
          lesson={editing}
          modules={modules}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadLessons(selectedCourse);
          }}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleting?.title}".
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
  lesson: LessonRow;
  modules: CourseModule[];
  onClose: () => void;
  onSaved: () => void;
}

const EditLessonDialog = ({ lesson, modules, onClose, onSaved }: EditProps) => {
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState(lesson.content || "");
  const [moduleId, setModuleId] = useState(lesson.module_id);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await api
      .from("lessons")
      .update({ title, content: content || null, module_id: moduleId })
      .eq("id", lesson.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lesson updated");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
          <DialogDescription>
            Update title, content and module.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Module</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Content (Markdown)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLessons;
