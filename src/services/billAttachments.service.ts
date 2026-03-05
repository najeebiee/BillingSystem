import { supabase } from "../lib/supabaseClient";
import type { BillAttachment } from "../types/billing";

const ATTACHMENTS_BUCKET =
  import.meta.env.VITE_SUPABASE_BILL_ATTACHMENTS_BUCKET || "bill_attachments";

interface ServiceResult<T> {
  data: T;
  error: string | null;
}

export async function listBillAttachments(billId: string): Promise<ServiceResult<BillAttachment[]>> {
  const { data, error } = await supabase
    .from("bill_attachments")
    .select("id,bill_id,file_path,file_name,mime_type,file_size,uploaded_by,created_at")
    .eq("bill_id", billId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message || "Failed to load attachments." };
  }

  return { data: (data ?? []) as BillAttachment[], error: null };
}

export async function uploadBillAttachments(
  billId: string,
  files: File[],
  uploadedBy?: string
): Promise<ServiceResult<BillAttachment[]>> {
  if (!files.length) return { data: [], error: null };

  const insertedRows: Array<Omit<BillAttachment, "id" | "created_at">> = [];
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const filePath = `${billId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || undefined
      });

    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(ATTACHMENTS_BUCKET).remove(uploadedPaths);
      }
      const uploadMessage =
        uploadError.message === "Bucket not found"
          ? `Storage bucket '${ATTACHMENTS_BUCKET}' not found. Create it in Supabase Storage first.`
          : uploadError.message || "Failed to upload one or more attachments.";
      return {
        data: [],
        error: uploadMessage
      };
    }

    uploadedPaths.push(filePath);
    insertedRows.push({
      bill_id: billId,
      file_path: filePath,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: Number.isFinite(file.size) ? file.size : null,
      uploaded_by: uploadedBy || null
    });
  }

  const { data, error } = await supabase
    .from("bill_attachments")
    .insert(insertedRows)
    .select("id,bill_id,file_path,file_name,mime_type,file_size,uploaded_by,created_at");

  if (error) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove(uploadedPaths);
    return { data: [], error: error.message || "Failed to save attachment records." };
  }

  return { data: (data ?? []) as BillAttachment[], error: null };
}

export async function deleteBillAttachments(attachments: BillAttachment[]): Promise<ServiceResult<null>> {
  if (!attachments.length) return { data: null, error: null };

  const ids = attachments.map((attachment) => attachment.id).filter(Boolean);
  const paths = attachments.map((attachment) => attachment.file_path).filter(Boolean);

  if (ids.length > 0) {
    const { error: deleteRowsError } = await supabase
      .from("bill_attachments")
      .delete()
      .in("id", ids);

    if (deleteRowsError) {
      return { data: null, error: deleteRowsError.message || "Failed to delete attachment records." };
    }
  }

  if (paths.length > 0) {
    const { error: deleteFilesError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove(paths);

    if (deleteFilesError) {
      return { data: null, error: deleteFilesError.message || "Failed to delete attachment files." };
    }
  }

  return { data: null, error: null };
}

export async function downloadBillAttachment(filePath: string, fallbackFileName: string) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .download(filePath);

  if (error || !data) {
    return { error: error?.message || "Failed to download attachment." };
  }

  const url = window.URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fallbackFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
  return { error: null as string | null };
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-() ]/g, "_");
}
