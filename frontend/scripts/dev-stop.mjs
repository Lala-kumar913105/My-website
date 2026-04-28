import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const nextLockPath = path.join(projectRoot, ".next", "dev", "lock");
const pidFilePath = path.join(projectRoot, ".next", "dev-safe.pid");

const isProcessAlive = (pid) => {
  if (!pid || Number.isNaN(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
};

const waitForExit = async (pid, timeoutMs = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isProcessAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return !isProcessAlive(pid);
};

const getFrontendNextDevPids = () => {
  try {
    const output = execSync("ps -eo pid,args", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const firstSpace = line.indexOf(" ");
        return {
          pid: Number(line.slice(0, firstSpace)),
          cmd: line.slice(firstSpace + 1),
        };
      })
      .filter(
        ({ cmd }) =>
          cmd.includes("next dev") &&
          (cmd.includes(`${path.sep}frontend`) || cmd.includes(" --prefix frontend ")),
      )
      .map(({ pid }) => pid)
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
};

const stopPid = async (pid, reasonLabel) => {
  if (!isProcessAlive(pid)) return false;

  console.log(`Stopping ${reasonLabel} (PID ${pid})...`);
  process.kill(pid, "SIGTERM");

  const exited = await waitForExit(pid);
  if (exited) {
    console.log(`Stopped PID ${pid}.`);
    return true;
  }

  console.warn(`PID ${pid} did not exit in time. Sending SIGKILL...`);
  process.kill(pid, "SIGKILL");
  return true;
};

const run = async () => {
  let stoppedAny = false;

  if (fs.existsSync(pidFilePath)) {
    const pid = Number(fs.readFileSync(pidFilePath, "utf8").trim());
    if (Number.isInteger(pid) && pid > 0) {
      stoppedAny = (await stopPid(pid, "frontend dev-safe process")) || stoppedAny;
    }
    fs.rmSync(pidFilePath, { force: true });
  }

  const strayPids = getFrontendNextDevPids();
  for (const pid of strayPids) {
    stoppedAny = (await stopPid(pid, "stray frontend next dev process")) || stoppedAny;
  }

  if (fs.existsSync(nextLockPath)) {
    const remaining = getFrontendNextDevPids();
    if (remaining.length === 0) {
      fs.rmSync(nextLockPath, { force: true });
      console.log("Removed stale frontend/.next/dev/lock");
    }
  }

  if (!stoppedAny) {
    console.log("No running frontend dev process found.");
  }
};

run().catch((error) => {
  console.error("Failed to stop frontend dev process:", error);
  process.exit(1);
});
