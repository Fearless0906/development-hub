import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

export const TableNode = Node.create({
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

export const TableRowNode = Node.create({
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

export const TableHeaderNode = Node.create({
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

export const TableCellNode = Node.create({
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

export const EditorImageNode = Node.create({
  name: "editorImage",
  group: "block",
  inline: false,
  draggable: true,
  selectable: true,
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      title: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        class:
          "my-4 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 object-contain shadow-sm dark:border-white/10 dark:bg-slate-950/40",
      }),
    ];
  },
});

export const TaskListNode = Node.create({
  name: "taskList",
  group: "block",
  content: "taskItem+",
  parseHTML() {
    return [{ tag: 'ul[data-type="taskList"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, {
        "data-type": "taskList",
        class: "rich-task-list",
      }),
      0,
    ];
  },
});

export const TaskItemNode = Node.create({
  name: "taskItem",
  content: "paragraph+",
  defining: true,
  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-checked") === "true",
        renderHTML: (attributes) => ({
          "data-checked": attributes.checked ? "true" : "false",
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'li[data-type="taskItem"]' }];
  },
  addCommands() {
    return {
      setTaskItemChecked:
        (checked: boolean) =>
        ({ tr, state, dispatch }) => {
          const { $from } = state.selection;

          for (let depth = $from.depth; depth >= 0; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name !== this.name) continue;

            const pos = $from.before(depth);
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                checked,
              });
            }
            return true;
          }

          return false;
        },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick: (view, pos, event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return false;
            if (!target.matches('input[data-task-checkbox="true"]')) return false;

            const listItem = target.closest('li[data-type="taskItem"]');
            if (!listItem) return false;

            const taskItemPos = view.posAtDOM(listItem, 0);
            const taskItemNode = view.state.doc.nodeAt(taskItemPos);
            if (!taskItemNode || taskItemNode.type.name !== this.name) {
              return false;
            }

            const nextChecked = !Boolean(taskItemNode.attrs.checked);
            const transaction = view.state.tr.setNodeMarkup(
              taskItemPos,
              undefined,
              {
                ...taskItemNode.attrs,
                checked: nextChecked,
              },
            );

            view.dispatch(transaction);
            return true;
          },
        },
      }),
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    const checked = Boolean(node.attrs.checked);

    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-type": "taskItem",
        class: "rich-task-item",
      }),
      [
        "label",
        {
          class: "rich-task-item-label",
          contenteditable: "false",
        },
        [
          "input",
          mergeAttributes({
            "data-task-checkbox": "true",
            type: "checkbox",
            tabindex: "-1",
            ...(checked ? { checked: "checked" } : {}),
          }),
        ],
      ],
      ["div", { class: "rich-task-item-content" }, 0],
    ];
  },
});

export const YouTubeNode = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: "YouTube video",
      },
    };
  },
  parseHTML() {
    return [{ tag: 'iframe[data-youtube-embed="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        class:
          "my-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/5 shadow-sm dark:border-white/10 dark:bg-slate-950/40",
      },
      [
        "iframe",
        mergeAttributes(HTMLAttributes, {
          "data-youtube-embed": "true",
          class: "aspect-video w-full",
          frameborder: "0",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
        }),
      ],
    ];
  },
});

export const ColumnsLayoutNode = Node.create({
  name: "columnsLayout",
  group: "block",
  content: "columnBlock+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: (element) =>
          Number.parseInt(element.getAttribute("data-columns") || "2", 10),
        renderHTML: (attributes) => ({
          "data-columns": String(attributes.columns || 2),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-columns-layout="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-columns-layout": "true",
        class: "rich-columns-layout",
      }),
      0,
    ];
  },
});

export const ColumnBlockNode = Node.create({
  name: "columnBlock",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-column-block="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-column-block": "true",
        class: "rich-column-block",
      }),
      0,
    ];
  },
});

export const FileAttachmentNode = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      href: { default: null },
      name: { default: "Attachment" },
      size: { default: "" },
      mime: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-file-attachment="true"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-file-attachment": "true",
        class: "rich-file-attachment",
      }),
      [
        "a",
        {
          href: node.attrs.href,
          download: node.attrs.name,
          class: "rich-file-attachment-link",
        },
        node.attrs.name,
      ],
      ["div", { class: "rich-file-attachment-size" }, node.attrs.size || ""],
    ];
  },
});

export const AudioAttachmentNode = Node.create({
  name: "audioAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      name: { default: "Audio clip" },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-audio-attachment="true"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-audio-attachment": "true",
        class: "rich-audio-attachment",
      }),
      ["div", { class: "rich-audio-attachment-title" }, node.attrs.name],
      [
        "audio",
        {
          controls: "controls",
          src: node.attrs.src,
          class: "rich-audio-attachment-player",
        },
      ],
    ];
  },
});

export const MathBlockNode = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      formula: { default: "" },
      displayMode: { default: true },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-math-block="true"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-math-block": "true",
        "data-display-mode": node.attrs.displayMode ? "true" : "false",
        "data-formula": node.attrs.formula,
        class: "rich-math-block",
      }),
      [
        "div",
        { class: "rich-math-label" },
        node.attrs.displayMode ? "LaTeX Block" : "LaTeX Inline",
      ],
      ["code", { class: "rich-math-formula" }, node.attrs.formula],
    ];
  },
});

export const CalloutNode = Node.create({
  name: "calloutBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      variant: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-callout") || "note",
        renderHTML: (attributes) => ({
          "data-callout": attributes.variant,
        }),
      },
      title: {
        default: "Note",
        parseHTML: (element) => element.getAttribute("data-title") || "Note",
        renderHTML: (attributes) => ({
          "data-title": attributes.title,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const variant = String(node.attrs.variant || "note");
    const title = String(node.attrs.title || "Note");

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: `rich-callout rich-callout-${variant}`,
      }),
      [
        "div",
        {
          class: "rich-callout-title",
          contenteditable: "false",
        },
        title,
      ],
      ["div", { class: "rich-callout-body" }, 0],
    ];
  },
});

export const CollapsibleNode = Node.create({
  name: "collapsibleBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      summary: {
        default: "More details",
        parseHTML: (element) =>
          element.getAttribute("data-summary") || "More details",
        renderHTML: (attributes) => ({
          "data-summary": attributes.summary,
        }),
      },
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attributes) => (attributes.open ? { open: "open" } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'details[data-collapsible="true"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const summary = String(node.attrs.summary || "More details");

    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        "data-collapsible": "true",
        class: "rich-collapsible",
      }),
      [
        "summary",
        {
          class: "rich-collapsible-summary",
          contenteditable: "false",
        },
        summary,
      ],
      ["div", { class: "rich-collapsible-content" }, 0],
    ];
  },
});

export const TextAlign = Extension.create({
  name: "textAlign",
  addOptions() {
    return {
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "left",
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => element.style.textAlign || null,
            renderHTML: (attributes) => {
              if (!attributes.textAlign) return {};
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextAlign:
        (alignment: string) =>
        ({ commands, editor }) => {
          const activeTypes = this.options.types.filter((type: string) =>
            editor.isActive(type),
          );

          if (activeTypes.length === 0) {
            return commands.updateAttributes("paragraph", {
              textAlign: alignment,
            });
          }

          return activeTypes.some((type: string) =>
            commands.updateAttributes(type, { textAlign: alignment }),
          );
        },
      unsetTextAlign:
        () =>
        ({ commands, editor }) => {
          const activeTypes = this.options.types.filter((type: string) =>
            editor.isActive(type),
          );

          if (activeTypes.length === 0) {
            return commands.updateAttributes("paragraph", { textAlign: null });
          }

          return activeTypes.some((type: string) =>
            commands.updateAttributes(type, { textAlign: null }),
          );
        },
    };
  },
});

export const TextColor = Extension.create({
  name: "textColor",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          color: {
            default: null,
            parseHTML: (element) => element.style.color || null,
            renderHTML: (attributes) => {
              if (!attributes.color) return {};
              return { style: `color: ${attributes.color}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setColor:
        (color: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { color }).run(),
      unsetColor:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { color: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

export const HighlightMark = Mark.create({
  name: "highlight",
  parseHTML() {
    return [
      { tag: "mark" },
      {
        style: "background-color",
        getAttrs: (value) => (value ? {} : false),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes, {
        class:
          "rounded-sm bg-amber-200/90 px-1 py-0.5 text-slate-950 dark:bg-amber-300 dark:text-slate-950",
      }),
      0,
    ];
  },
  addCommands() {
    return {
      setHighlight:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleHighlight:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const SubscriptMark = Mark.create({
  name: "subscript",
  parseHTML() {
    return [{ tag: "sub" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sub", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setSubscript:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleSubscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetSubscript:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const SuperscriptMark = Mark.create({
  name: "superscript",
  parseHTML() {
    return [{ tag: "sup" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setSuperscript:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleSuperscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetSuperscript:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const normalizeFontFamilyValue = (value?: string | null) => {
  if (!value) return "Inter";

  const normalized = value.replace(/^['"]|['"]$/g, "");

  const supportedFonts = new Set([
    "Inter",
    "Arial",
    "Segoe UI",
    "Poppins",
    "Roboto",
    "JetBrains Mono",
    "Times New Roman",
    "Georgia",
  ]);

  return supportedFonts.has(normalized) ? normalized : "Inter";
};
