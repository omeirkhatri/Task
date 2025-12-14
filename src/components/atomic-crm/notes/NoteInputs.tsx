import { Fragment, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInput, useNotify } from "ra-core";
import {
  FormControl,
  FormError,
  FormField,
} from "@/components/admin/form";
import { InputHelperText } from "@/components/admin/input-helper-text";
import { Paperclip, X } from "lucide-react";

import { SmartTextInput } from "../misc/SmartTextInput";
import type { AttachmentNote } from "../types";
import { supabase } from "../providers/supabase/supabase";

export const NoteInputs = ({ showStatus }: { showStatus?: boolean }) => {
  // showStatus is intentionally ignored — user requested removing Status UI.
  void showStatus;

  const notify = useNotify();
  const { setValue, watch } = useFormContext();
  const { id, field } = useInput({ source: "text" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const attachments = (watch("attachments") as AttachmentNote[] | undefined) ?? [];

  const handleUsersTagged = (userIds: number[]) => {
    // Update the tagged_user_ids field when users are tagged
    setValue("tagged_user_ids", userIds.length > 0 ? userIds : undefined, { shouldDirty: true });
  };

  const uploadAttachment = async (file: File): Promise<AttachmentNote> => {
    const ext = file.name.split(".").pop() || "png";
    const base =
      (globalThis.crypto as any)?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${base}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return {
      src: data.publicUrl,
      title: file.name || `image.${ext}`,
      path,
      type: file.type || undefined,
      // rawFile is only for client-side; we don't persist it
      rawFile: file,
    };
  };

  const addFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type?.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await Promise.all(imageFiles.map(uploadAttachment));
      const next = [...attachments, ...uploaded].map(({ rawFile: _raw, ...rest }) => rest as any);
      // store without rawFile (DB column is jsonb[])
      setValue("attachments", next, { shouldDirty: true });
      notify(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} attached`, {
        type: "success",
      });
    } catch (e: any) {
      console.error("NoteInputs: upload failed", e);
      notify("Failed to upload image", { type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter((it) => it.type?.startsWith("image/"));
    if (imageItems.length === 0) return;

    e.preventDefault();
    const files = imageItems
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f)
      .map((f) => (f.name ? f : new File([f], `pasted-image-${Date.now()}.png`, { type: f.type })));

    await addFiles(files);
  };

  const handleDrop = async (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    const hasImages = files.some((f) => f.type?.startsWith("image/"));
    if (!hasImages) return;
    e.preventDefault();
    e.stopPropagation();
    await addFiles(files);
  };

  const removeAttachmentAt = (index: number) => {
    const next = attachments.filter((_, i) => i !== index);
    setValue("attachments", next.length ? next : undefined, { shouldDirty: true });
  };

  return (
    <Fragment>
      <FormField id={id} className="m-0" name={field.name}>
        <FormControl>
          <SmartTextInput
            value={field.value || ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            multiline
            placeholder="Add a note. Try tagging someone with @username"
            rows={6}
            onUsersTagged={handleUsersTagged}
            onPaste={handlePaste as any}
            onDrop={handleDrop as any}
            onDragOver={(e: React.DragEvent) => {
              // allow dropping images
              if (Array.from(e.dataTransfer?.items ?? []).some((it) => it.type?.startsWith("image/"))) {
                e.preventDefault();
              }
            }}
          />
        </FormControl>
        <InputHelperText helperText={false} />
        <FormError />
      </FormField>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              // reset so selecting the same file twice works
              e.currentTarget.value = "";
              await addFiles(files);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            title="Attach images (you can also paste or drag & drop)"
          >
            <Paperclip className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Attach images"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Tip: paste an image from clipboard or drag & drop into the note.
          </span>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-2">Attachments</div>
          <div className="grid grid-cols-4 gap-3">
            {attachments.map((att, index) => (
              <div key={`${att.src}-${index}`} className="relative border rounded-md overflow-hidden">
                <img
                  src={att.src}
                  alt={att.title}
                  className="w-full h-20 object-cover cursor-pointer"
                  onClick={() => window.open(att.src, "_blank")}
                />
                <button
                  type="button"
                  className={cn(
                    "absolute top-1 right-1 rounded-full bg-background/80 border p-1",
                    "hover:bg-background",
                  )}
                  onClick={() => removeAttachmentAt(index)}
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Fragment>
  );
};
