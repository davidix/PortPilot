import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/api/health", async () => ({
    ok: true,
    service: "portpilot-agent",
    time: new Date().toISOString(),
  }));
}
