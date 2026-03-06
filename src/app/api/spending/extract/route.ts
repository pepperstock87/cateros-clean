import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "receipt" or "invoice"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: "Unsupported file type. Upload JPG, PNG, or PDF." }, { status: 400 });
    }

    let prompt: string;
    let content: any[];

    if (type === "receipt") {
      prompt = `You are analyzing a receipt image for a catering business expense tracker. Extract the following fields from this receipt:

- vendor: The store/business name
- date: The date of purchase in YYYY-MM-DD format
- amount: The total amount paid as a number (no currency symbols)
- category: One of: Produce, Meat, Seafood, Dairy, Bakery, Beverages, Dry Goods, Equipment, Supplies, Other

Return ONLY a valid JSON object with these fields, no other text. Example:
{"vendor": "Restaurant Depot", "date": "2026-03-05", "amount": 245.67, "category": "Produce"}`;

      content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64,
          },
        },
        { type: "text", text: prompt },
      ];
    } else {
      // Invoice - can be PDF or image
      prompt = `You are analyzing a distributor invoice for a catering business expense tracker. Extract the following fields:

- distributor: The distributor/vendor company name
- invoice_date: The invoice date in YYYY-MM-DD format
- invoice_number: The invoice number/reference
- total: The total amount as a number (no currency symbols)
- line_items: An array of line items, each with: description (string), quantity (number), unit_price (number), total (number)

Return ONLY a valid JSON object with these fields, no other text. Example:
{"distributor": "Sysco", "invoice_date": "2026-03-01", "invoice_number": "INV-12345", "total": 1523.40, "line_items": [{"description": "Chicken Breast 40lb", "quantity": 2, "unit_price": 89.99, "total": 179.98}]}`;

      if (isPdf) {
        content = [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: prompt },
        ];
      } else {
        content = [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64,
            },
          },
          { type: "text", text: prompt },
        ];
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", errBody);
      return NextResponse.json({ error: "AI extraction failed" }, { status: 500 });
    }

    const result = await response.json();
    const textContent = result.content?.find((c: any) => c.type === "text")?.text;

    if (!textContent) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON from the response (handle potential markdown code blocks)
    let extracted;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", textContent);
      return NextResponse.json({ error: "Failed to parse extracted data" }, { status: 500 });
    }

    return NextResponse.json({ extracted });
  } catch (err: any) {
    console.error("Extract error:", err);
    return NextResponse.json({ error: err.message || "Extraction failed" }, { status: 500 });
  }
}
