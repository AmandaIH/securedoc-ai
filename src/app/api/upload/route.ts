import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { anonymizeDocumentText } from "@/lib/security/anonymizer";
import { scanForPromptInjection } from "@/lib/security/promptGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const { text, documentName } = await req.json();

    if (!text || !documentName) {
      return NextResponse.json(
        { error: "Mangler tekst eller dokumentnavn" },
        { status: 400 }
      );
    }

    // 1. Sikkerhedsskan for Prompt Injection
    const securityCheck = scanForPromptInjection(text);
    if (!securityCheck.isSafe) {
      return NextResponse.json(
        {
          error: "Sikkerhedsadvarsel: Dokumentet indeholder potentielt usikkert indhold.",
          threats: securityCheck.threatsDetected,
          riskScore: securityCheck.riskScore,
        },
        { status: 422 }
      );
    }

    // 2. Anonymisering af følsomme oplysninger (CPR, e-mail, tlf)
    const anonymized = anonymizeDocumentText(text);

    // 3. Opdel teksten i mindre chunks (ca. 500 tegn hver)
    const chunkSize = 500;
    const rawChunks = anonymized.sanitizedText.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [anonymized.sanitizedText];

    const insertedChunks = [];

    // 4. Generer embeddings og gem i Supabase
    for (let i = 0; i < rawChunks.length; i++) {
      const chunkText = rawChunks[i];

      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: chunkText,
      });

      const { data, error } = await supabase
        .from("document_chunks")
        .insert({
          document_name: documentName,
          chunk_index: i,
          content: chunkText,
          redacted_count: anonymized.redactedCount,
          detected_pii: anonymized.detectedTypes,
          embedding: embedding,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      insertedChunks.push(data);
    }

    return NextResponse.json({
      success: true,
      documentName,
      chunksProcessed: insertedChunks.length,
      redactedCount: anonymized.redactedCount,
      detectedPii: anonymized.detectedTypes,
    });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    return NextResponse.json(
      { error: err.message || "Fejl under behandling af dokument" },
      { status: 500 }
    );
  }
}
