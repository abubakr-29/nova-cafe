"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { useStaffData } from "@/lib/staff-data-context";

// A short message at the bottom of the staff screens when a save did not go through.
export default function NoticeToast() {
  const { notice, dismissNotice } = useStaffData();
  const noticeId = notice?.id;

  useEffect(() => {
    if (noticeId === undefined) return;

    const timer = setTimeout(dismissNotice, 7000);

    return () => clearTimeout(timer);
  }, [noticeId, dismissNotice]);

  if (!notice) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-130 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-red-300/25 bg-[#1a1114] px-4 py-3.5 text-sm text-red-100 shadow-2xl print:hidden"
    >
      <p className="min-w-0 flex-1 leading-5">{notice.text}</p>

      <button
        type="button"
        onClick={dismissNotice}
        aria-label="Dismiss"
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-red-100/60 transition hover:text-red-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
