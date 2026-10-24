import type { SupabaseClient } from "@supabase/supabase-js";

import { prepareMenuPhoto } from "@/lib/image-resize";
import { MENU_IMAGE_BUCKET, photoPaths } from "@/lib/menu-image";

function uploadErrorMessage(error: {
  message?: string;
  statusCode?: string | number;
}) {
  const message = (error.message ?? "").toLowerCase();

  if (message.includes("bucket not found")) {
    return "Photo storage isn't set up yet. Run the photos SQL in Supabase first.";
  }

  if (
    message.includes("row-level security") ||
    message.includes("not authorized")
  ) {
    return "You don't have permission to upload photos for this restaurant.";
  }

  if (
    message.includes("too large") ||
    message.includes("maximum allowed size")
  ) {
    return "That photo is too large. Please try a smaller one.";
  }

  return "Couldn't upload the photo. Check your connection and try again.";
}

/**
 * Shrinks a photo in the browser, stores a full-size and a thumbnail version in
 * the café's own folder, and returns the public link of the full-size one.
 * Throws an Error whose message is safe to show to the person.
 */
export async function uploadMenuPhoto(
  supabase: SupabaseClient,
  restaurantId: string,
  file: File,
): Promise<{ url: string }> {
  const prepared = await prepareMenuPhoto(file);

  const paths = photoPaths(restaurantId, crypto.randomUUID(), prepared.ext);
  const bucket = supabase.storage.from(MENU_IMAGE_BUCKET);

  // A new random name every time, so a photo can be cached "forever".
  const options = {
    contentType: prepared.contentType,
    cacheControl: "31536000",
    upsert: false,
  };

  const fullResult = await bucket.upload(paths.full, prepared.full, options);
  if (fullResult.error) throw new Error(uploadErrorMessage(fullResult.error));

  const thumbResult = await bucket.upload(paths.thumb, prepared.thumb, options);

  if (thumbResult.error) {
    // Don't leave a half-uploaded photo behind.
    await bucket.remove([paths.full]);
    throw new Error(uploadErrorMessage(thumbResult.error));
  }

  return { url: bucket.getPublicUrl(paths.full).data.publicUrl };
}
