import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  LinkIcon,
} from "lucide-react";
import parse, { Element } from "html-react-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CodeBlock } from "../code/CodeBlock";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write lesson content...",
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
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
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", {
        parseOptions: { preserveWhitespace: "full" },
      });
    }
  }, [editor, value]);

  if (!editor) return null;

  const applyToWholeLesson = (
    style: "fontFamily" | "fontSize",
    value: string,
  ) => {
    const { from, to } = editor.state.selection;
    const chain = editor.chain().focus().selectAll();

    if (style === "fontFamily") {
      chain.setFontFamily(value).setTextSelection({ from, to }).run();
      return;
    }

    chain.setFontSize(value).setTextSelection({ from, to }).run();
  };

  const openLinkDialog = () => {
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkDialogOpen(true);
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

  const tool = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
    >
      {icon}
    </Button>
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10">
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
      <div className="sticky top-0 z-20 flex flex-wrap gap-2 rounded-t-xl border-b border-slate-200 bg-slate-50/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85 dark:border-white/10 dark:bg-[#18202c]/95 dark:supports-[backdrop-filter]:bg-[#18202c]/85">
        <Select
          onValueChange={(font) => applyToWholeLesson("fontFamily", font)}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Font" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="'Segoe UI'">Segoe UI</SelectItem>
            <SelectItem value="'Poppins'">Poppins</SelectItem>
            <SelectItem value="'Roboto'">Roboto</SelectItem>
            <SelectItem value="'JetBrains Mono'">JetBrains Mono</SelectItem>
            <SelectItem value="'Times New Roman'">Times New Roman</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(size) => applyToWholeLesson("fontSize", size)}>
          <SelectTrigger className="h-9 w-24">
            <SelectValue placeholder="Size" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="12px">12</SelectItem>
            <SelectItem value="14px">14</SelectItem>
            <SelectItem value="16px">16</SelectItem>
            <SelectItem value="18px">18</SelectItem>
            <SelectItem value="20px">20</SelectItem>
            <SelectItem value="24px">24</SelectItem>
            <SelectItem value="30px">30</SelectItem>
            <SelectItem value="36px">36</SelectItem>
            <SelectItem value="48px">48</SelectItem>
          </SelectContent>
        </Select>

        {tool(
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          <Bold className="h-4 w-4" />,
        )}

        {tool(
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          <Italic className="h-4 w-4" />,
        )}

        {tool(
          editor.isActive("heading", { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          <Heading2 className="h-4 w-4" />,
        )}

        {tool(
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
          <List className="h-4 w-4" />,
        )}

        {tool(
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
          <ListOrdered className="h-4 w-4" />,
        )}

        {tool(
          editor.isActive("blockquote"),
          () => editor.chain().focus().toggleBlockquote().run(),
          <Quote className="h-4 w-4" />,
        )}

        {tool(
          editor.isActive("codeBlock"),
          () => editor.chain().focus().toggleCodeBlock().run(),
          <Code className="h-4 w-4" />,
        )}

        {tool(
          editor.isActive("link"),
          openLinkDialog,
          <LinkIcon className="h-4 w-4" />,
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:leading-7",
          "[&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold",
          "[&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6",
          "[&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6",
          "[&_.ProseMirror_li]:my-1",
          "[&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-amber-500 [&_.ProseMirror_blockquote]:bg-amber-50 [&_.ProseMirror_blockquote]:px-4 [&_.ProseMirror_blockquote]:py-3 dark:[&_.ProseMirror_blockquote]:bg-amber-500/10",
          "[&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:rounded-xl [&_.ProseMirror_pre]:bg-slate-950 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-slate-100",
          "[&_.ProseMirror_code]:font-mono",
        )}
      />
    </div>
  );
}

interface LessonContentProps {
  content?: string | null;
}

const getTextContent = (node: any): string => {
  if (!node) return "";

  if (node.type === "text") return node.data || "";

  if (node.children) {
    return node.children.map(getTextContent).join("");
  }

  return "";
};

export function LessonContent({ content }: LessonContentProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-4xl text-[15px] text-slate-800 dark:text-slate-200 sm:text-base",

        "[&_p]:my-3 [&_p]:leading-7",
        "[&_strong]:font-semibold [&_strong]:text-slate-950 dark:[&_strong]:text-white",
        "[&_em]:italic",

        "[&_h1]:mb-5 [&_h1]:mt-8 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-slate-950 dark:[&_h1]:text-white",
        "[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-950 dark:[&_h2]:border-white/10 dark:[&_h2]:text-white",
        "[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-950 dark:[&_h3]:text-white",
        "[&_h4]:mb-3 [&_h4]:mt-7 [&_h4]:border-l-4 [&_h4]:border-cyan-500 [&_h4]:pl-3 [&_h4]:font-display [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-950 dark:[&_h4]:border-cyan-400 dark:[&_h4]:text-white",
        "[&_h5]:mb-2 [&_h5]:mt-6 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-slate-950 dark:[&_h5]:text-white",

        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_li]:pl-1 [&_li]:leading-7 [&_li]:marker:text-cyan-600 dark:[&_li]:marker:text-cyan-400",

        "[&_a]:text-cyan-600 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-cyan-300",

        "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:border [&_:not(pre)>code]:border-slate-200 [&_:not(pre)>code]:bg-slate-100 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em] [&_:not(pre)>code]:text-cyan-800 dark:[&_:not(pre)>code]:border-white/10 dark:[&_:not(pre)>code]:bg-white/10 dark:[&_:not(pre)>code]:text-cyan-200",

        "[&_pre]:my-3 [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono",

        "[&_blockquote]:my-6 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:bg-amber-50 [&_blockquote]:px-5 [&_blockquote]:py-3 dark:[&_blockquote]:bg-amber-500/10",
        "[&_blockquote_p]:my-1",
      )}
    >
      {parse(content || "", {
        replace(domNode) {
          if (domNode instanceof Element && domNode.name === "pre") {
            const codeNode = domNode.children.find(
              (child) => child instanceof Element && child.name === "code",
            ) as Element | undefined;

            const className = codeNode?.attribs?.class || "";
            const language =
              className.match(/language-([\w-]+)/)?.[1] || "typescript";

            const code = getTextContent(codeNode || domNode);

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
