import { Router, type IRouter } from "express";
import { AiChatBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a CRM assistant for an Indian retail brand. You help marketers reach their customers. When a marketer describes a campaign goal, extract:
1) the customer segment as a SQL WHERE clause on the customers table (fields: total_spent, visit_count, last_purchase_date, city)
2) a personalized message draft in friendly Hindi-English mixed tone (Hinglish)
3) recommended channel (whatsapp/sms/email)

Always respond ONLY in JSON with no extra text, no markdown fences:
{
  "reply": "string (friendly explanation to the marketer)",
  "action": "create_campaign" or null,
  "segment_query": "SQL WHERE clause or null",
  "message_draft": "personalized campaign message or null",
  "channel": "whatsapp or sms or email or null"
}

For segment queries use snake_case column names: total_spent, visit_count, last_purchase_date, city.
Examples:
- High value customers: total_spent > 10000
- Frequent visitors from Mumbai: visit_count > 5 AND city = 'Mumbai'
- Inactive customers: last_purchase_date < NOW() - INTERVAL '90 days'
- Multiple cities: city IN ('Delhi', 'Mumbai', 'Bangalore')

The message should be warm, personalized with {name} placeholder, and in a friendly tone appropriate for Indian retail customers.`;

router.post("/ai/chat", async (req, res): Promise<void> => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    res.status(400).json({ error: "Groq API key required. Add it via the X-Api-Key header." });
    return;
  }

  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, history } = parsed.data;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? []).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.warn({ status: response.status, body: errText }, "Groq API error");
      res.status(400).json({ error: `Groq API error: ${response.status}` });
      return;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const rawContent = data.choices[0]?.message?.content ?? "{}";

    // Strip markdown fences if present
    const cleaned = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed2: {
      reply?: string;
      action?: string | null;
      segment_query?: string | null;
      message_draft?: string | null;
      channel?: string | null;
    };

    try {
      parsed2 = JSON.parse(cleaned);
    } catch {
      // Fallback: treat whole content as reply
      parsed2 = { reply: rawContent, action: null };
    }

    res.json({
      reply: parsed2.reply ?? rawContent,
      action: parsed2.action ?? null,
      segmentQuery: parsed2.segment_query ?? null,
      messageDraft: parsed2.message_draft ?? null,
      channel: parsed2.channel ?? null,
    });
  } catch (err) {
    logger.error({ err }, "AI chat request failed");
    res.status(500).json({ error: "Failed to reach AI service" });
  }
});

export default router;
