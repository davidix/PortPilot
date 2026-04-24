import cors from "@fastify/cors";
import Fastify from "fastify";
import { AGENT_DEFAULT_HOST, AGENT_DEFAULT_PORT } from "./types.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerKillRoutes } from "./routes/kill.js";
import { registerScanRoutes } from "./routes/scan.js";

const host = process.env.PORTPILOT_HOST ?? AGENT_DEFAULT_HOST;
const port = Number.parseInt(process.env.PORTPILOT_PORT ?? String(AGENT_DEFAULT_PORT), 10);

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const u = new URL(origin);
        if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
          return cb(null, true);
        }
      } catch {
        // ignore
      }
      if (origin.startsWith("chrome-extension://")) return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
  });

  registerHealthRoutes(app);
  registerScanRoutes(app);
  registerKillRoutes(app);

  await app.listen({ port, host });
  app.log.info(`PortPilot agent listening on http://${host}:${port} (localhost only)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
