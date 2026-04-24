import type { FastifyInstance } from "fastify";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function killEnabled(): boolean {
  return process.env.PORTPILOT_ENABLE_KILL === "true";
}

/**
 * Optional kill route — disabled unless PORTPILOT_ENABLE_KILL=true.
 * Requires JSON body `{ "confirm": true }` (never implicit).
 */
export function registerKillRoutes(app: FastifyInstance): void {
  app.post<{ Params: { pid: string }; Body: { confirm?: boolean } }>(
    "/api/process/:pid/kill",
    async (request, reply) => {
      if (!killEnabled()) {
        return reply.code(403).send({
          ok: false,
          error: "Kill is disabled. Set PORTPILOT_ENABLE_KILL=true to allow explicit kills.",
        });
      }

      const pid = Number.parseInt(request.params.pid, 10);
      if (Number.isNaN(pid) || pid <= 0) {
        return reply.code(400).send({ ok: false, error: "Invalid PID" });
      }

      if (request.body?.confirm !== true) {
        return reply.code(400).send({
          ok: false,
          error: 'Refusing to kill without JSON body { "confirm": true }.',
        });
      }

      try {
        // SIGTERM first — userland, no sudo
        await execFileAsync("kill", ["-TERM", String(pid)]);
        return { ok: true, pid, signal: "SIGTERM" };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.code(500).send({ ok: false, error: message });
      }
    },
  );
}
