import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import {
  Bold,
  Eraser,
  Italic,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  PanelsTopLeft,
  ChevronDownSquare,
  Strikethrough,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  LinkIcon,
  Table2,
  Plus,
  Trash2,
  Settings2,
  ImagePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Youtube,
  Paperclip,
  AudioLines,
  Sigma,
  Columns2,
  Command,
} from "lucide-react";
import parse, { Element } from "html-react-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FontSize } from "@/lib/FontSize";
import { detectCodeLanguage } from "@/lib/detectCodeLanguage";
import { CodeBlock } from "../code/CodeBlock";
import {
  EditorImageNode,
  HighlightMark,
  TableCellNode,
  TableHeaderNode,
  TableNode,
  TableRowNode,
  TaskItemNode,
  TaskListNode,
  TextColor,
  TextAlign,
  YouTubeNode,
  CalloutNode,
  CollapsibleNode,
  SubscriptMark,
  SuperscriptMark,
  ColumnsLayoutNode,
  ColumnBlockNode,
  FileAttachmentNode,
  AudioAttachmentNode,
  MathBlockNode,
} from "./richTextExtensions";
import { useRichTextImage } from "./hooks/useRichTextImage";
import { useRichTextTable } from "./hooks/useRichTextTable";
import { useRichTextToolbarState } from "./hooks/useRichTextToolbarState";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONT_FAMILY_OPTIONS = [
  "Inter",
  "Arial",
  "Segoe UI",
  "Poppins",
  "Roboto",
  "JetBrains Mono",
  "Times New Roman",
  "Georgia",
] as const;

const FONT_SIZE_OPTIONS = [
  { value: "10px", label: "10" },
  { value: "11px", label: "11" },
  { value: "12px", label: "12" },
  { value: "13px", label: "13" },
  { value: "14px", label: "14" },
  { value: "15px", label: "15" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
  { value: "30px", label: "30" },
  { value: "36px", label: "36" },
  { value: "48px", label: "48" },
] as const;

const CODE_LANGUAGE_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "tsx", label: "TSX" },
  { value: "jsx", label: "JSX" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "text", label: "Plain Text" },
] as const;

const TEXT_COLOR_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "#0f172a", label: "Slate" },
  { value: "#2563eb", label: "Blue" },
  { value: "#0891b2", label: "Cyan" },
  { value: "#16a34a", label: "Green" },
  { value: "#ca8a04", label: "Amber" },
  { value: "#dc2626", label: "Red" },
  { value: "#7c3aed", label: "Violet" },
] as const;

const BLOCK_TYPE_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
] as const;

const CALLOUT_VARIANT_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "tip", label: "Tip" },
  { value: "warning", label: "Warning" },
  { value: "important", label: "Important" },
] as const;

const SLASH_COMMAND_DEFINITIONS = [
  { id: "paragraph", label: "Paragraph", keywords: ["text", "paragraph"] },
  { id: "heading1", label: "Heading 1", keywords: ["title", "h1"] },
  { id: "heading2", label: "Heading 2", keywords: ["subtitle", "h2"] },
  { id: "heading3", label: "Heading 3", keywords: ["section", "h3"] },
  { id: "bulletList", label: "Bullet List", keywords: ["list", "ul"] },
  { id: "orderedList", label: "Numbered List", keywords: ["list", "ol"] },
  { id: "taskList", label: "Task List", keywords: ["checklist", "todo"] },
  { id: "blockquote", label: "Quote", keywords: ["blockquote", "quote"] },
  { id: "code", label: "Code Block", keywords: ["code", "snippet"] },
  { id: "table", label: "Table", keywords: ["table", "grid"] },
  { id: "image", label: "Image", keywords: ["image", "photo"] },
  { id: "youtube", label: "YouTube", keywords: ["video", "youtube"] },
  { id: "divider", label: "Divider", keywords: ["hr", "line"] },
  { id: "callout", label: "Callout", keywords: ["note", "tip", "warning"] },
  { id: "collapsible", label: "Collapsible", keywords: ["details", "accordion"] },
  { id: "columns", label: "Columns", keywords: ["columns", "layout"] },
  { id: "file", label: "File Attachment", keywords: ["file", "attachment"] },
  { id: "audio", label: "Audio Attachment", keywords: ["audio", "sound"] },
  { id: "math", label: "Math / LaTeX", keywords: ["math", "latex", "formula"] },
] as const;

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write lesson content...",
  minHeight = "320px",
}: RichTextEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("python");
  const [codeValue, setCodeValue] = useState("");
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [calloutDialogOpen, setCalloutDialogOpen] = useState(false);
  const [calloutVariant, setCalloutVariant] = useState("note");
  const [calloutTitle, setCalloutTitle] = useState("Note");
  const [collapsibleDialogOpen, setCollapsibleDialogOpen] = useState(false);
  const [collapsibleSummary, setCollapsibleSummary] = useState("More details");
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnsCount, setColumnsCount] = useState("2");
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [mathFormula, setMathFormula] = useState("");
  const [mathDisplayMode, setMathDisplayMode] = useState(true);
  const [slashMenu, setSlashMenu] = useState({
    open: false,
    query: "",
    from: 0,
    to: 0,
    top: 0,
    left: 0,
  });
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TableNode,
      TableRowNode,
      TableHeaderNode,
      TableCellNode,
      EditorImageNode,
      TaskListNode,
      TaskItemNode,
      YouTubeNode,
      ColumnsLayoutNode,
      ColumnBlockNode,
      FileAttachmentNode,
      AudioAttachmentNode,
      MathBlockNode,
      CalloutNode,
      CollapsibleNode,
      TextAlign,
      TextColor,
      HighlightMark,
      SubscriptMark,
      SuperscriptMark,
      TextStyle,
      Underline,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
          class: "text-cyan-600 underline underline-offset-4",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] rounded-b-xl border border-t-0 border-slate-200 bg-background px-4 py-4 text-sm leading-7 outline-none dark:border-white/10",
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const { imageInputRef, openImagePicker, handleImageUpload } =
    useRichTextImage(editor);
  const {
    tableDialogOpen,
    setTableDialogOpen,
    tableActionsOpen,
    setTableActionsOpen,
    tableRows,
    setTableRows,
    tableColumns,
    setTableColumns,
    tableWithHeader,
    setTableWithHeader,
    resetTableForm,
    applyTable,
    addTableRow,
    addTableColumn,
    deleteTableRow,
    deleteTableColumn,
    removeTable,
  } = useRichTextTable(editor);
  const {
    activeFontFamily,
    activeFontSize,
    activeTextColor,
    activeBlockType,
    applyToWholeLesson,
    applyTextColor,
    applyBlockType,
    activeTextTools,
    currentTextAlign,
  } = useRichTextToolbarState(editor);

  useEffect(() => {
    if (!editor) return;

    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", {
        parseOptions: { preserveWhitespace: "full" },
      });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor || !editorContainerRef.current) return;

    const syncSlashMenu = () => {
      const { state, view } = editor;
      if (!state.selection.empty) {
        setSlashMenu((current) => ({ ...current, open: false }));
        return;
      }

      const { $from } = state.selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\0", "\0");
      const slashIndex = textBefore.lastIndexOf("/");

      if (slashIndex === -1) {
        setSlashMenu((current) => ({ ...current, open: false }));
        return;
      }

      if (slashIndex > 0 && !/\s/.test(textBefore[slashIndex - 1])) {
        setSlashMenu((current) => ({ ...current, open: false }));
        return;
      }

      const query = textBefore.slice(slashIndex + 1);
      if (/[\s]/.test(query)) {
        setSlashMenu((current) => ({ ...current, open: false }));
        return;
      }

      const from = state.selection.from - query.length - 1;
      const coords = view.coordsAtPos(state.selection.from);
      const containerRect = editorContainerRef.current.getBoundingClientRect();

      setSlashMenu({
        open: true,
        query,
        from,
        to: state.selection.from,
        top: coords.bottom - containerRect.top + 8,
        left: coords.left - containerRect.left,
      });
    };

    syncSlashMenu();
    editor.on("transaction", syncSlashMenu);
    editor.on("selectionUpdate", syncSlashMenu);

    return () => {
      editor.off("transaction", syncSlashMenu);
      editor.off("selectionUpdate", syncSlashMenu);
    };
  }, [editor]);

  if (!editor) return null;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openLinkDialog = () => {
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkDialogOpen(true);
  };

  const openCodeDialog = () => {
    const { from, to } = editor.state.selection;
    const selectedCode = editor.state.doc.textBetween(from, to, "\n");
    setCodeValue(selectedCode);
    setCodeLanguage(
      selectedCode.trim() ? detectCodeLanguage(selectedCode) : "python",
    );
    setCodeDialogOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();

    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkDialogOpen(false);
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  const insertTaskList = () => {
    editor
      .chain()
      .focus()
      .insertContent(`
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="false"><p>First task</p></li>
          <li data-type="taskItem" data-checked="false"><p>Second task</p></li>
        </ul>
        <p></p>
      `)
      .run();
  };

  const insertColumnsLayout = () => {
    const count = Math.max(2, Math.min(3, Number.parseInt(columnsCount, 10) || 2));
    const columnsHtml = Array.from({ length: count }, (_, index) => {
      return `<div data-column-block="true"><p>Column ${index + 1}</p></div>`;
    }).join("");

    editor
      .chain()
      .focus()
      .insertContent(
        `<div data-columns-layout="true" data-columns="${count}">${columnsHtml}</div><p></p>`,
      )
      .run();

    setColumnsDialogOpen(false);
    setColumnsCount("2");
  };

  const insertFileAttachment = async (file: File) => {
    const href = await readFileAsDataUrl(file);
    editor
      .chain()
      .focus()
      .insertContent({
        type: "fileAttachment",
        attrs: {
          href,
          name: file.name,
          size: formatBytes(file.size),
          mime: file.type,
        },
      })
      .insertContent({ type: "paragraph" })
      .run();
  };

  const insertAudioAttachment = async (file: File) => {
    const src = await readFileAsDataUrl(file);
    editor
      .chain()
      .focus()
      .insertContent({
        type: "audioAttachment",
        attrs: {
          src,
          name: file.name,
        },
      })
      .insertContent({ type: "paragraph" })
      .run();
  };

  const handleFileAttachmentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await insertFileAttachment(file);
    } finally {
      event.target.value = "";
    }
  };

  const handleAudioAttachmentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      event.target.value = "";
      return;
    }

    try {
      await insertAudioAttachment(file);
    } finally {
      event.target.value = "";
    }
  };

  const openFilePicker = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (typeof fileInputRef.current.showPicker === "function") {
      fileInputRef.current.showPicker();
      return;
    }
    fileInputRef.current.click();
  };

  const openAudioPicker = () => {
    if (!audioInputRef.current) return;
    audioInputRef.current.value = "";
    if (typeof audioInputRef.current.showPicker === "function") {
      audioInputRef.current.showPicker();
      return;
    }
    audioInputRef.current.click();
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return null;

    const embedMatch = trimmed.match(
      /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    );
    if (embedMatch) {
      return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }

    const watchMatch = trimmed.match(
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    );
    if (watchMatch) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }

    const shortMatch = trimmed.match(
      /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
    );
    if (shortMatch) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }

    return null;
  };

  const applyYouTubeEmbed = () => {
    const src = getYouTubeEmbedUrl(youtubeUrl);
    if (!src) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "youtubeEmbed",
        attrs: {
          src,
          title: "Embedded YouTube video",
        },
      })
      .insertContent({ type: "paragraph" })
      .run();

    setYoutubeDialogOpen(false);
    setYoutubeUrl("");
  };

  const applyCallout = () => {
    editor
      .chain()
      .focus()
      .insertContent(`
        <div data-callout="${calloutVariant}" data-title="${escapeHtml(calloutTitle || "Note")}">
          <p>Write your callout content here...</p>
        </div>
        <p></p>
      `)
      .run();

    setCalloutDialogOpen(false);
    setCalloutVariant("note");
    setCalloutTitle("Note");
  };

  const applyCollapsible = () => {
    editor
      .chain()
      .focus()
      .insertContent(`
        <details data-collapsible="true">
          <summary>${escapeHtml(collapsibleSummary || "More details")}</summary>
          <p>Write collapsible content here...</p>
        </details>
        <p></p>
      `)
      .run();

    setCollapsibleDialogOpen(false);
    setCollapsibleSummary("More details");
  };

  const applyMathBlock = () => {
    const formula = mathFormula.trim();
    if (!formula) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "mathBlock",
        attrs: {
          formula,
          displayMode: mathDisplayMode,
        },
      })
      .insertContent({ type: "paragraph" })
      .run();

    setMathDialogOpen(false);
    setMathFormula("");
    setMathDisplayMode(true);
  };

  const clearFormatting = () => {
    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .clearNodes()
      .unsetTextAlign()
      .unsetColor()
      .run();
  };

  const runSlashCommand = (
    commandId: (typeof SLASH_COMMAND_DEFINITIONS)[number]["id"],
  ) => {
    editor
      .chain()
      .focus()
      .deleteRange({ from: slashMenu.from, to: slashMenu.to })
      .run();
    setSlashMenu((current) => ({ ...current, open: false }));

    switch (commandId) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        break;
      case "heading1":
        editor.chain().focus().setHeading({ level: 1 }).run();
        break;
      case "heading2":
        editor.chain().focus().setHeading({ level: 2 }).run();
        break;
      case "heading3":
        editor.chain().focus().setHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "taskList":
        insertTaskList();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "code":
        openCodeDialog();
        break;
      case "table":
        setTableDialogOpen(true);
        break;
      case "image":
        openImagePicker();
        break;
      case "youtube":
        setYoutubeDialogOpen(true);
        break;
      case "divider":
        editor.chain().focus().setHorizontalRule().run();
        break;
      case "callout":
        setCalloutDialogOpen(true);
        break;
      case "collapsible":
        setCollapsibleDialogOpen(true);
        break;
      case "columns":
        setColumnsDialogOpen(true);
        break;
      case "file":
        openFilePicker();
        break;
      case "audio":
        openAudioPicker();
        break;
      case "math":
        setMathDialogOpen(true);
        break;
      default:
        break;
    }
  };

  const filteredSlashCommands = SLASH_COMMAND_DEFINITIONS.filter((command) => {
    const needle = slashMenu.query.trim().toLowerCase();
    if (!needle) return true;

    return (
      command.label.toLowerCase().includes(needle) ||
      command.keywords.some((keyword) => keyword.includes(needle))
    );
  }).slice(0, 8);

  const escapeHtml = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const applyCodeBlock = () => {
    const trimmed = codeValue.trim();
    if (!trimmed) {
      setCodeDialogOpen(false);
      setCodeValue("");
      return;
    }

    const html = `<pre><code class="language-${codeLanguage}">${escapeHtml(trimmed)}</code></pre>`;

    if (editor.isActive("codeBlock")) {
      const { $from } = editor.state.selection;
      const codeBlockDepth = $from.depth;
      const from = $from.before(codeBlockDepth);
      const to = from + $from.node(codeBlockDepth).nodeSize;

      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(html)
        .run();
    } else {
      editor.chain().focus().insertContent(html).run();
    }

    setCodeDialogOpen(false);
    setCodeValue("");
    setCodeLanguage("python");
  };

  return (
    <div
      ref={editorContainerRef}
      className="relative rounded-xl border border-slate-200 dark:border-white/10"
    >
      <Input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleImageUpload(event);
        }}
      />
      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          void handleFileAttachmentUpload(event);
        }}
      />
      <Input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          void handleAudioAttachmentUpload(event);
        }}
      />
      {slashMenu.open && filteredSlashCommands.length > 0 && (
        <div
          className="absolute z-30 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900"
          style={{
            top: slashMenu.top,
            left: Math.max(12, slashMenu.left),
          }}
        >
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Slash Commands
          </div>
          <div className="space-y-1">
            {filteredSlashCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-slate-100 dark:hover:bg-white/5"
                onMouseDown={(event) => {
                  event.preventDefault();
                  runSlashCommand(command.id);
                }}
              >
                <span className="mr-3 text-xs font-mono text-cyan-600 dark:text-cyan-300">
                  /
                </span>
                {command.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <Dialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open);
          if (!open) {
            setLinkUrl("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="rich-text-link-url"
                className="text-sm font-medium text-foreground"
              >
                URL
              </label>
              <Input
                id="rich-text-link-url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                autoFocus
                placeholder="https://example.com"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Apply Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={tableDialogOpen}
        onOpenChange={(open) => {
          setTableDialogOpen(open);
          if (!open) {
            resetTableForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyTable();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="rich-text-table-rows"
                  className="text-sm font-medium text-foreground"
                >
                  Rows
                </label>
                <Input
                  id="rich-text-table-rows"
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(event) => setTableRows(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="rich-text-table-columns"
                  className="text-sm font-medium text-foreground"
                >
                  Columns
                </label>
                <Input
                  id="rich-text-table-columns"
                  type="number"
                  min="1"
                  max="10"
                  value={tableColumns}
                  onChange={(event) => setTableColumns(event.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={tableWithHeader}
                onChange={(event) => setTableWithHeader(event.target.checked)}
                className="rounded border-input"
              />
              Add header row
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTableDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Table</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={tableActionsOpen} onOpenChange={setTableActionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                addTableRow();
                setTableActionsOpen(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                addTableColumn();
                setTableActionsOpen(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Column
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                deleteTableRow();
                setTableActionsOpen(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Row
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                deleteTableColumn();
                setTableActionsOpen(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Column
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTableActionsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                removeTable();
                setTableActionsOpen(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={youtubeDialogOpen}
        onOpenChange={(open) => {
          setYoutubeDialogOpen(open);
          if (!open) {
            setYoutubeUrl("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed YouTube Video</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyYouTubeEmbed();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="rich-text-youtube-url"
                className="text-sm font-medium text-foreground"
              >
                YouTube URL
              </label>
              <Input
                id="rich-text-youtube-url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                autoFocus
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setYoutubeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Embed Video</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={calloutDialogOpen}
        onOpenChange={(open) => {
          setCalloutDialogOpen(open);
          if (!open) {
            setCalloutVariant("note");
            setCalloutTitle("Note");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Callout</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyCallout();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select
                value={calloutVariant}
                onValueChange={(value) => {
                  setCalloutVariant(value);
                  setCalloutTitle(
                    CALLOUT_VARIANT_OPTIONS.find((option) => option.value === value)
                      ?.label || "Note",
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALLOUT_VARIANT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="rich-text-callout-title"
                className="text-sm font-medium text-foreground"
              >
                Title
              </label>
              <Input
                id="rich-text-callout-title"
                value={calloutTitle}
                onChange={(event) => setCalloutTitle(event.target.value)}
                placeholder="Callout title"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCalloutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Callout</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={collapsibleDialogOpen}
        onOpenChange={(open) => {
          setCollapsibleDialogOpen(open);
          if (!open) {
            setCollapsibleSummary("More details");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Collapsible Section</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyCollapsible();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="rich-text-collapsible-summary"
                className="text-sm font-medium text-foreground"
              >
                Summary
              </label>
              <Input
                id="rich-text-collapsible-summary"
                value={collapsibleSummary}
                onChange={(event) => setCollapsibleSummary(event.target.value)}
                placeholder="More details"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCollapsibleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Section</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={columnsDialogOpen}
        onOpenChange={(open) => {
          setColumnsDialogOpen(open);
          if (!open) {
            setColumnsCount("2");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Columns Layout</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              insertColumnsLayout();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Columns</label>
              <Select value={columnsCount} onValueChange={setColumnsCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setColumnsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Layout</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={mathDialogOpen}
        onOpenChange={(open) => {
          setMathDialogOpen(open);
          if (!open) {
            setMathFormula("");
            setMathDisplayMode(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Math / LaTeX</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyMathBlock();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="rich-text-math-formula"
                className="text-sm font-medium text-foreground"
              >
                Formula
              </label>
              <textarea
                id="rich-text-math-formula"
                value={mathFormula}
                onChange={(event) => setMathFormula(event.target.value)}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="\\int_0^1 x^2 \\, dx"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={mathDisplayMode}
                onChange={(event) => setMathDisplayMode(event.target.checked)}
                className="rounded border-input"
              />
              Display as block formula
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMathDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Formula</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={columnsDialogOpen}
        onOpenChange={(open) => {
          setColumnsDialogOpen(open);
          if (!open) {
            setColumnsCount("2");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Columns Layout</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              insertColumnsLayout();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Columns</label>
              <Select value={columnsCount} onValueChange={setColumnsCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setColumnsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Layout</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={mathDialogOpen}
        onOpenChange={(open) => {
          setMathDialogOpen(open);
          if (!open) {
            setMathFormula("");
            setMathDisplayMode(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Math / LaTeX</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyMathBlock();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="rich-text-math-formula"
                className="text-sm font-medium text-foreground"
              >
                Formula
              </label>
              <textarea
                id="rich-text-math-formula"
                value={mathFormula}
                onChange={(event) => setMathFormula(event.target.value)}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="\\int_0^1 x^2 \\, dx"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={mathDisplayMode}
                onChange={(event) => setMathDisplayMode(event.target.checked)}
                className="rounded border-input"
              />
              Display as block formula
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMathDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Formula</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={codeDialogOpen}
        onOpenChange={(open) => {
          setCodeDialogOpen(open);
          if (!open) {
            setCodeValue("");
            setCodeLanguage("python");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Code Block</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyCodeBlock();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="rich-text-code-language"
                className="text-sm font-medium text-foreground"
              >
                Code Type
              </label>
              <Select value={codeLanguage} onValueChange={setCodeLanguage}>
                <SelectTrigger id="rich-text-code-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODE_LANGUAGE_OPTIONS.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="rich-text-code-value"
                className="text-sm font-medium text-foreground"
              >
                Code
              </label>
              <textarea
                id="rich-text-code-value"
                value={codeValue}
                onChange={(event) => setCodeValue(event.target.value)}
                autoFocus
                rows={12}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Paste or type your code here..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCodeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Insert Code</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <div className="sticky top-0 z-20 rounded-t-xl border-b border-slate-200 bg-slate-50/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85 dark:border-white/10 dark:bg-[#18202c]/95 dark:supports-[backdrop-filter]:bg-[#18202c]/85">
        <div className="flex flex-wrap gap-2">
          <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <Select value={activeBlockType} onValueChange={applyBlockType}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Block" />
              </SelectTrigger>

              <SelectContent>
                {BLOCK_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeFontFamily}
              onValueChange={(font) => applyToWholeLesson("fontFamily", font)}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Font" />
              </SelectTrigger>

              <SelectContent>
                {FONT_FAMILY_OPTIONS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeFontSize}
              onValueChange={(size) => applyToWholeLesson("fontSize", size)}
            >
              <SelectTrigger className="h-9 w-24">
                <SelectValue placeholder="Size" />
              </SelectTrigger>

              <SelectContent>
                {FONT_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeTextColor} onValueChange={applyTextColor}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue placeholder="Color" />
              </SelectTrigger>

              <SelectContent>
                {TEXT_COLOR_OPTIONS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-[320px] flex-1 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <ToggleGroup
              type="multiple"
              value={activeTextTools}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
          <ToggleGroupItem
            value="bold"
            aria-label="Bold"
            title="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="underline"
            aria-label="Underline"
            title="Underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="text-base underline">U</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="italic"
            aria-label="Italic"
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="strike"
            aria-label="Strike"
            title="Strike"
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="highlight"
            aria-label="Highlight"
            title="Highlight"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="subscript"
            aria-label="Subscript"
            title="Subscript"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <span className="text-xs font-semibold">X₂</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="superscript"
            aria-label="Superscript"
            title="Superscript"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <span className="text-xs font-semibold">X²</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="heading2"
            aria-label="Heading 2"
            title="Heading 2"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="slash"
            aria-label="Slash commands"
            title="Slash commands"
            onClick={() => editor.chain().focus().insertContent("/").run()}
          >
            <Command className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="bulletList"
            aria-label="Bullet list"
            title="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="orderedList"
            aria-label="Ordered list"
            title="Ordered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="taskList"
            aria-label="Task list"
            title="Task list"
            onClick={insertTaskList}
          >
            <ListChecks className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="blockquote"
            aria-label="Blockquote"
            title="Blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="codeBlock"
            aria-label="Insert code"
            title="Insert code"
            onClick={openCodeDialog}
          >
            <Code className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="link"
            aria-label="Add link"
            title="Add link"
            onClick={openLinkDialog}
          >
            <LinkIcon className="h-4 w-4" />
          </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <ToggleGroup
              type="single"
              value={currentTextAlign}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
          <ToggleGroupItem
            value="left"
            aria-label="Align left"
            title="Align left"
            onClick={() => editor.chain().focus().unsetTextAlign().run()}
          >
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="center"
            aria-label="Align center"
            title="Align center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Align right"
            title="Align right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="justify"
            aria-label="Align justify"
            title="Align justify"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="h-4 w-4" />
          </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
          <ToggleGroupItem
            value="image"
            aria-label="Upload image"
            title="Upload image"
            onClick={openImagePicker}
          >
            <ImagePlus className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="youtube"
            aria-label="Embed YouTube"
            title="Embed YouTube"
            onClick={() => setYoutubeDialogOpen(true)}
          >
            <Youtube className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="file"
            aria-label="Attach file"
            title="Attach file"
            onClick={openFilePicker}
          >
            <Paperclip className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="audio"
            aria-label="Attach audio"
            title="Attach audio"
            onClick={openAudioPicker}
          >
            <AudioLines className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="math"
            aria-label="Insert math"
            title="Insert math"
            onClick={() => setMathDialogOpen(true)}
          >
            <Sigma className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="columns"
            aria-label="Insert columns"
            title="Insert columns"
            onClick={() => setColumnsDialogOpen(true)}
          >
            <Columns2 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="callout"
            aria-label="Insert callout"
            title="Insert callout"
            onClick={() => setCalloutDialogOpen(true)}
          >
            <PanelsTopLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="collapsible"
            aria-label="Insert collapsible section"
            title="Insert collapsible section"
            onClick={() => setCollapsibleDialogOpen(true)}
          >
            <ChevronDownSquare className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="table"
            aria-label="Insert table"
            title="Insert table"
            onClick={() => setTableDialogOpen(true)}
          >
            <Table2 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="divider"
            aria-label="Insert divider"
            title="Insert divider"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </ToggleGroupItem>
          {editor.isActive("table") && (
            <ToggleGroupItem
              value="tableSettings"
              aria-label="Edit table"
              title="Edit table"
              onClick={() => setTableActionsOpen(true)}
            >
                <Settings2 className="h-4 w-4" />
              </ToggleGroupItem>
            )}
            </ToggleGroup>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
            >
          <ToggleGroupItem
            value="undo"
            aria-label="Undo"
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="clearFormatting"
            aria-label="Clear formatting"
            title="Clear formatting"
            onClick={clearFormatting}
          >
            <Eraser className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="redo"
            aria-label="Redo"
            title="Redo"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo className="h-4 w-4" />
          </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:leading-7",
          "[&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold",
          "[&_.ProseMirror_h1]:mt-5 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold",
          "[&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold",
          "[&_.ProseMirror_h4]:mt-3 [&_.ProseMirror_h4]:mb-2 [&_.ProseMirror_h4]:text-lg [&_.ProseMirror_h4]:font-semibold",
          "[&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6",
          "[&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6",
          "[&_.ProseMirror_li]:my-1",
          "[&_.ProseMirror_ul[data-type='taskList']]:my-3 [&_.ProseMirror_ul[data-type='taskList']]:list-none [&_.ProseMirror_ul[data-type='taskList']]:pl-0",
          "[&_.ProseMirror_li[data-type='taskItem']]:my-2 [&_.ProseMirror_li[data-type='taskItem']]:list-none",
          "[&_.rich-task-item-label]:mr-3 [&_.rich-task-item-label]:inline-flex [&_.rich-task-item-label]:items-center",
          "[&_.rich-task-item-content]:inline-block [&_.rich-task-item-content]:min-w-0",
          "[&_.rich-callout]:my-4 [&_.rich-callout]:rounded-2xl [&_.rich-callout]:border [&_.rich-callout]:px-4 [&_.rich-callout]:py-3",
          "[&_.rich-callout-title]:mb-2 [&_.rich-callout-title]:text-sm [&_.rich-callout-title]:font-semibold [&_.rich-callout-title]:uppercase [&_.rich-callout-title]:tracking-[0.08em]",
          "[&_.rich-callout-note]:border-cyan-200 [&_.rich-callout-note]:bg-cyan-50/80 dark:[&_.rich-callout-note]:border-cyan-500/30 dark:[&_.rich-callout-note]:bg-cyan-500/10",
          "[&_.rich-callout-tip]:border-emerald-200 [&_.rich-callout-tip]:bg-emerald-50/80 dark:[&_.rich-callout-tip]:border-emerald-500/30 dark:[&_.rich-callout-tip]:bg-emerald-500/10",
          "[&_.rich-callout-warning]:border-amber-200 [&_.rich-callout-warning]:bg-amber-50/80 dark:[&_.rich-callout-warning]:border-amber-500/30 dark:[&_.rich-callout-warning]:bg-amber-500/10",
          "[&_.rich-callout-important]:border-rose-200 [&_.rich-callout-important]:bg-rose-50/80 dark:[&_.rich-callout-important]:border-rose-500/30 dark:[&_.rich-callout-important]:bg-rose-500/10",
          "[&_.rich-collapsible]:my-4 [&_.rich-collapsible]:rounded-2xl [&_.rich-collapsible]:border [&_.rich-collapsible]:border-slate-200 [&_.rich-collapsible]:bg-white/80 [&_.rich-collapsible]:px-4 [&_.rich-collapsible]:py-3 dark:[&_.rich-collapsible]:border-white/10 dark:[&_.rich-collapsible]:bg-white/[0.03]",
          "[&_.rich-collapsible-summary]:cursor-pointer [&_.rich-collapsible-summary]:list-none [&_.rich-collapsible-summary]:font-semibold",
          "[&_.rich-collapsible-content]:mt-3",
          "[&_.rich-columns-layout]:my-4 [&_.rich-columns-layout]:grid [&_.rich-columns-layout]:gap-4 md:[&_.rich-columns-layout]:grid-cols-2 [&_.rich-columns-layout][data-columns='3']:md:[grid-template-columns:repeat(3,minmax(0,1fr))]",
          "[&_.rich-column-block]:rounded-xl [&_.rich-column-block]:border [&_.rich-column-block]:border-slate-200 [&_.rich-column-block]:bg-white/70 [&_.rich-column-block]:p-3 dark:[&_.rich-column-block]:border-white/10 dark:[&_.rich-column-block]:bg-white/[0.03]",
          "[&_.rich-file-attachment]:my-4 [&_.rich-file-attachment]:rounded-2xl [&_.rich-file-attachment]:border [&_.rich-file-attachment]:border-slate-200 [&_.rich-file-attachment]:bg-slate-50/80 [&_.rich-file-attachment]:px-4 [&_.rich-file-attachment]:py-3 dark:[&_.rich-file-attachment]:border-white/10 dark:[&_.rich-file-attachment]:bg-white/[0.03]",
          "[&_.rich-file-attachment-link]:font-medium [&_.rich-file-attachment-link]:text-cyan-700 [&_.rich-file-attachment-link]:underline [&_.rich-file-attachment-link]:underline-offset-4 dark:[&_.rich-file-attachment-link]:text-cyan-300",
          "[&_.rich-file-attachment-size]:mt-1 [&_.rich-file-attachment-size]:text-xs [&_.rich-file-attachment-size]:text-muted-foreground",
          "[&_.rich-audio-attachment]:my-4 [&_.rich-audio-attachment]:rounded-2xl [&_.rich-audio-attachment]:border [&_.rich-audio-attachment]:border-slate-200 [&_.rich-audio-attachment]:bg-slate-50/80 [&_.rich-audio-attachment]:px-4 [&_.rich-audio-attachment]:py-3 dark:[&_.rich-audio-attachment]:border-white/10 dark:[&_.rich-audio-attachment]:bg-white/[0.03]",
          "[&_.rich-audio-attachment-title]:mb-2 [&_.rich-audio-attachment-title]:font-medium",
          "[&_.rich-audio-attachment-player]:w-full",
          "[&_.rich-math-block]:my-4 [&_.rich-math-block]:rounded-2xl [&_.rich-math-block]:border [&_.rich-math-block]:border-violet-200 [&_.rich-math-block]:bg-violet-50/80 [&_.rich-math-block]:px-4 [&_.rich-math-block]:py-3 dark:[&_.rich-math-block]:border-violet-500/30 dark:[&_.rich-math-block]:bg-violet-500/10",
          "[&_.rich-math-label]:mb-2 [&_.rich-math-label]:text-xs [&_.rich-math-label]:font-semibold [&_.rich-math-label]:uppercase [&_.rich-math-label]:tracking-[0.12em] [&_.rich-math-label]:text-violet-700 dark:[&_.rich-math-label]:text-violet-200",
          "[&_.rich-math-formula]:block [&_.rich-math-formula]:overflow-x-auto [&_.rich-math-formula]:font-mono [&_.rich-math-formula]:text-sm",
          "[&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-amber-500 [&_.ProseMirror_blockquote]:bg-amber-50 [&_.ProseMirror_blockquote]:px-4 [&_.ProseMirror_blockquote]:py-3 dark:[&_.ProseMirror_blockquote]:bg-amber-500/10",
          "[&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:rounded-xl [&_.ProseMirror_pre]:bg-slate-950 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-slate-100",
          "[&_.ProseMirror_code]:font-mono",
          "[&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:max-h-[520px] [&_.ProseMirror_img]:w-full [&_.ProseMirror_img]:rounded-2xl [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-slate-200 [&_.ProseMirror_img]:bg-slate-50 [&_.ProseMirror_img]:object-contain dark:[&_.ProseMirror_img]:border-white/10 dark:[&_.ProseMirror_img]:bg-slate-950/40",
          "[&_.ProseMirror_table]:my-5 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:table-fixed [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:overflow-hidden [&_.ProseMirror_table]:rounded-2xl [&_.ProseMirror_table]:border [&_.ProseMirror_table]:border-slate-300/90 [&_.ProseMirror_table]:bg-white [&_.ProseMirror_table]:shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:[&_.ProseMirror_table]:border-white/15 dark:[&_.ProseMirror_table]:bg-slate-950/40 dark:[&_.ProseMirror_table]:shadow-none",
          "[&_.ProseMirror_thead]:bg-[linear-gradient(180deg,rgba(248,250,252,1),rgba(241,245,249,1))] dark:[&_.ProseMirror_thead]:bg-[linear-gradient(180deg,rgba(30,41,59,0.95),rgba(15,23,42,0.95))]",
          "[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-slate-300/90 [&_.ProseMirror_th]:px-3 [&_.ProseMirror_th]:py-2 [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:align-middle [&_.ProseMirror_th]:text-[0.95rem] [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_th]:tracking-[-0.01em] [&_.ProseMirror_th]:text-slate-900 dark:[&_.ProseMirror_th]:border-white/15 dark:[&_.ProseMirror_th]:text-slate-100",
          "[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-slate-200 [&_.ProseMirror_td]:px-3 [&_.ProseMirror_td]:py-2 [&_.ProseMirror_td]:align-middle [&_.ProseMirror_td]:text-slate-700 dark:[&_.ProseMirror_td]:border-white/10 dark:[&_.ProseMirror_td]:text-slate-200",
          "[&_.ProseMirror_tbody_tr:nth-child(even)]:bg-slate-50/80 dark:[&_.ProseMirror_tbody_tr:nth-child(even)]:bg-white/[0.03]",
          "[&_.ProseMirror_tbody_tr:hover]:bg-cyan-50/70 dark:[&_.ProseMirror_tbody_tr:hover]:bg-cyan-500/10",
        )}
      />
    </div>
  );
}

interface LessonContentProps {
  content?: string | null;
  className?: string;
}

const getTextContent = (node: any): string => {
  if (!node) return "";

  if (node.type === "text") return node.data || "";

  if (node.children) {
    return node.children.map(getTextContent).join("");
  }

  return "";
};

export function LessonContent({ content, className }: LessonContentProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-4xl text-[15px] text-slate-800 dark:text-slate-200 sm:text-base",

        "[&_p]:my-3 [&_p]:leading-7",
        "[&_strong]:font-semibold [&_strong]:text-slate-950 dark:[&_strong]:text-white",
        "[&_em]:italic",
        "[&_s]:opacity-80",
        "[&_mark]:rounded-sm [&_mark]:bg-amber-200/90 [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:text-slate-950 dark:[&_mark]:bg-amber-300 dark:[&_mark]:text-slate-950",

        "[&_h1]:mb-5 [&_h1]:mt-8 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-slate-950 dark:[&_h1]:text-white",
        "[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-950 dark:[&_h2]:border-white/10 dark:[&_h2]:text-white",
        "[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-950 dark:[&_h3]:text-white",
        "[&_h4]:mb-3 [&_h4]:mt-7 [&_h4]:border-l-4 [&_h4]:border-cyan-500 [&_h4]:pl-3 [&_h4]:font-display [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-950 dark:[&_h4]:border-cyan-400 dark:[&_h4]:text-white",
        "[&_h5]:mb-2 [&_h5]:mt-6 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-slate-950 dark:[&_h5]:text-white",

        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_li]:pl-1 [&_li]:leading-7 [&_li]:marker:text-cyan-600 dark:[&_li]:marker:text-cyan-400",
        "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0",
        "[&_li[data-type='taskItem']]:my-3 [&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:items-start [&_li[data-type='taskItem']]:gap-3 [&_li[data-type='taskItem']]:pl-0",
        "[&_li[data-type='taskItem']>label]:mt-1 [&_li[data-type='taskItem']>label]:inline-flex [&_li[data-type='taskItem']>label]:items-center",
        "[&_li[data-type='taskItem']>div]:flex-1",
        "[&_li[data-type='taskItem'][data-checked='true']>div]:opacity-70 [&_li[data-type='taskItem'][data-checked='true']>div]:line-through",
        "[&_.rich-callout]:my-5 [&_.rich-callout]:rounded-2xl [&_.rich-callout]:border [&_.rich-callout]:px-5 [&_.rich-callout]:py-4",
        "[&_.rich-callout-title]:mb-2 [&_.rich-callout-title]:text-xs [&_.rich-callout-title]:font-semibold [&_.rich-callout-title]:uppercase [&_.rich-callout-title]:tracking-[0.12em]",
        "[&_.rich-callout-note]:border-cyan-200 [&_.rich-callout-note]:bg-cyan-50/80 dark:[&_.rich-callout-note]:border-cyan-500/30 dark:[&_.rich-callout-note]:bg-cyan-500/10",
        "[&_.rich-callout-tip]:border-emerald-200 [&_.rich-callout-tip]:bg-emerald-50/80 dark:[&_.rich-callout-tip]:border-emerald-500/30 dark:[&_.rich-callout-tip]:bg-emerald-500/10",
        "[&_.rich-callout-warning]:border-amber-200 [&_.rich-callout-warning]:bg-amber-50/80 dark:[&_.rich-callout-warning]:border-amber-500/30 dark:[&_.rich-callout-warning]:bg-amber-500/10",
        "[&_.rich-callout-important]:border-rose-200 [&_.rich-callout-important]:bg-rose-50/80 dark:[&_.rich-callout-important]:border-rose-500/30 dark:[&_.rich-callout-important]:bg-rose-500/10",
        "[&_.rich-collapsible]:my-5 [&_.rich-collapsible]:rounded-2xl [&_.rich-collapsible]:border [&_.rich-collapsible]:border-slate-200 [&_.rich-collapsible]:bg-white/80 [&_.rich-collapsible]:px-5 [&_.rich-collapsible]:py-4 dark:[&_.rich-collapsible]:border-white/10 dark:[&_.rich-collapsible]:bg-white/[0.03]",
        "[&_.rich-collapsible-summary]:cursor-pointer [&_.rich-collapsible-summary]:list-none [&_.rich-collapsible-summary]:font-semibold",
        "[&_.rich-collapsible-content]:mt-3",
        "[&_.rich-columns-layout]:my-5 [&_.rich-columns-layout]:grid [&_.rich-columns-layout]:gap-4 md:[&_.rich-columns-layout]:grid-cols-2 [&_.rich-columns-layout][data-columns='3']:md:[grid-template-columns:repeat(3,minmax(0,1fr))]",
        "[&_.rich-column-block]:rounded-xl [&_.rich-column-block]:border [&_.rich-column-block]:border-slate-200 [&_.rich-column-block]:bg-white/70 [&_.rich-column-block]:p-4 dark:[&_.rich-column-block]:border-white/10 dark:[&_.rich-column-block]:bg-white/[0.03]",
        "[&_.rich-file-attachment]:my-5 [&_.rich-file-attachment]:rounded-2xl [&_.rich-file-attachment]:border [&_.rich-file-attachment]:border-slate-200 [&_.rich-file-attachment]:bg-slate-50/80 [&_.rich-file-attachment]:px-5 [&_.rich-file-attachment]:py-4 dark:[&_.rich-file-attachment]:border-white/10 dark:[&_.rich-file-attachment]:bg-white/[0.03]",
        "[&_.rich-file-attachment-link]:font-medium [&_.rich-file-attachment-link]:text-cyan-700 [&_.rich-file-attachment-link]:underline [&_.rich-file-attachment-link]:underline-offset-4 dark:[&_.rich-file-attachment-link]:text-cyan-300",
        "[&_.rich-file-attachment-size]:mt-1 [&_.rich-file-attachment-size]:text-xs [&_.rich-file-attachment-size]:text-muted-foreground",
        "[&_.rich-audio-attachment]:my-5 [&_.rich-audio-attachment]:rounded-2xl [&_.rich-audio-attachment]:border [&_.rich-audio-attachment]:border-slate-200 [&_.rich-audio-attachment]:bg-slate-50/80 [&_.rich-audio-attachment]:px-5 [&_.rich-audio-attachment]:py-4 dark:[&_.rich-audio-attachment]:border-white/10 dark:[&_.rich-audio-attachment]:bg-white/[0.03]",
        "[&_.rich-audio-attachment-title]:mb-2 [&_.rich-audio-attachment-title]:font-medium",
        "[&_.rich-audio-attachment-player]:w-full",
        "[&_.rich-math-block]:my-5 [&_.rich-math-block]:rounded-2xl [&_.rich-math-block]:border [&_.rich-math-block]:border-violet-200 [&_.rich-math-block]:bg-violet-50/80 [&_.rich-math-block]:px-5 [&_.rich-math-block]:py-4 dark:[&_.rich-math-block]:border-violet-500/30 dark:[&_.rich-math-block]:bg-violet-500/10",
        "[&_.rich-math-label]:mb-2 [&_.rich-math-label]:text-xs [&_.rich-math-label]:font-semibold [&_.rich-math-label]:uppercase [&_.rich-math-label]:tracking-[0.12em] [&_.rich-math-label]:text-violet-700 dark:[&_.rich-math-label]:text-violet-200",
        "[&_.rich-math-formula]:block [&_.rich-math-formula]:overflow-x-auto [&_.rich-math-formula]:font-mono [&_.rich-math-formula]:text-sm",

        "[&_a]:text-cyan-600 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-cyan-300",

        "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:border [&_:not(pre)>code]:border-slate-200 [&_:not(pre)>code]:bg-slate-100 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em] [&_:not(pre)>code]:text-cyan-800 dark:[&_:not(pre)>code]:border-white/10 dark:[&_:not(pre)>code]:bg-white/10 dark:[&_:not(pre)>code]:text-cyan-200",

        "[&_pre]:my-3 [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono",

        "[&_blockquote]:my-6 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:bg-amber-50 [&_blockquote]:px-5 [&_blockquote]:py-3 dark:[&_blockquote]:bg-amber-500/10",
        "[&_blockquote_p]:my-1",
        "[&_img]:my-5 [&_img]:max-h-[560px] [&_img]:w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-slate-200 [&_img]:bg-slate-50 [&_img]:object-contain dark:[&_img]:border-white/10 dark:[&_img]:bg-slate-950/40",
        "[&_iframe[data-youtube-embed='true']]:aspect-video [&_iframe[data-youtube-embed='true']]:w-full [&_iframe[data-youtube-embed='true']]:border-0",
        "[&_table]:my-6 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-slate-300/90 [&_table]:bg-white [&_table]:shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:[&_table]:border-white/15 dark:[&_table]:bg-slate-950/40 dark:[&_table]:shadow-none",
        "[&_thead]:bg-[linear-gradient(180deg,rgba(248,250,252,1),rgba(241,245,249,1))] dark:[&_thead]:bg-[linear-gradient(180deg,rgba(30,41,59,0.95),rgba(15,23,42,0.95))]",
        "[&_th]:border [&_th]:border-slate-300/90 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:align-middle [&_th]:text-[0.95rem] [&_th]:font-semibold [&_th]:tracking-[-0.01em] [&_th]:text-slate-900 dark:[&_th]:border-white/15 dark:[&_th]:text-slate-100",
        "[&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-middle [&_td]:text-slate-700 dark:[&_td]:border-white/10 dark:[&_td]:text-slate-200",
        "[&_tbody_tr:nth-child(even)]:bg-slate-50/80 dark:[&_tbody_tr:nth-child(even)]:bg-white/[0.03]",
        "[&_tbody_tr:hover]:bg-cyan-50/70 dark:[&_tbody_tr:hover]:bg-cyan-500/10",
        className,
      )}
    >
      {parse(content || "", {
        replace(domNode) {
          if (domNode instanceof Element && domNode.name === "pre") {
            const codeNode = domNode.children.find(
              (child) => child instanceof Element && child.name === "code",
            ) as Element | undefined;

            const className = codeNode?.attribs?.class || "";
            const code = getTextContent(codeNode || domNode);
            const language =
              className.match(/language-([\w-]+)/)?.[1] ||
              detectCodeLanguage(code);

            return (
              <CodeBlock
                code={code}
                language={language}
                showLineNumbers
                maxHeight="500px"
              />
            );
          }

          return undefined;
        },
      })}
    </div>
  );
}
