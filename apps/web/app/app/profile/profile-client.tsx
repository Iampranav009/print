"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit3,
  Loader2,
  LogOut,
  Phone,
  Printer,
  Store,
  User,
} from "lucide-react";
import { LargeTitle } from "@/components/mobile/NavBar";
import { ListGroup, ListRow } from "@/components/mobile/List";
import { Sheet } from "@/components/mobile/Sheet";

interface ProfileProps {
  user: {
    id: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
    contactPhone?: string;
  };
  stats: {
    totalPrints: number;
    favoriteShop: string;
  };
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "Customer";
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").slice(0, 16);
}

async function imageFileToDataUrl(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const maxSide = 512;
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare photo");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ProfileClient({ user, stats }: ProfileProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState(user.fullName || "");
  const [contactPhone, setContactPhone] = useState(user.contactPhone || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  const profileIncomplete = !contactPhone.trim();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setSigningOut(false);
    }
  };

  const handlePhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a profile photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a photo smaller than 5 MB.");
      return;
    }
    try {
      setError(null);
      const dataUrl = await imageFileToDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare photo.");
    }
  };

  const handleSave = async () => {
    const cleanName = fullName.trim();
    const cleanPhone = normalizePhone(contactPhone);
    if (!cleanName) {
      setError("Enter your name.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
          name: cleanName,
          avatar_url: avatarUrl || null,
          picture: avatarUrl || null,
          contact_phone: cleanPhone || null,
        },
      });
      if (updateError) throw updateError;
      setContactPhone(cleanPhone);
      setSaved(true);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full min-h-12 rounded-[14px] border border-black/[0.06] bg-white/90 px-4 text-[16px] text-label placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-tint";

  return (
    <div className="min-h-full pb-32">
      <LargeTitle
        title="Profile"
        subtitle="Account"
        right={
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="glass-card mb-1 flex h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-tint active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        }
      />

      <div className="space-y-5 px-4">
        <section className="glass-card rounded-[28px] p-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-tint/10 ring-4 ring-white/80">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={fullName || "Profile"} fill className="object-cover" unoptimized />
              ) : (
                <User className="w-9 h-9 text-tint" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[22px] font-bold tracking-[-0.03em] text-label">{firstName(fullName)}</h2>
              {user.email && <p className="mt-0.5 truncate text-[14px] text-secondary-label">{user.email}</p>}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-tint/10 px-2.5 py-1 text-[12px] font-semibold text-tint">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Google profile connected
              </div>
            </div>
          </div>

          {profileIncomplete && (
            <div className="mt-5 flex gap-3 rounded-[18px] bg-red-500/10 p-3.5 text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-[14px] font-bold">Complete your profile first.</p>
                <p className="mt-0.5 text-[13px] text-red-700">Add your contact detail so the shop can help if a print needs attention.</p>
              </div>
            </div>
          )}

          {saved && (
            <div className="mt-4 rounded-[18px] bg-tint/10 p-3 text-[14px] font-semibold text-tint">
              Profile updated.
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-[20px] p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-tint/10">
              <Printer className="h-[18px] w-[18px] text-tint" />
            </div>
            <p className="text-[26px] font-bold leading-none tabular-nums text-label">{stats.totalPrints}</p>
            <p className="mt-1.5 text-[13px] text-secondary-label">Prints</p>
          </div>
          <div className="glass-card rounded-[20px] p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-tint/10">
              <Store className="h-[18px] w-[18px] text-tint" />
            </div>
            <p className="truncate text-[17px] font-bold leading-tight text-label">{stats.favoriteShop || "-"}</p>
            <p className="mt-1.5 text-[13px] text-secondary-label">Favourite shop</p>
          </div>
        </section>

        <ListGroup>
          <ListRow
            icon={<Phone className="h-[18px] w-[18px]" />}
            iconClassName={profileIncomplete ? "bg-red-500/10 text-red-600" : undefined}
            title="Contact detail"
            subtitle={
              <span className={profileIncomplete ? "font-semibold text-red-600" : undefined}>
                {contactPhone || "Not added yet"}
              </span>
            }
          />
          <ListRow
            onClick={handleSignOut}
            disabled={signingOut}
            icon={signingOut ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <LogOut className="h-[18px] w-[18px]" />}
            iconClassName="bg-red-500/10 text-red-600"
            title={<span className="text-red-600">Sign out</span>}
          />
        </ListGroup>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit profile">
        <div className="mb-5 flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-tint/10 ring-4 ring-white"
            aria-label="Change profile photo"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={fullName || "Profile"} fill className="object-cover" unoptimized />
            ) : (
              <User className="w-11 h-11 text-tint" />
            )}
            <span className="absolute bottom-0 inset-x-0 flex h-7 items-center justify-center bg-black/45 text-white backdrop-blur-sm">
              <Camera className="w-3.5 h-3.5" />
            </span>
          </button>
          <p className="mt-2 text-[13px] text-secondary-label">Tap to add or change photo</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block px-1 text-[13px] font-semibold text-secondary-label">Name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              className={inputClass}
              placeholder="Your name"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block px-1 text-[13px] font-semibold text-secondary-label">Contact number</span>
            <input
              value={contactPhone}
              onChange={(event) => setContactPhone(normalizePhone(event.target.value))}
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
              placeholder="Add contact number"
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-[14px] bg-red-500/10 px-4 py-3 text-[14px] font-semibold text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-tint text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(12,131,31,0.30)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {saving ? "Saving..." : "Save profile"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            void handlePhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </Sheet>
    </div>
  );
}
