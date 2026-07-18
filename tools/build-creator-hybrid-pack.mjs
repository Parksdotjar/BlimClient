import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = join(ROOT, "modpacks");
const OUTPUT_PACK = join(OUTPUT_DIR, "Bloom-Creator-FPS-Hybrid-1.21.11-v1.0.0.mrpack");
const OUTPUT_REPORT = join(OUTPUT_DIR, "Bloom-Creator-FPS-Hybrid-1.21.11.manifest.json");
const BASE_VERSION_ID = "tC7NXu6R";
const MINECRAFT_VERSION = "1.21.11";

// Compatibility-first additions on top of Fabulously Optimized 12.2.2.
const additions = [
  { slug: "essential", group: "Social and multiplayer" },
  { slug: "ukus-armor-hud", group: "PvP HUD" },
  { slug: "flashback", group: "Creator tools" },
  { slug: "simple-voice-chat", group: "Social and multiplayer" },
  { slug: "nvidium", group: "Performance (NVIDIA only)" },
  { slug: "badoptimizations", group: "Performance" },
  { slug: "threadtweak", group: "Performance" },
  { slug: "krypton", group: "Performance" },
  { slug: "particle-core", group: "Performance" },
  { slug: "fast-ip-ping", group: "Performance" },
  { slug: "freecam", group: "Creator tools" },
  { slug: "camera-utils", group: "Creator tools" },
  { slug: "shulkerboxtooltip", group: "Quality of life" },
  { slug: "chat-heads", group: "Quality of life" },
  { slug: "appleskin", group: "Quality of life" },
  { slug: "mouse-tweaks", group: "Quality of life" },
  { slug: "betterf3", group: "Creator tools" },
  { slug: "totemcounter", group: "PvP HUD" },
  { slug: "potioncounter", group: "PvP HUD" },
  { slug: "bettershields", group: "PvP HUD" },
  { slug: "low-fire-pack", group: "PvP resource packs", type: "resourcepack" },
  { slug: "low-shield-pack", group: "PvP resource packs", type: "resourcepack" },
  { slug: "short-swords-pack", group: "PvP resource packs", type: "resourcepack" },
  { slug: "fresh-animations", group: "Creator resource packs", type: "resourcepack" },
  { slug: "fullbright-ub", group: "Utility resource packs", type: "resourcepack" },
];

const api = async (path) => {
  const response = await fetch(`https://api.modrinth.com/v2${path}`, {
    headers: { "User-Agent": "BloomClient/CreatorHybridPackBuilder" },
  });
  if (!response.ok) throw new Error(`Modrinth ${response.status}: ${path}`);
  return response.json();
};

const download = async (url, destination) => {
  const response = await fetch(url, { headers: { "User-Agent": "BloomClient/CreatorHybridPackBuilder" } });
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${url}`);
  await pipeline(response.body, createWriteStream(destination));
};

const runPowerShell = (script) => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "PowerShell failed");
};

const compatibleVersion = async (project) => {
  const params = new URLSearchParams();
  params.set("game_versions", JSON.stringify([MINECRAFT_VERSION]));
  if (project.project_type === "mod") params.set("loaders", JSON.stringify(["fabric"]));
  const versions = await api(`/project/${project.id}/version?${params}`);
  const sorted = versions.sort((a, b) => Date.parse(b.date_published) - Date.parse(a.date_published));
  return sorted.find((version) => version.version_type === "release") ?? sorted[0];
};

const envValue = (value, fallback) => {
  if (value === "required" || value === "optional" || value === "unsupported") return value;
  return fallback;
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const work = join(tmpdir(), `bloom-creator-hybrid-${Date.now()}`);
const baseArchive = join(work, "base.zip");
const staging = join(work, "staging");
mkdirSync(staging, { recursive: true });

try {
  console.log("Downloading Fabulously Optimized 12.2.2...");
  const baseVersion = await api(`/version/${BASE_VERSION_ID}`);
  const baseFile = baseVersion.files.find((file) => file.primary) ?? baseVersion.files[0];
  await download(baseFile.url, baseArchive);
  runPowerShell(`Expand-Archive -LiteralPath '${baseArchive.replaceAll("'", "''")}' -DestinationPath '${staging.replaceAll("'", "''")}' -Force`);

  const indexPath = join(staging, "modrinth.index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const includedProjectIds = new Set();
  for (const file of index.files) {
    const match = file.downloads?.[0]?.match(/\/data\/([^/]+)\/versions\//);
    if (match) includedProjectIds.add(match[1]);
  }

  const report = [];
  const pending = additions.map((entry) => ({ ...entry, requested: true }));
  const queued = new Set(additions.map((entry) => entry.slug));

  while (pending.length) {
    const entry = pending.shift();
    const project = await api(`/project/${entry.slug}`);
    if (includedProjectIds.has(project.id)) {
      report.push({ title: project.title, slug: project.slug, group: entry.group, status: "provided by base" });
      continue;
    }

    const version = entry.versionId ? await api(`/version/${entry.versionId}`) : await compatibleVersion(project);
    if (!version) throw new Error(`${project.title} has no Fabric ${MINECRAFT_VERSION} release`);
    const file = version.files.find((candidate) => candidate.primary) ?? version.files[0];
    if (!file) throw new Error(`${project.title} version ${version.version_number} has no downloadable file`);

    const folder = project.project_type === "resourcepack" ? "resourcepacks" : "mods";
    index.files.push({
      path: `${folder}/${file.filename}`,
      hashes: { sha1: file.hashes.sha1, sha512: file.hashes.sha512 },
      env: {
        client: envValue(project.client_side, "required"),
        server: envValue(project.server_side, project.project_type === "resourcepack" ? "unsupported" : "optional"),
      },
      downloads: [file.url],
      fileSize: file.size,
    });
    includedProjectIds.add(project.id);
    report.push({
      title: project.title,
      slug: project.slug,
      projectId: project.id,
      version: version.version_number,
      versionId: version.id,
      group: entry.group ?? "Required dependency",
      status: entry.requested ? "added" : "dependency",
      url: `https://modrinth.com/${project.project_type}/${project.slug}`,
    });

    for (const dependency of version.dependencies ?? []) {
      if (dependency.dependency_type !== "required") continue;
      if (dependency.project_id && includedProjectIds.has(dependency.project_id)) continue;
      const dependencyKey = dependency.version_id ?? dependency.project_id;
      if (!dependencyKey || queued.has(dependencyKey)) continue;
      queued.add(dependencyKey);
      const dependencyProject = dependency.project_id
        ? await api(`/project/${dependency.project_id}`)
        : await api(`/version/${dependency.version_id}`).then((item) => api(`/project/${item.project_id}`));
      pending.push({
        slug: dependencyProject.id,
        versionId: dependency.version_id,
        group: `Required by ${project.title}`,
        requested: false,
      });
    }
  }

  index.name = "Bloom Creator FPS Hybrid";
  index.versionId = "1.0.0+1.21.11";
  index.summary = "A compatibility-first Fabric creator, PvP, voice, and FPS pack built on Fabulously Optimized 12.2.2.";
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  const notes = [
    "Bloom Creator FPS Hybrid 1.0.0 for Minecraft 1.21.11",
    "Built on Fabulously Optimized 12.2.2.",
    "",
    "Nvidium activates only on supported NVIDIA GPUs and disables itself when unavailable.",
    "Nvidium also disables itself while Iris shaders are active.",
    "Fresh Animations, Low Fire, Low Shield, Short Swords, and Fullbright are installed as optional resource packs; enable the ones you want in Minecraft.",
    "Flashback is the included replay/recording tool. Do not add ReplayMod alongside it unless you know the two are compatible.",
  ].join("\r\n");
  writeFileSync(join(staging, "overrides", "BLOOM-PACK-NOTES.txt"), notes, "utf8");

  if (existsSync(OUTPUT_PACK)) rmSync(OUTPUT_PACK, { force: true });
  const zipPath = `${OUTPUT_PACK}.zip`;
  if (existsSync(zipPath)) rmSync(zipPath, { force: true });
  const escapedStaging = staging.replaceAll("'", "''");
  const escapedZip = zipPath.replaceAll("'", "''");
  const escapedPack = OUTPUT_PACK.replaceAll("'", "''");
  runPowerShell(`Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; $root='${escapedStaging}'; $archive=[System.IO.Compression.ZipFile]::Open('${escapedZip}',[System.IO.Compression.ZipArchiveMode]::Create); try { Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object { $relative=$_.FullName.Substring($root.Length+1).Replace('\\','/'); [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$_.FullName,$relative,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null } } finally { if ($null -ne $archive) { $archive.Dispose() } }; Move-Item -LiteralPath '${escapedZip}' -Destination '${escapedPack}' -Force`);

  const finalReport = {
    name: index.name,
    version: index.versionId,
    minecraft: MINECRAFT_VERSION,
    fabricLoader: index.dependencies["fabric-loader"],
    base: { name: "Fabulously Optimized", version: "12.2.2", versionId: BASE_VERSION_ID },
    totalManifestFiles: index.files.length,
    additions: report,
  };
  writeFileSync(OUTPUT_REPORT, `${JSON.stringify(finalReport, null, 2)}\n`, "utf8");
  console.log(`Created ${OUTPUT_PACK}`);
  console.log(`Manifest files: ${index.files.length}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
