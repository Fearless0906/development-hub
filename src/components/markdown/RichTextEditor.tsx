import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node, mergeAttributes } from "@tiptap/core";
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
  Table2,
  Plus,
  Trash2,
  Settings2,
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
import { detectCodeLanguage } from "@/lib/detectCodeLanguage";
import { CodeBlock } from "../code/CodeBlock";

const TableNode = Node.create({
  name: "table",
  group: "block",
  content: "tableRow+",
  isolating: true,
  parseHTML() {
    return [{ tag: "table" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(HTMLAttributes, {
        class: "rich-text-table",
      }),
      ["tbody", 0],
    ];
  },
});

const TableRowNode = Node.create({
  name: "tableRow",
  content: "(tableHeader | tableCell)+",
  tableRole: "row",
  parseHTML() {
    return [{ tag: "tr" }];
  },
  renderHTML() {
    return ["tr", 0];
  },
});

const TableHeaderNode = Node.create({
  name: "tableHeader",
  content: "block+",
  tableRole: "header_cell",
  isolating: true,
  parseHTML() {
    return [{ tag: "th" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(HTMLAttributes), 0];
  },
});

const TableCellNode = Node.create({
  name: "tableCell",
  content: "block+",
  tableRole: "cell",
  isolating: true,
  parseHTML() {
    return [{ tag: "td" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(HTMLAttributes), 0];
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write lesson content...",
  minHeight = "320px",
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("python");
  const [codeValue, setCodeValue] = useState("");
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableActionsOpen, setTableActionsOpen] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableColumns, setTableColumns] = useState("3");
  const [tableWithHeader, setTableWithHeader] = useState(true);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TableNode,
      TableRowNode,
      TableHeaderNode,
      TableCellNode,
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
        style: `min-height: ${minHeight};`,
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

  const applyTable = () => {
    const rows = Math.max(1, Number.parseInt(tableRows, 10) || 0);
    const columns = Math.max(1, Number.parseInt(tableColumns, 10) || 0);

    const tableRowsHtml = [
      tableWithHeader
        ? `<tr>${Array.from({ length: columns }, (_, index) => `<th><p>Header ${index + 1}</p></th>`).join("")}</tr>`
        : "",
      ...Array.from({ length: rows }, (_, rowIndex) => {
        return `<tr>${Array.from({ length: columns }, (_, columnIndex) => `<td><p>Cell ${rowIndex + 1}-${columnIndex + 1}</p></td>`).join("")}</tr>`;
      }),
    ]
      .filter(Boolean)
      .join("");

    const html = `<table>${tableRowsHtml}</table><p></p>`;

    editor.chain().focus().insertContent(html).run();
    setTableDialogOpen(false);
    setTableRows("3");
    setTableColumns("3");
    setTableWithHeader(true);
  };

  const getActiveTableInfo = () => {
    const { $from } = editor.state.selection;
    let tableDepth = -1;

    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      if ($from.node(depth).type.name === "table") {
        tableDepth = depth;
        break;
      }
    }

    if (tableDepth === -1) return null;

    const tableNode = $from.node(tableDepth);

    return {
      tableDepth,
      tableNode,
      tablePos: $from.before(tableDepth),
      rowIndex: $from.index(tableDepth),
    };
  };

  const replaceActiveTable = (tableJson: Record<string, unknown>) => {
    const info = getActiveTableInfo();
    if (!info) return;

    editor
      .chain()
      .focus()
      .insertContentAt(
        {
          from: info.tablePos,
          to: info.tablePos + info.tableNode.nodeSize,
        },
        tableJson,
      )
      .run();
  };

  const createEmptyCell = (type: "tableHeader" | "tableCell") => ({
    type,
    content: [
      {
        type: "paragraph",
      },
    ],
  });

  const addTableRow = () => {
    const info = getActiveTableInfo();
    if (!info) return;

    const tableJson = info.tableNode.toJSON() as {
      type: string;
      content?: Array<{ type: string; content?: Array<{ type: string }> }>;
    };
    const referenceRow = tableJson.content?.[info.rowIndex] || tableJson.content?.[0];

    if (!referenceRow?.content?.length) return;

    const newRow = {
      type: "tableRow",
      content: referenceRow.content.map((cell) =>
        createEmptyCell(cell.type === "tableHeader" ? "tableHeader" : "tableCell"),
      ),
    };

    const nextRows = [...(tableJson.content || [])];
    nextRows.splice(info.rowIndex + 1, 0, newRow);

    replaceActiveTable({
      ...tableJson,
      content: nextRows,
    });
  };

  const addTableColumn = () => {
    const info = getActiveTableInfo();
    if (!info) return;

    const tableJson = info.tableNode.toJSON() as {
      type: string;
      content?: Array<{ type: string; content?: Array<{ type: string }> }>;
    };

    const nextRows = (tableJson.content || []).map((row) => ({
      ...row,
      content: [
        ...(row.content || []),
        createEmptyCell(
          row.content?.some((cell) => cell.type === "tableHeader")
            ? "tableHeader"
            : "tableCell",
        ),
      ],
    }));

    replaceActiveTable({
      ...tableJson,
      content: nextRows,
    });
  };

  const deleteTableRow = () => {
    const info = getActiveTableInfo();
    if (!info) return;

    const tableJson = info.tableNode.toJSON() as {
      type: string;
      content?: Array<{ type: string; content?: Array<{ type: string }> }>;
    };

    const rows = tableJson.content || [];
    if (rows.length <= 1) return;

    const nextRows = rows.filter((_, index) => index !== info.rowIndex);

    replaceActiveTable({
      ...tableJson,
      content: nextRows,
    });
  };

  const deleteTableColumn = () => {
    const info = getActiveTableInfo();
    if (!info) return;

    const { $from } = editor.state.selection;
    const rowDepth = info.tableDepth + 1;
    const cellIndex = $from.index(rowDepth);

    const tableJson = info.tableNode.toJSON() as {
      type: string;
      content?: Array<{
        type: string;
        content?: Array<{ type: string; content?: unknown[] }>;
      }>;
    };

    const firstRowCells = tableJson.content?.[0]?.content || [];
    if (firstRowCells.length <= 1) return;

    const nextRows = (tableJson.content || []).map((row) => ({
      ...row,
      content: (row.content || []).filter((_, index) => index !== cellIndex),
    }));

    replaceActiveTable({
      ...tableJson,
      content: nextRows,
    });
  };

  const removeTable = () => {
    const info = getActiveTableInfo();
    if (!info) return;

    editor
      .chain()
      .focus()
      .deleteRange({
        from: info.tablePos,
        to: info.tablePos + info.tableNode.nodeSize,
      })
      .run();
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
      <Dialog
        open={tableDialogOpen}
        onOpenChange={(open) => {
          setTableDialogOpen(open);
          if (!open) {
            setTableRows("3");
            setTableColumns("3");
            setTableWithHeader(true);
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
      <Dialog
        open={tableActionsOpen}
        onOpenChange={setTableActionsOpen}
      >
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
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="tsx">TSX</SelectItem>
                  <SelectItem value="jsx">JSX</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="bash">Bash</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                  <SelectItem value="text">Plain Text</SelectItem>
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

        {tool(false, () => setTableDialogOpen(true), <Table2 className="h-4 w-4" />)}

        {editor.isActive("table") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTableActionsOpen(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Table
          </Button>
        )}

        {tool(
          editor.isActive("codeBlock"),
          openCodeDialog,
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
