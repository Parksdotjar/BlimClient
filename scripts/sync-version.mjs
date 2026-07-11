import { readFileSync, writeFileSync } from "node:fs";

const releaseVersion = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(releaseVersion)) {
  throw new Error(`VERSION must be a valid release tag such as v1.0.1; received ${releaseVersion}`);
}

const version = releaseVersion.slice(1);
const root = new URL("../", import.meta.url);
const updateJson = (path) => {
  const url = new URL(path, root);
  const value = JSON.parse(readFileSync(url, "utf8"));
  value.version = version;
  writeFileSync(url, `${JSON.stringify(value, null, 2)}\n`);
};

updateJson("package.json");
updateJson("package-lock.json");
updateJson("src-tauri/tauri.conf.json");

const cargoUrl = new URL("src-tauri/Cargo.toml", root);
const cargo = readFileSync(cargoUrl, "utf8").replace(
  /(^\[package\][\s\S]*?^version\s*=\s*")[^"]+("$)/m,
  `$1${version}$2`,
);
writeFileSync(cargoUrl, cargo);

console.log(`Bloom Client release version synchronized to ${releaseVersion}.`);
