import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  fileBase64: z.string().min(1),
  mimeType: z.string().default("application/pdf"),
  fileName: z.string().optional(),
});

const InsurerEnum = z.enum(["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"]);

const ExtractedFieldsSchema = z.object({
  clientName: z.string().nullable().optional(),
  clientDocument: z.string().nullable().optional(),
  insurer: InsurerEnum.nullable().optional(),
  policyNumber: z.string().nullable().optional(),
  premium: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const ConfidenceSchema = z.object({
  clientName: z.number().min(0).max(1).optional(),
  clientDocument: z.number().min(0).max(1).optional(),
  insurer: z.number().min(0).max(1).optional(),
  policyNumber: z.number().min(0).max(1).optional(),
  premium: z.number().min(0).max(1).optional(),
  startDate: z.number().min(0).max(1).optional(),
  endDate: z.number().min(0).max(1).optional(),
});

const ModelOutputSchema = z.object({
  fields: ExtractedFieldsSchema,
  confidence: ConfidenceSchema.default({}),
  warnings: z.array(z.string()).default([]),
});

export type PolicyExtractionResult = z.infer<typeof ModelOutputSchema>;

const SYSTEM_PROMPT = `Você extrai dados de apólices de seguro AUTO brasileiras a partir de PDFs.
Retorne SOMENTE um JSON válido no formato exato:
{
  "fields": {
    "clientName": string|null,
    "clientDocument": string|null,
    "insurer": "Porto Seguro"|"Bradesco"|"SulAmérica"|"Allianz"|"Mapfre"|null,
    "policyNumber": string|null,
    "premium": number|null,
    "startDate": "YYYY-MM-DD"|null,
    "endDate": "YYYY-MM-DD"|null
  },
  "confidence": { "clientName": 0..1, ... },
  "warnings": string[]
}

Regras:
- premium é o PRÊMIO TOTAL anual em reais, como número (ex.: 2450.75). Sem "R$", sem pontos de milhar.
- Datas em ISO YYYY-MM-DD.
- Se não encontrar um campo com confiança razoável, retorne null. NUNCA invente valores.
- insurer deve ser um dos 5 valores do enum ou null se a seguradora não for reconhecida.
- clientDocument é o CPF ou CNPJ do segurado (mantenha máscara original se houver).
- confidence: sua estimativa (0..1) por campo extraído.
- warnings: liste ambiguidades ou campos suspeitos.`;

export const extractPolicyFromPdf = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<PolicyExtractionResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia os dados desta apólice em JSON conforme o schema definido.",
              },
              {
                type: "file",
                file: {
                  filename: data.fileName ?? "apolice.pdf",
                  file_data: `data:${data.mimeType};base64,${data.fileBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em alguns segundos.");
      if (res.status === 402) throw new Error("Créditos Lovable AI esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na extração (${res.status}): ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta da IA vazia");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Resposta da IA não é JSON válido");
    }

    const result = ModelOutputSchema.safeParse(parsed);
    if (!result.success) {
      return {
        fields: {},
        confidence: {},
        warnings: ["Formato de resposta inesperado da IA — revise os campos manualmente."],
      };
    }
    return result.data;
  });
