export async function getGeminiBatchEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;

  const requests = texts.map((t) => ({
    model: "models/gemini-embedding-001",
    outputDimensionality: 768,
    content: { parts: [{ text: t }] }
  }));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Gemini API Fejl (${res.status}): ${errData.error?.message || "Kunne ikke generere embeddings"}`);
  }

  const data = await res.json();
  if (data.embeddings && Array.isArray(data.embeddings)) {
    return data.embeddings.map((e: any) => e.values);
  }

  throw new Error("Ingen batch-embedding værdier modtaget fra Gemini API.");
}

export async function getGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const results = await getGeminiBatchEmbeddings([text], apiKey);
  return results[0];
}