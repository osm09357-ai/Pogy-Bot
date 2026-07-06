pogyclient@2.0.1 start
> node scripts/run-services.js start
[runner] Starting bot and dashboard in production mode...
npm warn config production Use `--omit=dev` instead.
npm warn config production Use `--omit=dev` instead.
> pogyclient@2.0.1 start:dashboard
> npm --prefix dashboard run start
> pogyclient@2.0.1 start:bot
> node index.js
> node server.js
[07.07.2026 / 01:06 AM]: SHARD Cluster 0 launched
[07.07.2026 / 01:06 AM]: SHARD Status server listening on 0.0.0.0:8080
[dashboard] Port 8080 is already in use, so Zenith cannot start.
[dashboard] Find it: Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess
[dashboard] Stop it: Stop-Process -Id <PID> -Force
[runner] dashboard exited with code 1
npm warn config production Use `--omit=dev` instead.
> zenith-dashboard@0.0.0 start
npm warn config production Use `--omit=dev` instead.
> pogyclient@2.0.1 start
> node scripts/run-services.js start
[runner] Starting bot and dashboard in production mode...
[dashboard] Find it: Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess
[dashboard] Stop it: Stop-Process -Id <PID> -Force
npm warn config production Use `--omit=dev` instead.
npm warn config production Use `--omit=dev` instead.
npm warn config production Use `--omit=dev` instead.
> pogyclient@2.0.1 start:bot
> node server.js
> zenith-dashboard@0.0.0 start
[07.07.2026 / 01:06 AM]: SHARD Status server listening on 0.0.0.0:8080
[07.07.2026 / 01:06 AM]: SHARD Cluster 0 launched
[dashboard] Port 8080 is already in use, so Zenith cannot start.
> node index.js
> pogyclient@2.0.1 start:dashboard
> npm --prefix dashboard run start
[    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(dashboardDir, ".env"));

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
      for (const activeChild of children) {
        if (!activeChild.killed) {
          activeChild.kill("SIGINT");
        }
      }
      process.exit(code ?? 0);
    }
  });

  return child;
}

let shuttingDown = false;

async function ensureDashboardBuild() {
  if (mode !== "start") return;
  if (fs.existsSync(dashboardBuildId)) return;

  log("Dashboard build not found. Building dashboard before startup...");

  await new Promise((resolve, reject) => {
    const build = spawn(npmCommand, ["run", "build"], {
      cwd: dashboardDir,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    build.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Dashboard build failed with code ${code}`));
    });
  });
}

function attachShutdownHandlers() {
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`Received ${signal}. Stopping bot and dashboard...`);
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGINT");
      }
    }
    setTimeout(() => process.exit(0), 500);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main() {
  attachShutdownHandlers();
  await ensureDashboardBuild();

  if (mode === "dev") {
    log("Starting bot and dashboard in development mode...");
    spawnProcess("bot", npmCommand, ["run", "dev:bot"], rootDir);
    spawnProcess("dashboard", npmCommand, ["run", "dev:dashboard"], rootDir);
    return;
  }

  log("Starting bot and dashboard in production mode...");
  spawnProcess("bot", npmCommand, ["run", "start:bot"], rootDir);
  spawnProcess("dashboard", npmCommand, ["run", "start:dashboard"], rootDir);
}

main().catch((error) => {
  console.error("[runner] Startup failed:", error);
  process.exit(1);
});
