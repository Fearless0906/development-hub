import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { normalizeFontFamilyValue } from "../richTextExtensions";

export function useRichTextToolbarState(editor: Editor | null) {
  const [activeFontFamily, setActiveFontFamily] = useState("Inter");
  const [activeFontSize, setActiveFontSize] = useState("16px");
  const [activeTextColor, setActiveTextColor] = useState("default");
  const [activeBlockType, setActiveBlockType] = useState("paragraph");

  useEffect(() => {
    if (!editor) return;

    const syncFromSelection = () => {
      setActiveFontFamily(
        normalizeFontFamilyValue(editor.getAttributes("textStyle").fontFamily),
      );
      setActiveFontSize(editor.getAttributes("textStyle").fontSize || "16px");
      setActiveTextColor(editor.getAttributes("textStyle").color || "default");
      if (editor.isActive("heading", { level: 1 })) {
        setActiveBlockType("h1");
        return;
      }
      if (editor.isActive("heading", { level: 2 })) {
        setActiveBlockType("h2");
        return;
      }
      if (editor.isActive("heading", { level: 3 })) {
        setActiveBlockType("h3");
        return;
      }
      if (editor.isActive("heading", { level: 4 })) {
        setActiveBlockType("h4");
        return;
      }
      setActiveBlockType("paragraph");
    };

    syncFromSelection();
    editor.on("selectionUpdate", syncFromSelection);
    editor.on("transaction", syncFromSelection);

    return () => {
      editor.off("selectionUpdate", syncFromSelection);
      editor.off("transaction", syncFromSelection);
    };
  }, [editor]);

  const applyToWholeLesson = (
    style: "fontFamily" | "fontSize",
    value: string,
  ) => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const chain = editor.chain().focus().selectAll();

    if (style === "fontFamily") {
      const normalizedFont = normalizeFontFamilyValue(value);
      chain.setFontFamily(normalizedFont).setTextSelection({ from, to }).run();
      setActiveFontFamily(normalizedFont);
      return;
    }

    chain.setFontSize(value).setTextSelection({ from, to }).run();
    setActiveFontSize(value);
  };

  const activeTextTools = editor
      ? [
        editor.isActive("bold") ? "bold" : null,
        editor.isActive("underline") ? "underline" : null,
        editor.isActive("italic") ? "italic" : null,
        editor.isActive("strike") ? "strike" : null,
        editor.isActive("highlight") ? "highlight" : null,
        editor.isActive("subscript") ? "subscript" : null,
        editor.isActive("superscript") ? "superscript" : null,
        editor.isActive("heading", { level: 2 }) ? "heading2" : null,
        editor.isActive("bulletList") ? "bulletList" : null,
        editor.isActive("orderedList") ? "orderedList" : null,
        editor.isActive("taskList") ? "taskList" : null,
        editor.isActive("blockquote") ? "blockquote" : null,
        editor.isActive("codeBlock") ? "codeBlock" : null,
        editor.isActive("link") ? "link" : null,
      ].filter(Boolean)
    : [];

  const currentTextAlign = editor
    ? editor.getAttributes("paragraph").textAlign ||
      editor.getAttributes("heading").textAlign ||
      "left"
    : "left";

  const applyTextColor = (color: string) => {
    if (!editor) return;

    if (color === "default") {
      editor.chain().focus().unsetColor().run();
      setActiveTextColor("default");
      return;
    }

    editor.chain().focus().setColor(color).run();
    setActiveTextColor(color);
  };

  const applyBlockType = (blockType: string) => {
    if (!editor) return;

    if (blockType === "paragraph") {
      editor.chain().focus().setParagraph().run();
      setActiveBlockType("paragraph");
      return;
    }

    const headingLevel = Number(blockType.replace("h", ""));
    if (!Number.isNaN(headingLevel)) {
      editor.chain().focus().setHeading({ level: headingLevel as 1 | 2 | 3 | 4 }).run();
      setActiveBlockType(blockType);
    }
  };

  return {
    activeFontFamily,
    activeFontSize,
    activeTextColor,
    activeBlockType,
    applyToWholeLesson,
    applyTextColor,
    applyBlockType,
    activeTextTools,
    currentTextAlign,
  };
}
