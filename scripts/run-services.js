const { spawn } = require("child_process");

const rootDir = require("path").resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

let shuttingDown = false;
const children = [];

function log(message) {
  process.stdout.write(`[runner] ${message}\n`);
}

function spawnProcess(label, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    log(`${label} exited with ${reason}`);

    if (!shuttingDown) {
      shuttingDown = true;
      process.exit(code ?? 0);
    }
  });

  return child;
}

function attachShutdownHandlers() {
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGINT");
      }
    }

    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function main() {
  attachShutdownHandlers();

  log("Starting bot...");
  spawnProcess("bot", npmCommand, ["run", "start:bot"], rootDir);
}

main();
