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
  X,
} from "lucide-react";

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

  return (
    <div className="min-h-full bg-gray-50 pb-28">
      <div className="bg-white px-4 pt-4 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-600">Account</p>
            <h1 className="text-2xl font-bold text-gray-950 mt-1">Profile</h1>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-10 px-4 rounded-full bg-gray-950 text-white text-sm font-semibold flex items-center gap-2 active:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      <div className="px-4 -mt-1">
        <section className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 mt-4">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl bg-green-50 overflow-hidden flex items-center justify-center border border-green-100">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={fullName || "Profile"} fill className="object-cover" unoptimized />
              ) : (
                <User className="w-10 h-10 text-green-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-950 truncate">{firstName(fullName)}</h2>
              {user.email && <p className="text-sm text-gray-500 truncate mt-0.5">{user.email}</p>}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Google profile connected
              </div>
            </div>
          </div>

          {profileIncomplete && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 flex gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Complete your profile first.</p>
                <p className="text-xs mt-0.5 text-red-700">Add your contact detail so the shop can help if a print needs attention.</p>
              </div>
            </div>
          )}

          {saved && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
              Profile updated.
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
              <Printer className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-950 tabular-nums">{stats.totalPrints}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Prints</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <Store className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-base font-bold text-gray-950 truncate">{stats.favoriteShop || "-"}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Favorite shop</p>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-4 overflow-hidden">
          <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profileIncomplete ? "bg-red-50" : "bg-green-50"}`}>
              <Phone className={`w-5 h-5 ${profileIncomplete ? "text-red-600" : "text-green-600"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-950">Contact detail</p>
              <p className={`text-sm truncate ${profileIncomplete ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                {contactPhone || "Not added yet"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full min-h-[52px] px-4 text-left flex items-center justify-center gap-2 text-gray-800 font-semibold active:bg-gray-50 disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sign out
          </button>
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40">
          <button type="button" className="flex-1" aria-label="Close profile editor" onClick={() => setEditing(false)} />
          <div className="bg-white rounded-t-3xl px-5 pt-4 pb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-950">Edit profile</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-3xl bg-green-50 overflow-hidden flex items-center justify-center border border-green-100"
                aria-label="Change profile photo"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={fullName || "Profile"} fill className="object-cover" unoptimized />
                ) : (
                  <User className="w-12 h-12 text-green-600" />
                )}
                <span className="absolute right-1.5 bottom-1.5 w-8 h-8 rounded-full bg-gray-950 text-white flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </span>
              </button>
              <p className="text-xs text-gray-500 mt-2">Tap to add or change photo</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-sm font-semibold text-gray-900 mb-1.5">Name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  className="w-full min-h-[48px] rounded-2xl border border-gray-200 bg-white px-4 text-base text-gray-950 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Your name"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-semibold text-gray-900 mb-1.5">Contact number</span>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(normalizePhone(event.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full min-h-[48px] rounded-2xl border border-gray-200 bg-white px-4 text-base text-gray-950 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add contact number"
                />
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-5 w-full min-h-[52px] rounded-2xl bg-green-500 text-white font-bold text-base flex items-center justify-center gap-2 active:bg-green-600 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>

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
        </div>
      )}
    </div>
  );
}
