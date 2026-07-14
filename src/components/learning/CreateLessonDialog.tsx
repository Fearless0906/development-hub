import { ChangeEvent, useEffect, useRef, useState } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus,
  Loader2,
  Trash2,
  Code,
  ImagePlus,
  Paperclip,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
} from "lucide-react";
import { api } from "@/integrations/django/api";
import { createUuid } from "@/lib/createUuid";
import { detectCodeLanguage } from "@/lib/detectCodeLanguage";
import { toast } from "sonner";
import { CourseModule } from "@/types/learning";
import { CodingChallengeData } from "./CodingChallenge";

interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

const CHALLENGE_LANGUAGES = [
  "javascript",
  "typescript",
  "tsx",
  "jsx",
  "python",
  "html",
  "css",
  "json",
  "bash",
] as const;

interface CreateLessonDialogProps {
  modules: CourseModule[];
  courseId: string;
  onLessonCreated: (lessonId?: string) => void;
  iconOnly?: boolean;
}

export const CreateLessonDialog = ({
  modules,
  courseId,
  onLessonCreated,
  iconOnly = false,
}: CreateLessonDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createModuleMode, setCreateModuleMode] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [availableModules, setAvailableModules] = useState(modules);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [formData, setFormData] = useState({
    moduleId: "",
    title: "",
    content: "",
    codeLanguage: "python",
    codeSnippet: "",
    imageName: "",
    noteType: "note",
    linkUrl: "",
  });

  // Coding challenge state
  const [enableChallenge, setEnableChallenge] = useState(false);
  const [challengeData, setChallengeData] = useState({
    title: "",
    description: "",
    language: "javascript",
    starterCode: "// Write your code here\n",
    solution: "",
  });
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "", description: "Test case 1" },
  ]);
  const [hints, setHints] = useState<string[]>([""]);

  useEffect(() => {
    setAvailableModules(modules);
  }, [modules]);

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error("Module title is required");
      return;
    }

    setLoading(true);
    const { data, error } = await api
      .from("course_modules")
      .insert({
        course_id: courseId,
        title: newModuleTitle,
        order_index: availableModules.length,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error("Failed to create module");
      return;
    }

    toast.success("Module created!");
    setAvailableModules((prev) => [...prev, { ...data, lessons: [] }]);
    setFormData((prev) => ({ ...prev, moduleId: data.id }));
    setNewModuleTitle("");
    setCreateModuleMode(false);
  };

  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        input: "",
        expectedOutput: "",
        description: `Test case ${testCases.length + 1}`,
      },
    ]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (
    index: number,
    field: keyof TestCase,
    value: string,
  ) => {
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
      codeLanguage: "python",
      codeSnippet: "",
      imageName: "",
      noteType: "note",
      linkUrl: "",
    });
    setEnableChallenge(false);
    setChallengeData({
      title: "",
      description: "",
      language: "javascript",
      starterCode: "// Write your code here\n",
      solution: "",
    });
    setTestCases([
      { input: "", expectedOutput: "", description: "Test case 1" },
    ]);
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
      const validTestCases = testCases.filter(
        (tc) => tc.description.trim() && tc.expectedOutput.trim(),
      );
      if (validTestCases.length === 0) {
        toast.error(
          "Please add at least one test case with description and expected output",
        );
        return;
      }
    }

    setLoading(true);

    const selectedModule = availableModules.find(
      (m) => m.id === formData.moduleId,
    );
    const orderIndex = selectedModule
      ? selectedModule.lessons.reduce(
          (maxOrder, lesson) => Math.max(maxOrder, lesson.order_index),
          -1,
        ) + 1
      : 0;

    // Build challenge object if enabled
    let challenge: CodingChallengeData | null = null;
    if (enableChallenge) {
      challenge = {
        id: createUuid(),
        title: challengeData.title,
        description: challengeData.description,
        language: challengeData.language,
        starterCode: challengeData.starterCode,
        solution: challengeData.solution,
        testCases: testCases.filter(
          (tc) => tc.description.trim() && tc.expectedOutput.trim(),
        ),
        hints: hints.filter((h) => h.trim()),
      };
    }

    const { data, error } = await api
      .from("lessons")
      .insert({
        module_id: formData.moduleId,
        title: formData.title,
        content: formData.content || null,
        duration: null,
        video_url: null,
        order_index: orderIndex,
        challenge: challenge as unknown as undefined,
      })
      .select("id")
      .single();

    setLoading(false);

    if (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson");
      return;
    }

    toast.success("Lesson created successfully!");
    resetForm();
    setOpen(false);
    onLessonCreated(data?.id);
  };

  const appendToContent = (snippet: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content.trim()
        ? `${prev.content.trim()}\n\n${snippet}`
        : snippet,
    }));
  };

  const updateContentSelection = (
    updater: (
      value: string,
      start: number,
      end: number,
    ) => {
      value: string;
      start: number;
      end: number;
    },
  ) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const next = updater(value, selectionStart, selectionEnd);

    setFormData((prev) => ({
      ...prev,
      content: next.value,
    }));

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.start, next.end);
    });
  };

  const wrapSelection = (
    before: string,
    after: string,
    placeholder: string,
  ) => {
    updateContentSelection((value, start, end) => {
      const selected = value.slice(start, end) || placeholder;
      const nextValue =
        value.slice(0, start) + before + selected + after + value.slice(end);
      return {
        value: nextValue,
        start: start + before.length,
        end: start + before.length + selected.length,
      };
    });
  };

  const prefixSelectionLines = (prefix: string) => {
    updateContentSelection((value, start, end) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndIndex = value.indexOf("\n", end);
      const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
      const block = value.slice(lineStart, lineEnd);
      const updatedBlock = block
        .split("\n")
        .map((line) => `${prefix}${line}`)
        .join("\n");
      const nextValue =
        value.slice(0, lineStart) + updatedBlock + value.slice(lineEnd);
      return {
        value: nextValue,
        start: lineStart,
        end: lineStart + updatedBlock.length,
      };
    });
  };

  const insertNoteBlock = () => {
    const labels: Record<string, string> = {
      note: "NOTE",
      tip: "TIP",
      warning: "WARNING",
      why: "WHY IT MATTERS",
    };

    appendToContent(
      `> **${labels[formData.noteType]}**\n> Add your note here.`,
    );
    focusContentAtEnd();
  };

  const insertLink = () => {
    if (!formData.linkUrl.trim()) {
      toast.error("Please enter a link URL first");
      return;
    }

    updateContentSelection((value, start, end) => {
      const selected = value.slice(start, end) || "link text";
      const markdownLink = `[${selected}](${formData.linkUrl.trim()})`;
      const nextValue = value.slice(0, start) + markdownLink + value.slice(end);
      return {
        value: nextValue,
        start,
        end: start + markdownLink.length,
      };
    });

    setFormData((prev) => ({ ...prev, linkUrl: "" }));
  };

  const handleContentKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key !== "Tab") return;

    e.preventDefault();
    updateContentSelection((value, start, end) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndIndex = value.indexOf("\n", end);
      const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
      const block = value.slice(lineStart, lineEnd);

      if (e.shiftKey) {
        const updatedBlock = block
          .split("\n")
          .map((line) => (line.startsWith("  ") ? line.slice(2) : line))
          .join("\n");
        const nextValue =
          value.slice(0, lineStart) + updatedBlock + value.slice(lineEnd);
        return {
          value: nextValue,
          start: lineStart,
          end: lineStart + updatedBlock.length,
        };
      }

      const updatedBlock = block
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      const nextValue =
        value.slice(0, lineStart) + updatedBlock + value.slice(lineEnd);
      return {
        value: nextValue,
        start: lineStart,
        end: lineStart + updatedBlock.length,
      };
    });
  };

  const focusContentAtEnd = () => {
    requestAnimationFrame(() => {
      const textarea = contentTextareaRef.current;
      if (!textarea) return;

      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
      textarea.scrollTop = textarea.scrollHeight;
    });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      imageName: file.name,
    }));
    toast.success("Image attached");
    e.target.value = "";
  };

  const insertCodeBlock = () => {
    if (!formData.codeSnippet.trim()) {
      toast.error("Please enter some code first");
      return;
    }

    const detectedLanguage = detectCodeLanguage(formData.codeSnippet);

    appendToContent(
      `\`\`\`${detectedLanguage === "text" ? formData.codeLanguage : detectedLanguage}\n${formData.codeSnippet}\n\`\`\``,
    );
    toast.success("Code block added to lesson content");
    focusContentAtEnd();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={iconOnly ? "icon" : "sm"}
          aria-label="Add lesson"
          title="Add lesson"
          className={iconOnly ? "h-9 w-9" : undefined}
        >
          <Plus className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-2"} />
          {!iconOnly && "Add Lesson"}
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
                <Button
                  type="button"
                  onClick={handleCreateModule}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateModuleMode(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.moduleId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, moduleId: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModuleMode(true)}
                >
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
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Introduction to Variables"
            />
          </div>
          {/* <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="content">Content (Markdown supported)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("**", "**", "bold text")}>
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("*", "*", "italic text")}>
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("`", "`", "inline code")}>
                  <Code className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => prefixSelectionLines("## ")}>
                  <Heading2 className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => prefixSelectionLines("- ")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => prefixSelectionLines("1. ")}>
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => prefixSelectionLines("> ")}>
                  <Quote className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/20 p-2">
              <Select
                value={formData.noteType}
                onValueChange={(value) =>
                  setFormData({ ...formData, noteType: value })
                }
              >
                <SelectTrigger className="h-8 w-[180px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="tip">Tip</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="why">Why It Matters</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={insertNoteBlock}>
                Add Note
              </Button>
              <Input
                value={formData.linkUrl}
                onChange={(e) =>
                  setFormData({ ...formData, linkUrl: e.target.value })
                }
                placeholder="https://example.com"
                className="h-8 w-[220px] bg-background"
              />
              <Button type="button" variant="outline" size="sm" onClick={insertLink}>
                Add Link
              </Button>
              <span className="text-xs text-muted-foreground">
                `Tab` indents, `Shift+Tab` outdents
              </span>
            </div>
            <Textarea
              id="content"
              ref={contentTextareaRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              onKeyDown={handleContentKeyDown}
              placeholder="Lesson content..."
              rows={6}
            />
          </div> */}
          {/* <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lessonImage">Lesson Image</Label>
              <input
                id="lessonImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="rounded-lg border border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {formData.imageName ? (
                        <Paperclip className="h-4 w-4" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {formData.imageName || "No attachment selected"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formData.imageName
                          ? "Image attached to this lesson"
                          : "Upload an image and it will be added when you create the lesson."}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label htmlFor="lessonImage" className="cursor-pointer">
                      {formData.imageName ? "Replace" : "Attach"}
                    </label>
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="codeLanguage">Code Language</Label>
              <Select
                value={formData.codeLanguage}
                onValueChange={(value) =>
                  setFormData({ ...formData, codeLanguage: value })
                }
              >
                <SelectTrigger id="codeLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tsx">TSX</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="bash">Bash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div> */}
          {/* <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="codeSnippet">Code Snippet</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertCodeBlock}
              >
                Add Code to Content
              </Button>
            </div>
            <Textarea
              id="codeSnippet"
              value={formData.codeSnippet}
              onChange={(e) =>
                setFormData({ ...formData, codeSnippet: e.target.value })
              }
              placeholder="// Paste the code you want to show in this lesson"
              className="font-mono text-sm"
              rows={6}
            />
          </div> */}

          {/* Coding Challenge Section */}
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="challenge" className="border-none">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <span>Coding Challenge (Optional)</span>
                  {enableChallenge && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Enabled
                    </span>
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
                            onChange={(e) =>
                              setChallengeData({
                                ...challengeData,
                                title: e.target.value,
                              })
                            }
                            placeholder="e.g., FizzBuzz Challenge"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description *</Label>
                          <Input
                            value={challengeData.description}
                            onChange={(e) =>
                              setChallengeData({
                                ...challengeData,
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe what the student needs to do"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Challenge Language *</Label>
                        <Select
                          value={challengeData.language}
                          onValueChange={(value) =>
                            setChallengeData({
                              ...challengeData,
                              language: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHALLENGE_LANGUAGES.map((language) => (
                              <SelectItem key={language} value={language}>
                                {language.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Only JavaScript challenges can run tests in-browser for now.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Starter Code *</Label>
                        <Textarea
                          value={challengeData.starterCode}
                          onChange={(e) =>
                            setChallengeData({
                              ...challengeData,
                              starterCode: e.target.value,
                            })
                          }
                          placeholder="// Code template for students..."
                          className="font-mono text-sm"
                          rows={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Solution Code *</Label>
                        <Textarea
                          value={challengeData.solution}
                          onChange={(e) =>
                            setChallengeData({
                              ...challengeData,
                              solution: e.target.value,
                            })
                          }
                          placeholder="// The correct solution..."
                          className="font-mono text-sm"
                          rows={5}
                        />
                      </div>

                      {/* Test Cases */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Test Cases *</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTestCase}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Test
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {testCases.map((testCase, index) => (
                            <div
                              key={index}
                              className="p-3 border rounded-lg bg-secondary/20 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  Test Case {index + 1}
                                </span>
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
                                onChange={(e) =>
                                  updateTestCase(
                                    index,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="Description (e.g., Should return 'Hello World')"
                                className="text-sm"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={testCase.input}
                                  onChange={(e) =>
                                    updateTestCase(
                                      index,
                                      "input",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Input (optional)"
                                  className="text-sm"
                                />
                                <Input
                                  value={testCase.expectedOutput}
                                  onChange={(e) =>
                                    updateTestCase(
                                      index,
                                      "expectedOutput",
                                      e.target.value,
                                    )
                                  }
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addHint}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Hint
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {hints.map((hint, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={hint}
                                onChange={(e) =>
                                  updateHint(index, e.target.value)
                                }
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
