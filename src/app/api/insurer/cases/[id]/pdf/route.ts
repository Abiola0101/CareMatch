import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { loadInsurerCaseDetail } from "@/lib/insurer/case-detail";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const detail = await loadInsurerCaseDetail(params.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  const margin = 50;
  let y = 760;
  const line = (text: string, size = 11, useBold = false) => {
    const f = useBold ? bold : font;
    const lines = wrapText(text, f, size, 512);
    for (const ln of lines) {
      if (y < margin + 40) {
        page = pdf.addPage([612, 792]);
        y = 760;
      }
      page.drawText(ln, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 4;
    }
  };

  line("CareMatch — Insurer case match report", 16, true);
  y -= 6;
  line(`Case ID: ${detail.case.id}`, 10);
  line(`Specialty: ${detail.case.specialty ?? "—"}`, 10);
  line(`Urgency: ${detail.case.urgency ?? "—"}`, 10);
  line(`Submitted: ${new Date(detail.case.created_at).toLocaleString()}`, 10);
  line(`Internal ref: ${detail.case.policyholder_ref ?? "—"}`, 10);
  y -= 10;
  line("Condition summary", 12, true);
  line(detail.case.condition_summary ?? "—", 10);
  y -= 10;
  line("Match results (ranked)", 12, true);

  const sorted = [...detail.matches].sort(
    (a, b) => (Number(b.match_score) || 0) - (Number(a.match_score) || 0),
  );
  let rank = 1;
  for (const m of sorted) {
    y -= 4;
    line(`#${rank} — ${m.full_name} (${m.match_score ?? "—"})`, 11, true);
    line(
      `${m.title ?? ""} · ${m.institution ?? ""} · ${m.country ?? ""}`.trim(),
      9,
    );
    rank++;
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="carematch-insurer-case-${params.id}.pdf"`,
    },
  });
}

function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxW) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
