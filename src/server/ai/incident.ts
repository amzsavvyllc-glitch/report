import type Anthropic from "@anthropic-ai/sdk";
import { callJson, MODELS } from "./client";
import { INCIDENT_EXTRACT_SYSTEM } from "./prompts/incident-extract";

export interface IncidentExtraction {
  incident_type: string;
  severity: "low" | "med" | "high";
  location_text: string | null;
  happened_at_iso: string | null;
  third_party_info: {
    vehicle_plate: string | null;
    vehicle_description: string | null;
    driver_name: string | null;
    driver_contact: string | null;
    witnesses: string[];
  };
  bike_damage: {
    severity: "none" | "minor" | "major" | "totaled";
    parts: string[];
    drivable: boolean | null;
  };
  injuries: {
    rider: "none" | "minor" | "serious" | "unknown";
    others: "none" | "minor" | "serious" | "unknown";
    notes: string | null;
  };
  recommended_action: string;
  insurance_draft_md: string;
  manager_alert_md: string;
  confidence: number;
  warnings: string[];
}

export async function extractIncident(opts: {
  description: string;
  images: { bytes: ArrayBuffer; contentType: string }[];
}): Promise<IncidentExtraction> {
  const content: Anthropic.MessageParam["content"] = [
    ...opts.images.map<Anthropic.ImageBlockParam>((img) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: img.contentType as Anthropic.Base64ImageSource["media_type"],
        data: arrayBufferToBase64(img.bytes),
      },
    })),
    {
      type: "text",
      text: `Rider's description:\n\n${opts.description}\n\nExtract per schema.`,
    },
  ];

  return callJson<IncidentExtraction>({
    model: MODELS.default,
    system: INCIDENT_EXTRACT_SYSTEM,
    user: content,
    maxTokens: 3000,
    temperature: 0.2,
  });
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
