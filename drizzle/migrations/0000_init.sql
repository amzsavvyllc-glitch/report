-- Generated initial schema. Regenerate with: pnpm db:generate
-- Apply locally: pnpm db:migrate:local
-- Apply to deployed D1: pnpm db:migrate:remote

CREATE TABLE `users` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `role` TEXT NOT NULL,
  `email` TEXT,
  `phone` TEXT,
  `password_hash` TEXT,
  `locale` TEXT NOT NULL DEFAULT 'en',
  `rider_id` TEXT REFERENCES `riders`(`id`),
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
CREATE UNIQUE INDEX `users_email_idx` ON `users`(`email`);
CREATE UNIQUE INDEX `users_phone_idx` ON `users`(`phone`);
CREATE UNIQUE INDEX `users_rider_idx` ON `users`(`rider_id`);

CREATE TABLE `sessions` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `user_id` TEXT NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `expires_at` INTEGER NOT NULL
);

CREATE TABLE `otp_codes` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `phone` TEXT NOT NULL,
  `code_hash` TEXT NOT NULL,
  `expires_at` INTEGER NOT NULL,
  `consumed_at` INTEGER,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `created_at` INTEGER NOT NULL
);
CREATE INDEX `otp_phone_idx` ON `otp_codes`(`phone`);

CREATE TABLE `riders` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `full_name` TEXT NOT NULL,
  `phone` TEXT NOT NULL,
  `national_id` TEXT,
  `status` TEXT NOT NULL DEFAULT 'active',
  `bike_plate` TEXT,
  `role` TEXT,
  `preferred_locale` TEXT NOT NULL DEFAULT 'en',
  `joined_at` INTEGER,
  `notes` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
CREATE UNIQUE INDEX `riders_phone_idx` ON `riders`(`phone`);
CREATE INDEX `riders_status_idx` ON `riders`(`status`);

CREATE TABLE `performance_uploads` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `uploaded_by` TEXT NOT NULL REFERENCES `users`(`id`),
  `source` TEXT NOT NULL DEFAULT 'keeta_csv',
  `period_start` INTEGER,
  `period_end` INTEGER,
  `r2_key` TEXT NOT NULL,
  `row_count` INTEGER NOT NULL DEFAULT 0,
  `status` TEXT NOT NULL DEFAULT 'processing',
  `created_at` INTEGER NOT NULL
);

CREATE TABLE `performance_rows` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `upload_id` TEXT NOT NULL REFERENCES `performance_uploads`(`id`) ON DELETE CASCADE,
  `rider_id` TEXT REFERENCES `riders`(`id`),
  `external_rider_ref` TEXT,
  `orders` INTEGER,
  `on_time_pct` REAL,
  `avg_delivery_min` REAL,
  `cancellations` INTEGER,
  `customer_rating` REAL,
  `earnings_cents` INTEGER,
  `raw_json` TEXT,
  `generated_message_en` TEXT,
  `generated_message_ur` TEXT,
  `generated_message_hi` TEXT,
  `generated_message_bn` TEXT,
  `generated_at` INTEGER,
  `created_at` INTEGER NOT NULL
);
CREATE INDEX `perf_upload_idx` ON `performance_rows`(`upload_id`);
CREATE INDEX `perf_rider_idx` ON `performance_rows`(`rider_id`);

CREATE TABLE `incidents` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `rider_id` TEXT NOT NULL REFERENCES `riders`(`id`),
  `reported_at` INTEGER NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'new',
  `severity` TEXT,
  `location_text` TEXT,
  `lat` REAL,
  `lng` REAL,
  `description_raw` TEXT,
  `voice_note_r2_key` TEXT,
  `third_party_info_json` TEXT,
  `bike_damage_json` TEXT,
  `extracted_json` TEXT,
  `insurance_draft_md` TEXT,
  `manager_alert_md` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
CREATE INDEX `incidents_status_idx` ON `incidents`(`status`, `reported_at`);
CREATE INDEX `incidents_rider_idx` ON `incidents`(`rider_id`);

CREATE TABLE `incident_photos` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `incident_id` TEXT NOT NULL REFERENCES `incidents`(`id`) ON DELETE CASCADE,
  `r2_key` TEXT NOT NULL,
  `content_type` TEXT,
  `created_at` INTEGER NOT NULL
);

CREATE TABLE `documents` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `rider_id` TEXT NOT NULL REFERENCES `riders`(`id`) ON DELETE CASCADE,
  `doc_type` TEXT NOT NULL,
  `r2_key` TEXT NOT NULL,
  `content_type` TEXT,
  `expiry_date` INTEGER,
  `issued_date` INTEGER,
  `doc_number` TEXT,
  `ocr_confidence` REAL,
  `ocr_raw_json` TEXT,
  `status` TEXT NOT NULL DEFAULT 'pending_ocr',
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
CREATE INDEX `documents_rider_type_idx` ON `documents`(`rider_id`, `doc_type`);
CREATE INDEX `documents_expiry_idx` ON `documents`(`expiry_date`);

CREATE TABLE `document_reminders` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `document_id` TEXT NOT NULL REFERENCES `documents`(`id`) ON DELETE CASCADE,
  `due_at` INTEGER NOT NULL,
  `kind` TEXT NOT NULL,
  `drafted_message_md` TEXT,
  `sent_at` INTEGER,
  `created_at` INTEGER NOT NULL
);

CREATE TABLE `audit_log` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `actor_user_id` TEXT REFERENCES `users`(`id`),
  `action` TEXT NOT NULL,
  `entity` TEXT NOT NULL,
  `entity_id` TEXT NOT NULL,
  `diff_json` TEXT,
  `created_at` INTEGER NOT NULL
);
