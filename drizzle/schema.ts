import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

const now = () => Math.floor(Date.now() / 1000);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    role: text("role", { enum: ["manager", "rider"] }).notNull(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    locale: text("locale", { enum: ["en", "ur", "hi", "bn"] }).notNull().default("en"),
    riderId: text("rider_id").references(() => riders.id),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    phoneIdx: uniqueIndex("users_phone_idx").on(t.phone),
    riderIdx: uniqueIndex("users_rider_idx").on(t.riderId),
  }),
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

export const otpCodes = sqliteTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    consumedAt: integer("consumed_at"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => ({
    phoneIdx: index("otp_phone_idx").on(t.phone),
  }),
);

export const riders = sqliteTable(
  "riders",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    nationalId: text("national_id"),
    status: text("status", { enum: ["active", "off", "suspended"] }).notNull().default("active"),
    bikePlate: text("bike_plate"),
    role: text("role"),
    preferredLocale: text("preferred_locale", { enum: ["en", "ur", "hi", "bn"] }).notNull().default("en"),
    joinedAt: integer("joined_at"),
    notes: text("notes"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => ({
    phoneIdx: uniqueIndex("riders_phone_idx").on(t.phone),
    statusIdx: index("riders_status_idx").on(t.status),
  }),
);

export const performanceUploads = sqliteTable("performance_uploads", {
  id: text("id").primaryKey(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  source: text("source").notNull().default("keeta_csv"),
  periodStart: integer("period_start"),
  periodEnd: integer("period_end"),
  r2Key: text("r2_key").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  status: text("status", { enum: ["parsed", "failed", "processing"] }).notNull().default("processing"),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const performanceRows = sqliteTable(
  "performance_rows",
  {
    id: text("id").primaryKey(),
    uploadId: text("upload_id").notNull().references(() => performanceUploads.id, { onDelete: "cascade" }),
    riderId: text("rider_id").references(() => riders.id),
    externalRiderRef: text("external_rider_ref"),
    orders: integer("orders"),
    onTimePct: real("on_time_pct"),
    avgDeliveryMin: real("avg_delivery_min"),
    cancellations: integer("cancellations"),
    customerRating: real("customer_rating"),
    earningsCents: integer("earnings_cents"),
    rawJson: text("raw_json"),
    generatedMessageEn: text("generated_message_en"),
    generatedMessageUr: text("generated_message_ur"),
    generatedMessageHi: text("generated_message_hi"),
    generatedMessageBn: text("generated_message_bn"),
    generatedAt: integer("generated_at"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => ({
    uploadIdx: index("perf_upload_idx").on(t.uploadId),
    riderIdx: index("perf_rider_idx").on(t.riderId),
  }),
);

export const incidents = sqliteTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    riderId: text("rider_id").notNull().references(() => riders.id),
    reportedAt: integer("reported_at").notNull().$defaultFn(now),
    status: text("status", { enum: ["new", "triaged", "closed"] }).notNull().default("new"),
    severity: text("severity", { enum: ["low", "med", "high"] }),
    locationText: text("location_text"),
    lat: real("lat"),
    lng: real("lng"),
    descriptionRaw: text("description_raw"),
    voiceNoteR2Key: text("voice_note_r2_key"),
    thirdPartyInfoJson: text("third_party_info_json"),
    bikeDamageJson: text("bike_damage_json"),
    extractedJson: text("extracted_json"),
    insuranceDraftMd: text("insurance_draft_md"),
    managerAlertMd: text("manager_alert_md"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => ({
    statusIdx: index("incidents_status_idx").on(t.status, t.reportedAt),
    riderIdx: index("incidents_rider_idx").on(t.riderId),
  }),
);

export const incidentPhotos = sqliteTable("incident_photos", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),
  contentType: text("content_type"),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    riderId: text("rider_id").notNull().references(() => riders.id, { onDelete: "cascade" }),
    docType: text("doc_type", { enum: ["iqama", "license", "bike_registration"] }).notNull(),
    r2Key: text("r2_key").notNull(),
    contentType: text("content_type"),
    expiryDate: integer("expiry_date"),
    issuedDate: integer("issued_date"),
    docNumber: text("doc_number"),
    ocrConfidence: real("ocr_confidence"),
    ocrRawJson: text("ocr_raw_json"),
    status: text("status", { enum: ["pending_ocr", "ok", "review_needed", "expired"] })
      .notNull()
      .default("pending_ocr"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => ({
    riderTypeIdx: index("documents_rider_type_idx").on(t.riderId, t.docType),
    expiryIdx: index("documents_expiry_idx").on(t.expiryDate),
  }),
);

export const documentReminders = sqliteTable("document_reminders", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  dueAt: integer("due_at").notNull(),
  kind: text("kind", { enum: ["30d", "7d", "1d"] }).notNull(),
  draftedMessageMd: text("drafted_message_md"),
  sentAt: integer("sent_at"),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  diffJson: text("diff_json"),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  rider: one(riders, { fields: [users.riderId], references: [riders.id] }),
}));

export const ridersRelations = relations(riders, ({ many, one }) => ({
  user: one(users),
  incidents: many(incidents),
  documents: many(documents),
  performanceRows: many(performanceRows),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  rider: one(riders, { fields: [incidents.riderId], references: [riders.id] }),
  photos: many(incidentPhotos),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  rider: one(riders, { fields: [documents.riderId], references: [riders.id] }),
  reminders: many(documentReminders),
}));

export type Rider = typeof riders.$inferSelect;
export type NewRider = typeof riders.$inferInsert;
export type User = typeof users.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type PerformanceRow = typeof performanceRows.$inferSelect;
