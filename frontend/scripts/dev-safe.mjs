import fs from "node:fs";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const localNextBinPath = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const nextLockPath = path.join(projectRoot, ".next", "dev", "lock");
const pidFilePath = path.join(projectRoot, ".next", "dev-safe.pid");
const args = process.argv.slice(2);

const isProcessAlive = (pid) => {
  if (!pid || Number.isNaN(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
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
          pid: line.slice(0, firstSpace),
          cmd: line.slice(firstSpace + 1),
        };
      })
      .filter(
        ({ cmd }) =>
          cmd.includes("next dev") &&
          (cmd.includes(`${path.sep}frontend`) || cmd.includes(" --prefix frontend ")),
      )
      .map(({ pid }) => Number(pid));
  } catch {
    return [];
  }
};

const ensureSingleInstance = () => {
  if (!fs.existsSync(pidFilePath)) return;

  const existingPid = Number(fs.readFileSync(pidFilePath, "utf8").trim());
  if (isProcessAlive(existingPid)) {
    console.error(
      `Another frontend dev-safe session is already running (PID ${existingPid}). Stop it before starting a new one.`,
    );
    process.exit(1);
  }

  fs.rmSync(pidFilePath, { force: true });
};

const clearStaleNextLock = () => {
  if (!fs.existsSync(nextLockPath)) return;

  const activeFrontendNextDev = getFrontendNextDevPids();
  if (activeFrontendNextDev.length > 0) {
    console.error(
      `Found an active frontend Next dev process (${activeFrontendNextDev.join(", ")}). Refusing to remove .next lock.`,
    );
    process.exit(1);
  }

  fs.rmSync(nextLockPath, { force: true });
  console.log("Removed stale frontend/.next/dev/lock");
};

const cleanupPidFile = () => {
  fs.rmSync(pidFilePath, { force: true });
};

ensureSingleInstance();
clearStaleNextLock();

if (args.includes("--preflight")) {
  console.log("Preflight checks passed (single instance + lock cleanup).");
  process.exit(0);
}

fs.mkdirSync(path.dirname(pidFilePath), { recursive: true });
fs.writeFileSync(pidFilePath, String(process.pid));

if (!fs.existsSync(localNextBinPath)) {
  console.error(
    "Could not find frontend-local Next.js binary at frontend/node_modules/next/dist/bin/next. Run `npm --prefix frontend install` first.",
  );
  cleanupPidFile();
  process.exit(1);
}

const nextProc = spawn(process.execPath, [localNextBinPath, "dev", ...args], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

nextProc.on("exit", (code, signal) => {
  cleanupPidFile();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!nextProc.killed) nextProc.kill(signal);
    cleanupPidFile();
  });
}
