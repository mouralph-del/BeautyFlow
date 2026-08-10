import { supabase } from "../lib/supabase";

const BUCKET = "gallery-media";
const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];

export async function getGalleryMedia({ admin = false } = {}) {
  let query = supabase.from("gallery_media").select("*, gallery_media_services(service_id,display_order,is_primary)").order("display_order").order("created_at");
  if (!admin) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function upload(file, mediaType) {
  if (!allowed.includes(file.type)) throw new Error("Formato de arquivo não permitido.");
  if (file.size > 80 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 80 MB.");
  const extension = file.name.split(".").pop().toLowerCase();
  const folder = mediaType === "video" ? "videos" : "photos";
  const path = `gallery/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return { path, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function saveGalleryItem(values, file, id, oldPath) {
  let stored;
  if (file) stored = await upload(file, values.media_type);
  const customInformation = values.information_source === "custom"
    || values.title_source === "custom"
    || values.description_source === "custom";
  const payload = {
    media_type: values.media_type, title: values.title.trim(), category: values.category.trim(),
    alt_text: values.alt_text.trim(), display_order: Number(values.display_order),
    is_active: values.is_active, is_featured: values.is_featured,
    title_source: customInformation ? "custom" : values.service_ids.length > 1 ? "combined" : "service",
    custom_title: values.custom_title?.trim() || null,
    description_source: customInformation ? "custom" : "service",
    custom_description: values.custom_description?.trim() || null,
    preferred_position: values.is_central_video ? "center" : values.preferred_position || null,
    is_central_video: Boolean(values.is_central_video), updated_at: new Date().toISOString(),
    ...(stored ? { storage_path: stored.path, public_url: stored.publicUrl } : {}),
  };
  if (!id && !stored) throw new Error("Selecione uma foto ou vídeo.");
  const query = id ? supabase.from("gallery_media").update(payload).eq("id", id).select("id").single() : supabase.from("gallery_media").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) { if (stored) await supabase.storage.from(BUCKET).remove([stored.path]); throw error; }
  const { error: relationError } = await supabase.rpc("admin_set_gallery_media_services", {
    target_media_id: data.id,
    target_service_ids: values.service_ids.map(Number),
    target_primary_service_id: values.primary_service_id ? Number(values.primary_service_id) : null,
  });
  if (relationError) throw relationError;
  if (stored && oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
}

export async function setGalleryActive(id, isActive) {
  const { error } = await supabase.from("gallery_media").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function setCentralGalleryVideo(id) {
  const { error: resetError } = await supabase
    .from("gallery_media").update({ is_central_video: false, preferred_position: null })
    .eq("media_type", "video");
  if (resetError) throw resetError;
  const { error } = await supabase
    .from("gallery_media").update({ is_central_video: true, preferred_position: "center", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGalleryItem(item) {
  const { error } = await supabase.from("gallery_media").delete().eq("id", item.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([item.storage_path]);
}

export async function reorderGallery(items) {
  await Promise.all(items.map((item, index) => supabase.from("gallery_media").update({ display_order: index + 1 }).eq("id", item.id).then(({ error }) => { if (error) throw error; })));
}
