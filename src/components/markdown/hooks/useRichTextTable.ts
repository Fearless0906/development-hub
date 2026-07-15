import { useState } from "react";
import type { Editor } from "@tiptap/react";

type TableNodeJson = {
  type: string;
  content?: Array<{
    type: string;
    content?: Array<{ type: string; content?: unknown[] }>;
  }>;
};

export function useRichTextTable(editor: Editor | null) {
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableActionsOpen, setTableActionsOpen] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableColumns, setTableColumns] = useState("3");
  const [tableWithHeader, setTableWithHeader] = useState(true);

  const resetTableForm = () => {
    setTableRows("3");
    setTableColumns("3");
    setTableWithHeader(true);
  };

  const applyTable = () => {
    if (!editor) return;

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
    resetTableForm();
  };

  const getActiveTableInfo = () => {
    if (!editor) return null;

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
    if (!editor) return;

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

    const tableJson = info.tableNode.toJSON() as TableNodeJson;
    const referenceRow =
      tableJson.content?.[info.rowIndex] || tableJson.content?.[0];

    if (!referenceRow?.content?.length) return;

    const newRow = {
      type: "tableRow",
      content: referenceRow.content.map((cell) =>
        createEmptyCell(
          cell.type === "tableHeader" ? "tableHeader" : "tableCell",
        ),
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

    const tableJson = info.tableNode.toJSON() as TableNodeJson;

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

    const tableJson = info.tableNode.toJSON() as TableNodeJson;
    const rows = tableJson.content || [];
    if (rows.length <= 1) return;

    const nextRows = rows.filter((_, index) => index !== info.rowIndex);

    replaceActiveTable({
      ...tableJson,
      content: nextRows,
    });
  };

  const deleteTableColumn = () => {
    if (!editor) return;

    const info = getActiveTableInfo();
    if (!info) return;

    const { $from } = editor.state.selection;
    const rowDepth = info.tableDepth + 1;
    const cellIndex = $from.index(rowDepth);

    const tableJson = info.tableNode.toJSON() as TableNodeJson;
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
    if (!editor) return;

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

  return {
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
  };
}
