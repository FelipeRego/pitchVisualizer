import { mkdir, readdir, rename, rm, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const client = resolve(dist, "client");
const server = resolve(dist, "server");

await rm(client, { recursive: true, force: true });
await rm(server, { recursive: true, force: true });
await mkdir(client, { recursive: true });

for (const entry of await readdir(dist)) {
  if (entry === "client" || entry === "server") continue;
  await rename(resolve(dist, entry), resolve(client, entry));
}

await mkdir(server, { recursive: true });
await copyFile(resolve(root, "worker", "index.js"), resolve(server, "index.js"));
