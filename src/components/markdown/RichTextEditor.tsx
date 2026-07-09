import { useEffect } from "react";
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

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
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
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
        <Select
          onValueChange={(font) =>
            editor.chain().focus().setFontFamily(font).run()
          }
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
        <Select
          onValueChange={(size) =>
            editor.chain().focus().setFontSize(size).run()
          }
        >
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
          addLink,
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
        "max-w-none text-slate-900 dark:text-slate-100",

        "[&_p]:my-2 [&_p]:leading-7",
        "[&_strong]:font-bold",
        "[&_em]:italic",

        "[&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-bold",
        "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold",
        "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-xl [&_h3]:font-bold",

        "[&_ul]:my-2 [&_ul]:pl-6 [&_ul]:list-disc",
        "[&_ol]:my-2 [&_ol]:pl-6 [&_ol]:list-decimal",
        "[&_li]:my-1",

        "[&_a]:text-cyan-600 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-cyan-300",

        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-slate-100 [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 dark:[&_:not(pre)>code]:bg-white/10",

        "[&_pre]:my-3 [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono",

        "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:bg-amber-50 [&_blockquote]:px-4 [&_blockquote]:py-3 dark:[&_blockquote]:bg-amber-500/10",
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
