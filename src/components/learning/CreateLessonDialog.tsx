import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Loader2, Trash2, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CourseModule } from "@/types/learning";
import { CodingChallengeData } from "./CodingChallenge";

interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

interface CreateLessonDialogProps {
  modules: CourseModule[];
  courseId: string;
  onLessonCreated: () => void;
}

export const CreateLessonDialog = ({ modules, courseId, onLessonCreated }: CreateLessonDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createModuleMode, setCreateModuleMode] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [formData, setFormData] = useState({
    moduleId: "",
    title: "",
    content: "",
    duration: "",
    videoUrl: "",
  });

  // Coding challenge state
  const [enableChallenge, setEnableChallenge] = useState(false);
  const [challengeData, setChallengeData] = useState({
    title: "",
    description: "",
    starterCode: "// Write your code here\n",
    solution: "",
  });
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "", description: "Test case 1" }
  ]);
  const [hints, setHints] = useState<string[]>([""]);

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error("Module title is required");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("course_modules")
      .insert({
        course_id: courseId,
        title: newModuleTitle,
        order_index: modules.length,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error("Failed to create module");
      return;
    }

    toast.success("Module created!");
    setFormData({ ...formData, moduleId: data.id });
    setNewModuleTitle("");
    setCreateModuleMode(false);
    onLessonCreated();
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", description: `Test case ${testCases.length + 1}` }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const addHint = () => {
    setHints([...hints, ""]);
  };

  const removeHint = (index: number) => {
    if (hints.length > 1) {
      setHints(hints.filter((_, i) => i !== index));
    }
  };

  const updateHint = (index: number, value: string) => {
    const updated = [...hints];
    updated[index] = value;
    setHints(updated);
  };

  const resetForm = () => {
    setFormData({
      moduleId: "",
      title: "",
      content: "",
      duration: "",
      videoUrl: "",
    });
    setEnableChallenge(false);
    setChallengeData({
      title: "",
      description: "",
      starterCode: "// Write your code here\n",
      solution: "",
    });
    setTestCases([{ input: "", expectedOutput: "", description: "Test case 1" }]);
    setHints([""]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.moduleId || !formData.title.trim()) {
      toast.error("Please select a module and enter a lesson title");
      return;
    }

    // Validate coding challenge if enabled
    if (enableChallenge) {
      if (!challengeData.title.trim() || !challengeData.description.trim()) {
        toast.error("Please enter a challenge title and description");
        return;
      }
      if (!challengeData.starterCode.trim() || !challengeData.solution.trim()) {
        toast.error("Please provide starter code and solution");
        return;
      }
      const validTestCases = testCases.filter(tc => tc.description.trim() && tc.expectedOutput.trim());
      if (validTestCases.length === 0) {
        toast.error("Please add at least one test case with description and expected output");
        return;
      }
    }

    setLoading(true);

    const selectedModule = modules.find((m) => m.id === formData.moduleId);
    const orderIndex = selectedModule ? selectedModule.lessons.length : 0;

    // Build challenge object if enabled
    let challenge: CodingChallengeData | null = null;
    if (enableChallenge) {
      challenge = {
        id: crypto.randomUUID(),
        title: challengeData.title,
        description: challengeData.description,
        starterCode: challengeData.starterCode,
        solution: challengeData.solution,
        testCases: testCases.filter(tc => tc.description.trim() && tc.expectedOutput.trim()),
        hints: hints.filter(h => h.trim()),
      };
    }

    const { error } = await supabase.from("lessons").insert({
      module_id: formData.moduleId,
      title: formData.title,
      content: formData.content || null,
      duration: formData.duration || null,
      video_url: formData.videoUrl || null,
      order_index: orderIndex,
      challenge: challenge as unknown as undefined,
    });

    setLoading(false);

    if (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson");
      return;
    }

    toast.success("Lesson created successfully!");
    resetForm();
    setOpen(false);
    onLessonCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Module *</Label>
            {createModuleMode ? (
              <div className="flex gap-2">
                <Input
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="New module title"
                />
                <Button type="button" onClick={handleCreateModule} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCreateModuleMode(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.moduleId}
                  onValueChange={(value) => setFormData({ ...formData, moduleId: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setCreateModuleMode(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lessonTitle">Lesson Title *</Label>
            <Input
              id="lessonTitle"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to Variables"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content (Markdown supported)</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Lesson content..."
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 10:30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Coding Challenge Section */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="challenge" className="border-none">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <span>Coding Challenge (Optional)</span>
                  {enableChallenge && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Enabled</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableChallenge"
                      checked={enableChallenge}
                      onChange={(e) => setEnableChallenge(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Label htmlFor="enableChallenge" className="cursor-pointer">
                      Add a coding challenge to this lesson
                    </Label>
                  </div>

                  {enableChallenge && (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Challenge Title *</Label>
                          <Input
                            value={challengeData.title}
                            onChange={(e) => setChallengeData({ ...challengeData, title: e.target.value })}
                            placeholder="e.g., FizzBuzz Challenge"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description *</Label>
                          <Input
                            value={challengeData.description}
                            onChange={(e) => setChallengeData({ ...challengeData, description: e.target.value })}
                            placeholder="Describe what the student needs to do"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Starter Code *</Label>
                        <Textarea
                          value={challengeData.starterCode}
                          onChange={(e) => setChallengeData({ ...challengeData, starterCode: e.target.value })}
                          placeholder="// Code template for students..."
                          className="font-mono text-sm"
                          rows={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Solution Code *</Label>
                        <Textarea
                          value={challengeData.solution}
                          onChange={(e) => setChallengeData({ ...challengeData, solution: e.target.value })}
                          placeholder="// The correct solution..."
                          className="font-mono text-sm"
                          rows={5}
                        />
                      </div>

                      {/* Test Cases */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Test Cases *</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                            <Plus className="h-3 w-3 mr-1" />
                            Add Test
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {testCases.map((testCase, index) => (
                            <div key={index} className="p-3 border rounded-lg bg-secondary/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Test Case {index + 1}</span>
                                {testCases.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTestCase(index)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <Input
                                value={testCase.description}
                                onChange={(e) => updateTestCase(index, "description", e.target.value)}
                                placeholder="Description (e.g., Should return 'Hello World')"
                                className="text-sm"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={testCase.input}
                                  onChange={(e) => updateTestCase(index, "input", e.target.value)}
                                  placeholder="Input (optional)"
                                  className="text-sm"
                                />
                                <Input
                                  value={testCase.expectedOutput}
                                  onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                                  placeholder="Expected output *"
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hints */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Hints (Optional)</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addHint}>
                            <Plus className="h-3 w-3 mr-1" />
                            Add Hint
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {hints.map((hint, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={hint}
                                onChange={(e) => updateHint(index, e.target.value)}
                                placeholder={`Hint ${index + 1}...`}
                                className="text-sm"
                              />
                              {hints.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeHint(index)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.moduleId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Lesson
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};