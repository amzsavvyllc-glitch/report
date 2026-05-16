import type Anthropic from "@anthropic-ai/sdk";
import { callJson, MODELS } from "./client";
import { DOCUMENT_OCR_SYSTEM } from "./prompts/document-ocr";

export interface DocOcrResult {
  doc_type_confirmed: "iqama" | "license" | "bike_registration" | "unknown";
  doc_number: string | null;
  full_name: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  nationality: string | null;
  extra: Record<string, unknown>;
  confidence: number;
  warnings: string[];
}

export async function extractDocument(opts: {
  imageBytes: ArrayBuffer;
  contentType: string;
  hintedType: "iqama" | "license" | "bike_registration";
}): Promise<DocOcrResult> {
  const base64 = arrayBufferToBase64(opts.imageBytes);
  const userContent: Anthropic.MessageParam["content"] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: opts.contentType as Anthropic.Base64ImageSource["media_type"],
        data: base64,
      },
    },
    {
      type: "text",
      text: `Hinted document type: ${opts.hintedType}. Extract the fields per schema.`,
    },
  ];

  const first = await callJson<DocOcrResult>({
    model: MODELS.default,
    system: DOCUMENT_OCR_SYSTEM,
    user: userContent,
    maxTokens: 1024,
  });

  if (first.confidence >= 0.7) return first;

  // Fallback to the stronger model when sonnet isn't sure.
  return callJson<DocOcrResult>({
    model: MODELS.strong,
    system: DOCUMENT_OCR_SYSTEM,
    user: userContent,
    maxTokens: 1024,
  });
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // Workers global btoa
  return btoa(binary);
}
