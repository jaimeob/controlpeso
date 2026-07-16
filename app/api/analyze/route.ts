type FoodResult = { name: string; calories: number; portion: string; protein: number; carbs: number; fat: number; source: string };

const knownFoods: Record<string, FoodResult> = {
  huevo: { name: "Huevo cocido", calories: 78, portion: "1 pieza", protein: 6, carbs: 0.6, fat: 5, source: "IA" },
  manzana: { name: "Manzana", calories: 95, portion: "1 pieza mediana", protein: 0.5, carbs: 25, fat: 0.3, source: "IA" },
  arroz: { name: "Arroz blanco cocido", calories: 195, portion: "150 g", protein: 4, carbs: 42, fat: 0.5, source: "IA" },
  pollo: { name: "Pechuga de pollo a la plancha", calories: 280, portion: "150 g", protein: 42, carbs: 0, fat: 12, source: "IA" },
};

export async function POST(request: Request) {
  const { query } = await request.json();
  if (!query?.trim()) return Response.json({ error: "Escribe un alimento" }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Eres nutricionista. Responde solo JSON con name, calories, portion, protein, carbs y fat. Estima una porción razonable si no se especifica. calories y macros son números." }, { role: "user", content: query }] }) });
    if (response.ok) { const data = await response.json(); return Response.json({ ...JSON.parse(data.choices[0].message.content), source: "IA" }); }
  }
  const match = Object.entries(knownFoods).find(([key]) => query.toLowerCase().includes(key));
  return Response.json(match?.[1] || { name: query.trim().replace(/^un |una |un poco de /i, ""), calories: 150, portion: "1 porción estimada", protein: 8, carbs: 18, fat: 6, source: "Estimación" });
}
