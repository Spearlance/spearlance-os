import { supabase } from "@/integrations/supabase/client";

export interface UploadedAsset {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
  preview_url: string | null;
}

export const ASSET_MAX_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Uploads a file to the `client-assets` Storage bucket, inserts an `assets` row,
 * and kicks off background AI analysis for visual assets. Returns the new asset.
 * Throws on size violation or any Supabase error so callers can report failures.
 *
 * Shared by the Assets page and the task "Link Assets" dialog so both paths
 * create assets identically (bucket path, type inference, AI analysis).
 */
export async function uploadAssetFile(
  file: File,
  clientId: string,
  folderId: string | null = null,
): Promise<UploadedAsset> {
  if (file.size > ASSET_MAX_BYTES) {
    throw new Error(`${file.name} exceeds 50MB limit`);
  }

  const assetId = crypto.randomUUID();
  const fileExt = file.name.split(".").pop();
  const filePath = `${clientId}/${assetId}/original.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("client-assets")
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("client-assets")
    .getPublicUrl(filePath);

  let type: "image" | "video" | "doc" | "link" | "other" | "copy" = "other";
  if (file.type.startsWith("image/")) type = "image";
  else if (file.type.startsWith("video/")) type = "video";
  else if (file.type.includes("pdf") || file.type.includes("document")) type = "doc";

  const { data: userData } = await supabase.auth.getUser();
  const { data: assetData, error: insertError } = await supabase
    .from("assets")
    .insert([{
      client_id: clientId,
      folder_id: folderId,
      title: file.name.replace(/\.[^/.]+$/, ""),
      type,
      storage_type: "upload",
      file_url: publicUrl,
      created_by: userData.user?.id,
    }])
    .select("id, title, type, file_url, preview_url")
    .single();
  if (insertError) throw insertError;

  // Fire-and-forget AI analysis for images and videos.
  if (assetData && (type === "image" || type === "video")) {
    supabase.functions
      .invoke("analyze-asset", { body: { asset_id: assetData.id } })
      .catch(() => {});
  }

  return assetData as UploadedAsset;
}
