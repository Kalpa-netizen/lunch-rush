import express from "express";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { attachGame } from "./network.js";
import { getLeaderboard } from "./leaderboard.js";
const root = fileURLToPath(new URL("..", import.meta.url));
const app = express(),
  http = createServer(app),
  port = Number(process.env.PORT || 3000);
const addresses = () => Object.values(networkInterfaces())
  .flat()
  .filter((i) => i.family === "IPv4" && !i.internal)
  .map((i) => `http://${i.address}:${port}`);
const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, "");
if (publicUrl && !/^https?:\/\//.test(publicUrl))
  throw Error("PUBLIC_URL must start with http:// or https://");
app.get("/api/network", (req, res) => res.json({ publicUrl, addresses: addresses() }));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/leaderboard", (req, res) =>
  res.json(getLeaderboard(req.query.date)),
);
const game = attachGame(http);
if (process.argv.includes("--dev")) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true, hmr: { server: http } },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
}
http.listen(port, "0.0.0.0", () =>
  console.log(
    `LUNCH RUSH TV: http://localhost:${port}\nPhone / LAN: ${publicUrl || addresses().join(", ") || "No LAN address detected"}\nKeep this process running. Devices must share a reachable network.`,
  ),
);
process.on("SIGTERM", async () => {
  await game.close();
  process.exit(0);
});
