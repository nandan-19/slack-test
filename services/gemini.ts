
// services/gemini.ts
export async function callGemini(prompt: string, model = "gemini-2.5-flash") {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 900 }
      })
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error("Gemini error: " + t);
  }
  const json = await res.json();
  const text =
    json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
  return text;
}
