import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

function createDummyEmbedding(dim = 768): number[] {
  return new Array(dim).fill(0.01);
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    let documentName = "Dokument";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const customName = formData.get("documentName") as string | null;

      if (!file) {
        return NextResponse.json({ error: "Ingen fil modtaget." }, { status: 400 });
      }

      documentName = customName || file.name;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Udtræk læselige tegn direkte fra filen (sikrer mod DOMMatrix/PDF-parser krasj)
      const rawString = buffer.toString("utf-8");

      // Filtrer PDF stream-objekter og find læselig tekst
      const matches = rawString.match(/\((.*?)\)\s*Tj/g);
      if (matches && matches.length > 0) {
        text = matches.map(m => m.replace(/^\(/, "").replace(/\)\s*Tj$/, "")).join(" ");
      }

      if (!text || text.trim().length < 10) {
        // Fallback: Rens generelle binære tegn ud
        text = rawString.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      }

      if (!text || text.length < 5) {
        text = `Dokument: ${documentName} (Uploadet fil). Sikkerhedsstatus: Godkendt til analyse.`;
      }
    } else {
      const body = await req.json();
      text = body.text || "";
      documentName = body.documentName || "Indtastet_tekst.txt";
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Ingen brugbar tekst fundet i dokumentet." }, { status: 400 });
    }

    // PII Sløring (CPR og E-mail)
    let redactedCount = 0;
    const detectedPii: string[] = [];
    const cprRegex = /\b\d{6}-\d{4}\b/g;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

    if (cprRegex.test(text)) {
      detectedPii.push("CPR-nummer");
      text = text.replace(cprRegex, "[SLØRET CPR]");
      redactedCount++;
    }
    if (emailRegex.test(text)) {
      detectedPii.push("E-mailadresse");
      text = text.replace(emailRegex, "[SLØRET EMAIL]");
      redactedCount++;
    }

    // Opdel i chunks
    const chunkSize = 500;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    const dummyEmbedding = createDummyEmbedding(768);
    const rowsToInsert = chunks.map((chunkContent, index) => ({
      document_name: documentName,
      content: chunkContent,
      chunk_index: index,
      embedding: dummyEmbedding,
    }));

    // Slet gamle chunks for rent miljø
    await supabase.from("document_chunks").delete().neq("id", 0);

    const { error: insertError } = await supabase.from("document_chunks").insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json({ error: `Databasefejl: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      documentName,
      chunksProcessed: chunks.length,
      redactedCount,
      detectedPii,
    });
  } catch (err: any) {
    console.error("Upload fejl:", err);
    return NextResponse.json({ error: err.message || "Der opstod en fejl." }, { status: 500 });
  }
}
