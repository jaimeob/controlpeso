type FoodResult = { name: string; calories: number; portion: string; protein: number; carbs: number; fat: number; source: string; quantity: number; unit: string };

const foodBases: Record<string, Omit<FoodResult, "quantity" | "unit"> & { base: number; baseUnit: string }> = {
  huevo: { name: "Huevo cocido", calories: 78, portion: "1 pieza", protein: 6, carbs: 0.6, fat: 5, source: "Estimación", base: 1, baseUnit: "pieza" },
  manzana: { name: "Manzana", calories: 95, portion: "1 pieza mediana", protein: 0.5, carbs: 25, fat: 0.3, source: "Estimación", base: 1, baseUnit: "pieza" },
  arroz: { name: "Arroz blanco cocido", calories: 130, portion: "100 g", protein: 2.7, carbs: 28, fat: 0.3, source: "Estimación", base: 100, baseUnit: "gramos" },
  pollo: { name: "Pechuga de pollo a la plancha", calories: 165, portion: "100 g", protein: 31, carbs: 0, fat: 3.6, source: "Estimación", base: 100, baseUnit: "gramos" },
  leche: { name: "Leche entera", calories: 61, portion: "100 ml", protein: 3.2, carbs: 4.8, fat: 3.3, source: "Estimación", base: 100, baseUnit: "mililitros" },
};

export async function POST(request: Request) {
  const { query, quantity: inputQuantity, unit: inputUnit } = await request.json();
  if (!query?.trim()) return Response.json({ error: "Escribe un alimento" }, { status: 400 });
  const quantity = Math.max(Number(inputQuantity) || 1, 0.1);
  const unit = ["pieza", "gramos", "mililitros"].includes(inputUnit) ? inputUnit : "pieza";
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Eres nutricionista. Responde solo JSON con name, calories, portion, protein, carbs y fat. Usa exactamente la cantidad y unidad solicitadas para calcular los valores. Todos los valores nutricionales son números." }, { role: "user", content: `Alimento: ${query}. Cantidad: ${quantity} ${unit}.` }] }) });
    if (response.ok) { const data = await response.json(); return Response.json({ ...JSON.parse(data.choices[0].message.content), quantity, unit, source: "IA" }); }
  }
  const match = Object.entries(foodBases).find(([key]) => query.toLowerCase().includes(key))?.[1];
  if (!match) return Response.json({ name: query.trim(), calories: 150, portion: `${quantity} ${unit}`, protein: 8, carbs: 18, fat: 6, quantity, unit, source: "Estimación" });
  const factor = unit === match.baseUnit ? quantity / match.base : 1;
  const round = (value: number) => Math.round(value * factor * 10) / 10;
  return Response.json({ name: match.name, calories: Math.round(match.calories * factor), portion: `${quantity} ${unit}`, protein: round(match.protein), carbs: round(match.carbs), fat: round(match.fat), quantity, unit, source: match.source });
}
