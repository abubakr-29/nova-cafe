// Where menu photos live and how to find the small version of one.
//
// Every uploaded photo is stored twice, in the café's own folder of the public
// "menu-images" bucket: an 800px picture for the item sheet, and a 240px
// thumbnail (name + "-thumb") for the long menu list. The database only stores
// the URL of the big one; the thumbnail's URL is derived from it.

export const MENU_IMAGE_BUCKET = "menu-images";

const PUBLIC_PATH = `/storage/v1/object/public/${MENU_IMAGE_BUCKET}/`;
const THUMB_SUFFIX = "-thumb";

export function isMenuStorageUrl(url: string) {
  return url.includes(PUBLIC_PATH);
}

/** The small version of a photo we stored, or the URL unchanged for anything else. */
export function thumbnailUrl(url: string) {
  if (!isMenuStorageUrl(url)) return url;

  return url.replace(
    /(?<!-thumb)\.(webp|jpg)(\?.*)?$/i,
    `${THUMB_SUFFIX}.$1$2`,
  );
}

/** Storage paths (inside the bucket) for a new photo. The folder is the café's id. */
export function photoPaths(
  restaurantId: string,
  id: string,
  ext: "webp" | "jpg",
) {
  return {
    full: `${restaurantId}/${id}.${ext}`,
    thumb: `${restaurantId}/${id}${THUMB_SUFFIX}.${ext}`,
  };
}
