import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { ridersRoutes } from "./routes/riders";
import { performanceRoutes } from "./routes/performance";
import { incidentsRoutes } from "./routes/incidents";
import { documentsRoutes } from "./routes/documents";
import { uploadsRoutes } from "./routes/uploads";
import { filesRoutes } from "./routes/files";

const app = new Hono().basePath("/api");

app.onError((err, c) => {
  console.error("[api]", err);
  const status = err instanceof Error && "status" in err ? Number((err as { status: unknown }).status) || 500 : 500;
  return c.json({ error: err instanceof Error ? err.message : "Unknown error" }, status as 500);
});

app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", authRoutes);
app.route("/riders", ridersRoutes);
app.route("/performance", performanceRoutes);
app.route("/incidents", incidentsRoutes);
app.route("/documents", documentsRoutes);
app.route("/uploads", uploadsRoutes);
app.route("/files", filesRoutes);

export { app };
