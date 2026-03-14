import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/entitlements";
import { logAudit } from "@/lib/audit";
import { getCurrentOrg } from "@/lib/organizations";

const DAILY_LIMIT = 10;

const PROMPT_TEMPLATES: Record<string, (details: string) => string> = {
  recipe: (details) =>
    `Professional food photography of ${details}, plated elegantly on a white plate, soft natural lighting, overhead shot, restaurant quality, high resolution`,
  proposal: (details) =>
    `Elegant ${details} catering spread, beautifully arranged, professional event photography, warm lighting, high resolution`,
  marketing: (details) =>
    `Professional catering and hospitality ${details}, clean modern style, warm inviting atmosphere, high resolution`,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isPro } = await getUserEntitlements();
  const body = await request.json();
  const { prompt, type, details } = body as {
    prompt?: string;
    type: "recipe" | "proposal" | "marketing";
    details?: string;
  };

  if (!type || !PROMPT_TEMPLATES[type]) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Pro-only for recipe and proposal types
  if ((type === "recipe" || type === "proposal") && !isPro) {
    return NextResponse.json(
      { error: "Image generation requires a Pro subscription" },
      { status: 403 }
    );
  }

  // Rate limiting: check daily usage
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("image_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit of ${DAILY_LIMIT} image generations reached. Try again tomorrow.` },
      { status: 429 }
    );
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Image generation is not configured" },
      { status: 503 }
    );
  }

  const fullPrompt = prompt || PROMPT_TEMPLATES[type](details || "food");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-preview-image-generation",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ["image", "text"],
      } as any,
    });

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    // Find the image part
    const imagePart = parts.find((p: any) => p.inlineData);
    if (!imagePart || !(imagePart as any).inlineData) {
      return NextResponse.json({ error: "No image in response" }, { status: 500 });
    }

    const imageData = (imagePart as any).inlineData;
    const buffer = Buffer.from(imageData.data, "base64");
    const mimeType = imageData.mimeType || "image/png";
    const ext = mimeType.includes("jpeg") ? "jpg" : "png";

    // Upload to Supabase Storage
    const fileName = `${type}/${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[image-gen] Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to store image" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Log generation
    const org = await getCurrentOrg();
    await supabase.from("image_generation_log").insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
      generation_type: type,
      prompt: fullPrompt,
      image_url: imageUrl,
    });

    logAudit({
      userId: user.id,
      action: "create",
      entity: "image_generation" as any,
      entityId: fileName,
      entityName: `${type} image`,
      details: { type, prompt: fullPrompt.slice(0, 200) },
      organizationId: org?.orgId || null,
    });

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("[image-gen] Generation error:", err);
    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 500 }
    );
  }
}
