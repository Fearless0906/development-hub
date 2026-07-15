import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

export function useRichTextImage(editor: Editor | null) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const openImagePicker = () => {
    const input = imageInputRef.current;
    if (!input) return;

    input.value = "";

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  };

  const insertImage = (src: string, alt = "Lesson image") => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "editorImage",
        attrs: {
          src,
          alt,
          title: alt,
        },
      })
      .insertContent({ type: "paragraph" })
      .run();
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      event.target.value = "";
      return;
    }

    try {
      const src = await readFileAsDataUrl(file);
      insertImage(src, file.name);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!editor) return;

    const handlePaste = async (event: ClipboardEvent) => {
      const imageItem = Array.from(event.clipboardData?.items || []).find(
        (item) => item.type.startsWith("image/"),
      );

      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      event.preventDefault();
      try {
        const src = await readFileAsDataUrl(file);
        insertImage(src, file.name || "Pasted image");
      } catch {
        toast.error("Failed to paste image");
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("paste", handlePaste);

    return () => {
      dom.removeEventListener("paste", handlePaste);
    };
  }, [editor]);

  return {
    imageInputRef,
    openImagePicker,
    handleImageUpload,
    insertImage,
  };
}
