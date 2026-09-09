"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, UserPlus, X } from "lucide-react";

type StaffMember = {
  id: string;
  full_name: string;
  role: "owner" | "manager" | "staff";
  email: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "manager">("staff");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(
    null,
  );
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        roleMenuRef.current &&
        !roleMenuRef.current.contains(event.target as Node)
      ) {
        setRoleMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setRoleMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function loadStaff() {
    const response = await fetch("/api/staff");

    if (response.status === 403) {
      setForbidden(true);
      return;
    }

    const data = await response.json();
    setStaff(data.staff ?? []);
  }

  useEffect(() => {
    let ignore = false;

    fetch("/api/staff")
      .then((response) => {
        if (response.status === 403) {
          if (!ignore) setForbidden(true);
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (data && !ignore) {
          setStaff(data.staff ?? []);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, role }),
    });

    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setFullName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    loadStaff();
  }

  async function handleRemove(id: string) {
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    setConfirmingRemoveId(null);
    loadStaff();
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-white/50">
        Only an owner can manage staff accounts.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
      <p className="text-xs uppercase tracking-[0.25em] text-[#d7a45a]">
        Staff
      </p>

      <h1 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-white">
        Manage staff accounts
      </h1>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="mt-8 rounded-3xl border border-white/8 bg-white/2.5 p-6"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            className="rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d7a45a]/70"
          />

          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d7a45a]/70"
          />

          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Temporary password"
            className="rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d7a45a]/70"
          />

          <div ref={roleMenuRef} className="relative">
            <button
              type="button"
              aria-expanded={roleMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setRoleMenuOpen((isOpen) => !isOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-left text-sm text-white outline-none transition hover:border-white/20 focus:border-[#d7a45a]/70"
            >
              <span>{role === "staff" ? "Staff" : "Manager"}</span>
              <ChevronDown
                size={16}
                className={`text-white/45 transition-transform ${
                  roleMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {roleMenuOpen && (
              <div
                role="listbox"
                aria-label="Staff role"
                className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-xl border border-white/10 bg-[#171719] p-1 shadow-2xl shadow-black/40"
              >
                {(["staff", "manager"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={role === option}
                    onClick={() => {
                      setRole(option);
                      setRoleMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
                  >
                    <span>{option === "staff" ? "Staff" : "Manager"}</span>
                    {role === option && (
                      <Check size={15} className="text-[#d7a45a]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-300/80">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-[#f5f2ea] px-6 text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          <UserPlus size={15} />
          {submitting ? "Adding..." : "Add staff member"}
        </button>
      </form>

      {/* List */}
      <div className="mt-8 space-y-2">
        {staff === null ? (
          <p className="text-sm text-white/30">Loading...</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-white/30">No staff yet.</p>
        ) : (
          staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/2.5 px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium text-white/80">
                  {member.full_name}{" "}
                  <span className="ml-2 rounded-full bg-white/8 px-2 py-0.5 text-[10px] capitalize text-white/50">
                    {member.role}
                  </span>
                </p>
                <p className="mt-1 text-xs text-white/30">{member.email}</p>
              </div>

              {member.role !== "owner" &&
                (confirmingRemoveId === member.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingRemoveId(null)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:bg-white/5"
                    >
                      Keep
                    </button>
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-400/15"
                    >
                      Confirm remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingRemoveId(member.id)}
                    className="flex items-center gap-1 text-xs text-white/25 transition hover:text-red-300"
                  >
                    <X size={12} />
                    Remove
                  </button>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
