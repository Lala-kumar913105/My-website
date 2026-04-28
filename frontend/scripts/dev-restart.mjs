import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

const stopResult = spawnSync("node", [path.join(__dirname, "dev-stop.mjs")], {
  stdio: "inherit",
});

if (stopResult.status !== 0) {
  process.exit(stopResult.status ?? 1);
}

const startProcess = spawn("node", [path.join(__dirname, "dev-safe.mjs"), ...args], {
  stdio: "inherit",
  env: process.env,
});

startProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
