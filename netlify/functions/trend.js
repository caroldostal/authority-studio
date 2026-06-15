exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const temas = [
    "LinkedIn e redes sociais",
    "Conselho de administração e governança",
    "Seguros e mercado financeiro",
    "Bancos e fintechs",
    "Tecnologia e inovação",
    "Saúde e bem-estar",
    "Entretenimento e cultura",
    "Liderança e gestão",
    "Autoridade digital",
    "M&A, fusões e aquisições",
    "Mercado de perecíveis e agro",
    "Mercado de luxo",
    "Neurociência e neuromarketing",
    "Dicas de livros de negócios",
    "Inteligência artificial",
    "Futuro do trabalho",
    "Marca pessoal e personal branding",
    "Cool hunting e novidades",
  ];

  const prompt = `Você é um curador de tendências para executivos brasileiros no LinkedIn.

Para cada um dos temas abaixo, identifique O TEMA MAIS QUENTE E RELEVANTE do momento em 2026.

Temas: ${temas.join(", ")}

Responda SOMENTE em JSON válido, sem texto fora do JSON:
{
  "atualizado_em": "data e hora atual em português",
  "tendencias": [
    {
      "categoria": "nome do tema",
      "titulo": "título da tendência em até 8 palavras",
      "descricao": "descrição em 1 frase direta e informativa",
      "tag": "palavra-chave principal"
    }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erro API");

    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};