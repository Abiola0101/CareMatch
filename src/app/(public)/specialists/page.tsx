"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicSpecialistRow } from "@/lib/data/public-specialists";

const specialtyOptions = [
  { value: "all", label: "All specialties" },
  { value: "cardiology", label: "Cardiology" },
  { value: "oncology", label: "Oncology" },
  { value: "orthopaedics", label: "Orthopaedics" },
];

function formatSpecialty(s: string | null) {
  if (!s) {
    return "—";
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PublicSpecialistsPage() {
  const [specialty, setSpecialty] = useState("all");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PublicSpecialistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAtPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        specialty,
        page: String(pageNum),
        limit: String(limit),
      });
      if (country.trim()) {
        params.set("country", country.trim());
      }
      try {
        const res = await fetch(`/api/public/specialists?${params}`, {
          credentials: "same-origin",
        });
        const json = (await res.json()) as {
          data?: PublicSpecialistRow[];
          total?: number;
          error?: string;
        };
        if (!res.ok) {
          setError(json.error ?? "Could not load specialists.");
          setItems([]);
          setTotal(0);
          return;
        }
        setItems(json.data ?? []);
        setTotal(json.total ?? 0);
      } catch {
        setError("Network error.");
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [specialty, country, limit],
  );

  useEffect(() => {
    void loadAtPage(page);
  }, [page, specialty, loadAtPage]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Specialists
        </h1>
        <p className="mt-3 text-muted-foreground">
          Verified, accepting patients — browse by specialty and country. Match
          scores and contact details are available after you subscribe.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row">
        <aside className="w-full shrink-0 space-y-4 lg:w-56">
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <select
              id="specialty"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={specialty}
              onChange={(e) => {
                setPage(1);
                setSpecialty(e.target.value);
              }}
            >
              {specialtyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="Search country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  void loadAtPage(1);
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => {
                setPage(1);
                void loadAtPage(1);
              }}
            >
              Apply filters
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {loading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No specialists match your filters yet.
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((s) => (
              <Card key={s.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{s.full_name}</CardTitle>
                  <CardDescription>
                    {s.title ?? "Specialist"} ·{" "}
                    {formatSpecialty(s.specialty)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-1 text-sm text-muted-foreground">
                  {s.sub_specialties && s.sub_specialties.length > 0 && (
                    <p>
                      <span className="font-medium text-foreground">
                        Focus:
                      </span>{" "}
                      {s.sub_specialties.join(", ")}
                    </p>
                  )}
                  <p>
                    {s.institution ?? "—"}
                    {s.city || s.country
                      ? ` · ${[s.city, s.country].filter(Boolean).join(", ")}`
                      : ""}
                  </p>
                  {s.case_volume_annual != null && (
                    <p>
                      <span className="font-medium text-foreground">
                        Annual case volume:
                      </span>{" "}
                      {s.case_volume_annual}
                    </p>
                  )}
                  {s.languages && s.languages.length > 0 && (
                    <p>
                      <span className="font-medium text-foreground">
                        Languages:
                      </span>{" "}
                      {s.languages.join(", ")}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-3 border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Subscribe to connect with this specialist
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/signup">See your match score</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
