"use client";

import Image from "next/image";
import { Camera, ImageIcon, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { thumbnailUrl } from "@/lib/menu-image";
import { uploadMenuPhoto } from "@/lib/photo-upload";
import { createClient } from "@/lib/supabase/client";

type PhotoFieldProps = {
  /** The current photo link ("" when there is none). */
  value: string;
  onChange: (url: string) => void;
  restaurantId: string | null;
};

export default function PhotoField({
  value,
  onChange,
  restaurantId,
}: PhotoFieldProps) {
  const [supabase] = useState(() => createClient());
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  async function handleFile(file: File) {
    if (!restaurantId) {
      setError(
        "Your restaurant isn't loaded yet. Please try again in a moment.",
      );
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { url } = await uploadMenuPhoto(supabase, restaurantId, file);
      setPreviewFailed(false);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload the photo.");
    } finally {
      setUploading(false);
    }
  }

  const showPreview = !!value && !previewFailed;

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-sm text-white/60">Photo (optional)</p>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/3 text-white/20">
          {showPreview ? (
            <Image
              src={thumbnailUrl(value)}
              alt="Current photo"
              width={80}
              height={80}
              unoptimized
              onError={() => setPreviewFailed(true)}
              className="h-20 w-20 object-cover"
            />
          ) : (
            <ImageIcon size={22} />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              <Camera size={14} />
              {uploading
                ? "Uploading…"
                : value
                  ? "Change photo"
                  : "Take or choose photo"}
            </button>

            {value && !uploading && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onChange("");
                }}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/40 transition hover:text-red-200"
              >
                <Trash2 size={14} />
                Remove
              </button>
            )}
          </div>

          <p className="mt-2 text-[11px] leading-4 text-white/30">
            It&apos;s cropped square and shrunk automatically, so any phone
            photo works.
          </p>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*"
          aria-label="Choose a photo"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300/80">
          {error}
        </p>
      )}
    </div>
  );
}
