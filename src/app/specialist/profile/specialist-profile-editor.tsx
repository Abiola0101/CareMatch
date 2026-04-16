"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SPECIALTIES = [
  { value: "cardiology", label: "Cardiology" },
  { value: "oncology", label: "Oncology" },
  { value: "orthopaedics", label: "Orthopaedics & MSK" },
] as const;

const LANGUAGE_OPTIONS = [
  "English",
  "French",
  "Spanish",
  "Arabic",
  "Hindi",
  "Mandarin",
  "Portuguese",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Russian",
  "Turkish",
  "Dutch",
  "Greek",
];

const CARE_MODES = [
  { key: "remote" as const, title: "Remote second opinion" },
  { key: "telemedicine" as const, title: "Telemedicine" },
  { key: "medical_travel" as const, title: "Medical travel" },
  { key: "fly_doctor" as const, title: "Fly the doctor" },
];

type Avail = "yes" | "no" | "conditional";

type ModeRow = {
  mode: string;
  available: Avail;
  detail: string;
  fee_range: string;
  wait_days: string;
};

type PrivilegeRow = {
  id: string;
  hospital_id: string | null;
  institution_name: string | null;
  city: string | null;
  country: string | null;
  privilege_type: string;
  procedures: string[] | null;
  capacity_pct: number | null;
  verified: boolean;
  hospital_display: string | null;
  hospital_city: string | null;
  hospital_country: string | null;
};

type DocRow = {
  id: string;
  storage_path: string;
  doc_type: string;
  original_filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

const PRIV_LABELS: Record<string, string> = {
  full_surgical: "Full surgical privileges",
  active_surgical: "Active surgical privileges",
  consulting: "Consulting only",
  visiting_surgical: "Visiting surgical privileges",
};

function emptyModeRow(mode: string): ModeRow {
  return { mode, available: "no", detail: "", fee_range: "", wait_days: "" };
}

function mergeModes(rows: { mode: string; available: string; detail: string | null; fee_range: string | null; wait_days: number | null }[]): Record<string, ModeRow> {
  const by: Record<string, ModeRow> = {};
  for (const m of CARE_MODES) {
    by[m.key] = emptyModeRow(m.key);
  }
  for (const r of rows) {
    by[r.mode] = {
      mode: r.mode,
      available: (r.available as Avail) ?? "no",
      detail: r.detail ?? "",
      fee_range: r.fee_range ?? "",
      wait_days: r.wait_days != null ? String(r.wait_days) : "",
    };
  }
  return by;
}

export function SpecialistProfileEditor() {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"personal" | "care" | "privileges" | "verify">("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState<string>("");
  const [subSpecs, setSubSpecs] = useState<string[]>([]);
  const [subSpecInput, setSubSpecInput] = useState("");
  const [institution, setInstitution] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [clinicWait, setClinicWait] = useState("");
  const [procWait, setProcWait] = useState("");
  const [accepting, setAccepting] = useState(true);

  const [modeState, setModeState] = useState<Record<string, ModeRow>>(() => {
    const o: Record<string, ModeRow> = {};
    for (const m of CARE_MODES) o[m.key] = emptyModeRow(m.key);
    return o;
  });
  const [willingTravel, setWillingTravel] = useState(false);
  const [travelNote, setTravelNote] = useState("");

  const [privileges, setPrivileges] = useState<PrivilegeRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [mhName, setMhName] = useState("");
  const [mhCity, setMhCity] = useState("");
  const [mhCountry, setMhCountry] = useState("");
  const [mhPriv, setMhPriv] = useState("full_surgical");
  const [mhProc, setMhProc] = useState("");
  const [mhCap, setMhCap] = useState(50);

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [pr, cm, pv, vd] = await Promise.all([
        fetch("/api/specialist/profile"),
        fetch("/api/specialist/care-modes"),
        fetch("/api/specialist/privileges"),
        fetch("/api/specialist/verification-documents"),
      ]);
      if (!pr.ok) throw new Error("Could not load profile");
      const pj = (await pr.json()) as {
        profile: { full_name: string; phone: string | null; country: string | null };
        specialist: Record<string, unknown>;
      };
      setFullName(pj.profile.full_name ?? "");
      setPhone(pj.profile.phone ?? "");
      setProfileCountry(pj.profile.country ?? "");
      const s = pj.specialist;
      setTitle((s.title as string) ?? "");
      setSpecialty((s.specialty as string) ?? "");
      setSubSpecs(Array.isArray(s.sub_specialties) ? (s.sub_specialties as string[]) : []);
      setInstitution((s.institution as string) ?? "");
      setCity((s.city as string) ?? "");
      setCountry((s.country as string) ?? "");
      setYearsExp(s.years_experience != null ? String(s.years_experience) : "");
      setLanguages(Array.isArray(s.languages) ? (s.languages as string[]) : []);
      setBio((s.bio as string) ?? "");
      setVideoUrl((s.profile_video_url as string) ?? "");
      setClinicWait(s.avg_clinic_wait_days != null ? String(s.avg_clinic_wait_days) : "");
      setProcWait(s.avg_proc_wait_days != null ? String(s.avg_proc_wait_days) : "");
      setAccepting(Boolean(s.is_accepting ?? true));

      if (cm.ok) {
        const cj = (await cm.json()) as {
          modes: { mode: string; available: string; detail: string | null; fee_range: string | null; wait_days: number | null }[];
          willing_to_travel: boolean;
          travel_note: string | null;
        };
        setModeState(mergeModes(cj.modes));
        setWillingTravel(Boolean(cj.willing_to_travel));
        setTravelNote(cj.travel_note ?? "");
      }

      if (pv.ok) {
        const pvj = (await pv.json()) as { privileges: PrivilegeRow[] };
        setPrivileges(pvj.privileges ?? []);
      }

      if (vd.ok) {
        const vdj = (await vd.json()) as { documents: DocRow[] };
        setDocs(vdj.documents ?? []);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function savePersonal() {
    setSaving(true);
    setMessage(null);
    setErr(null);
    try {
      const res = await fetch("/api/specialist/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          profile_country: profileCountry || null,
          title: title || null,
          specialty: specialty || null,
          sub_specialties: subSpecs,
          institution: institution || null,
          city: city || null,
          country: country || null,
          years_experience: yearsExp === "" ? null : Number(yearsExp),
          languages,
          bio: bio || null,
          profile_video_url: videoUrl.trim() === "" ? null : videoUrl.trim(),
          avg_clinic_wait_days: clinicWait === "" ? null : Number(clinicWait),
          avg_proc_wait_days: procWait === "" ? null : Number(procWait),
          is_accepting: accepting,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Save failed");
      }
      setMessage("Personal details saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveCareModes() {
    setSaving(true);
    setMessage(null);
    setErr(null);
    try {
      const modes = CARE_MODES.map(({ key }) => {
        const r = modeState[key]!;
        return {
          mode: key,
          available: r.available,
          detail: r.detail || null,
          fee_range: r.fee_range || null,
          wait_days: r.wait_days === "" ? null : Number(r.wait_days),
        };
      });
      const res = await fetch("/api/specialist/care-modes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modes,
          willing_to_travel: willingTravel,
          travel_note: travelNote || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Save failed");
      }
      setMessage("Care modes saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addSubSpec() {
    const t = subSpecInput.trim();
    if (!t || subSpecs.includes(t)) return;
    setSubSpecs([...subSpecs, t]);
    setSubSpecInput("");
  }

  function toggleLang(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  async function addPrivilege() {
    setErr(null);
    const res = await fetch("/api/specialist/privileges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institution_name: mhName.trim(),
        city: mhCity.trim(),
        country: mhCountry.trim(),
        privilege_type: mhPriv,
        procedures_text: mhProc,
        capacity_pct: mhCap,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Could not add");
      return;
    }
    setModalOpen(false);
    setMhName("");
    setMhCity("");
    setMhCountry("");
    setMhPriv("full_surgical");
    setMhProc("");
    setMhCap(50);
    void loadAll();
  }

  async function removePrivilege(id: string) {
    if (!confirm("Remove this hospital privilege?")) return;
    const res = await fetch(`/api/specialist/privileges/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setErr("Could not remove");
      return;
    }
    void loadAll();
  }

  async function uploadDoc(file: File, docType: string) {
    setErr(null);
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      setErr("Use PDF, JPEG, or PNG only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Each file must be 10MB or smaller.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr("Not signed in");
      return;
    }
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${Date.now()}-${safe}`;
    setUploading(docType);
    try {
      const { error: upErr } = await supabase.storage
        .from("specialist-verification")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const reg = await fetch("/api/specialist/verification-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: path,
          doc_type: docType,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
        }),
      });
      if (!reg.ok) {
        const j = await reg.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Register failed");
      }
      setMessage("File uploaded.");
      void loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function removeDoc(id: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/specialist/verification-documents/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setErr("Could not delete document");
      return;
    }
    void loadAll();
  }

  const tabs = [
    { id: "personal" as const, label: "Personal details" },
    { id: "care" as const, label: "Care modes" },
    { id: "privileges" as const, label: "Hospital privileges" },
    { id: "verify" as const, label: "Verification documents" },
  ];

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-4xl px-3 py-12 text-center text-sm text-muted-foreground sm:px-4">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-4xl px-3 py-8 sm:px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your information accurate so patients see the right match.
        </p>
      </div>

      {(message || err) && (
        <div
          className={cn(
            "mb-4 rounded-md border px-3 py-2 text-sm",
            err ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border bg-muted/50",
          )}
        >
          {err ?? message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setMessage(null);
              setErr(null);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "personal" && (
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Clinical profile shown to matched patients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Dr., Prof., etc."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                <option value="">Select…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Sub-specialties</Label>
              <div className="flex flex-wrap gap-2">
                {subSpecs.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {s}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setSubSpecs(subSpecs.filter((x) => x !== s))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag"
                  value={subSpecInput}
                  onChange={(e) => setSubSpecInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubSpec())}
                />
                <Button type="button" variant="secondary" onClick={addSubSpec}>
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst">Institution</Label>
              <Input
                id="inst"
                placeholder="Primary hospital or clinic"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (account)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pcountry">Country (account)</Label>
                <Input
                  id="pcountry"
                  value={profileCountry}
                  onChange={(e) => setProfileCountry(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yexp">Years of experience</Label>
              <Input
                id="yexp"
                type="number"
                min={0}
                max={80}
                value={yearsExp}
                onChange={(e) => setYearsExp(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Languages spoken</Label>
              <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-3">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <label key={lang} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={languages.includes(lang)}
                      onCheckedChange={() => toggleLang(lang)}
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (max 500 characters)</Label>
              <Textarea id="bio" maxLength={500} rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
              <p className="text-xs text-muted-foreground">{bio.length}/500</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video">Profile video URL (optional)</Label>
              <Input id="video" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cw">Average clinic wait (days)</Label>
                <Input
                  id="cw"
                  type="number"
                  min={0}
                  value={clinicWait}
                  onChange={(e) => setClinicWait(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Average procedure wait (days)</Label>
                <Input
                  id="pw"
                  type="number"
                  min={0}
                  value={procWait}
                  onChange={(e) => setProcWait(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="acc" checked={accepting} onCheckedChange={(c) => setAccepting(Boolean(c))} />
              <Label htmlFor="acc" className="font-normal">
                Accepting new patients
              </Label>
            </div>
            <Button onClick={() => void savePersonal()} disabled={saving}>
              {saving ? "Saving…" : "Save personal details"}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "care" && (
        <div className="space-y-6">
          {CARE_MODES.map(({ key, title: ttl }) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-lg">{ttl}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {key === "fly_doctor" && (
                  <div className="mb-4 space-y-3 rounded-md border bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="wtt"
                        checked={willingTravel}
                        onCheckedChange={(c) => setWillingTravel(Boolean(c))}
                      />
                      <Label htmlFor="wtt" className="font-normal">
                        Willing to travel (fly the doctor)
                      </Label>
                    </div>
                    {willingTravel && (
                      <div className="space-y-2">
                        <Label htmlFor="tn">
                          What does the receiving hospital need to provide?
                        </Label>
                        <Textarea
                          id="tn"
                          rows={4}
                          value={travelNote}
                          onChange={(e) => setTravelNote(e.target.value)}
                          placeholder="Facilities, team, credentialing support…"
                        />
                        <p className="text-xs text-muted-foreground">
                          Describe the facilities and team required for credentialing. You can operate in any
                          country — this text explains what the hospital needs to arrange.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={modeState[key]!.available}
                    onChange={(e) =>
                      setModeState((prev) => ({
                        ...prev,
                        [key]: { ...prev[key]!, available: e.target.value as Avail },
                      }))
                    }
                  >
                    <option value="yes">Available</option>
                    <option value="conditional">Conditional</option>
                    <option value="no">Not available</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Detail</Label>
                  <Textarea
                    rows={3}
                    value={modeState[key]!.detail}
                    onChange={(e) =>
                      setModeState((prev) => ({
                        ...prev,
                        [key]: { ...prev[key]!, detail: e.target.value },
                      }))
                    }
                    placeholder="Explain availability or constraints"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fee range</Label>
                    <Input
                      placeholder='e.g. "USD 700–1,500"'
                      value={modeState[key]!.fee_range}
                      onChange={(e) =>
                        setModeState((prev) => ({
                          ...prev,
                          [key]: { ...prev[key]!, fee_range: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wait (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={modeState[key]!.wait_days}
                      onChange={(e) =>
                        setModeState((prev) => ({
                          ...prev,
                          [key]: { ...prev[key]!, wait_days: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button onClick={() => void saveCareModes()} disabled={saving}>
            {saving ? "Saving…" : "Save care modes"}
          </Button>
        </div>
      )}

      {tab === "privileges" && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Hospital privileges</CardTitle>
              <CardDescription>
                Hospital privileges are verified by our team before being displayed to patients.
              </CardDescription>
            </div>
            <Button type="button" onClick={() => setModalOpen(true)}>
              Add hospital
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {privileges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No privileges listed yet.</p>
            ) : (
              <ul className="space-y-3">
                {privileges.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col justify-between gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium">
                        {p.hospital_display ?? p.institution_name ?? "Hospital"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[p.hospital_city, p.hospital_country].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-sm">
                        {PRIV_LABELS[p.privilege_type] ?? p.privilege_type}
                        {p.procedures?.length ? ` · ${p.procedures.join(", ")}` : ""}
                        {p.capacity_pct != null ? ` · Capacity ${p.capacity_pct}%` : ""}
                      </p>
                      {!p.verified && (
                        <p className="text-xs text-amber-600 dark:text-amber-500">Pending verification</p>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void removePrivilege(p.id)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "verify" && (
        <Card>
          <CardHeader>
            <CardTitle>Verification documents</CardTitle>
            <CardDescription>
              PDF, JPEG, or PNG up to 10MB each. Our team reviews documents within 5 working days. You will be
              notified by email when verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(
              [
                { type: "medical_license", label: "Medical license(s)" },
                { type: "credential_certificate", label: "Credential certificates" },
                { type: "privilege_letter", label: "Hospital privilege letters" },
              ] as const
            ).map(({ type, label }) => (
              <div key={type} className="space-y-2 rounded-md border p-4">
                <Label>{label}</Label>
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,application/pdf"
                  disabled={uploading === type}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadDoc(f, type);
                  }}
                />
                {uploading === type && <p className="text-xs text-muted-foreground">Uploading…</p>}
              </div>
            ))}
            <div>
              <p className="mb-2 text-sm font-medium">Uploaded files</p>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {docs.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                      <span>
                        <span className="font-medium">{d.doc_type.replace(/_/g, " ")}</span>
                        {d.original_filename ? ` — ${d.original_filename}` : ""}
                        {d.file_size != null
                          ? ` (${Math.round(d.file_size / 1024)} KB)`
                          : ""}
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void removeDoc(d.id)}>
                        Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Add hospital privilege</h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>Hospital name</Label>
                <Input value={mhName} onChange={(e) => setMhName(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={mhCity} onChange={(e) => setMhCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={mhCountry} onChange={(e) => setMhCountry(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Privilege type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={mhPriv}
                  onChange={(e) => setMhPriv(e.target.value)}
                >
                  {Object.entries(PRIV_LABELS).map(([k, lab]) => (
                    <option key={k} value={k}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Procedures available (comma-separated)</Label>
                <Input value={mhProc} onChange={(e) => setMhProc(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Current capacity %: {mhCap}</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mhCap}
                  className="w-full"
                  onChange={(e) => setMhCap(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void addPrivilege()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
