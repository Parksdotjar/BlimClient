#[tauri::command]
fn greet(name: &str) -> String { format!("Welcome to Bloom Client, {name}!") }

#[tauri::command]
async fn request_microsoft_device_code(client_id: String) -> Result<serde_json::Value, String> {
    let response = reqwest::Client::new()
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode")
        .form(&[("client_id", client_id), ("scope", "XboxLive.signin offline_access".to_string())])
        .send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    let body: serde_json::Value = response.json().await.map_err(|error| error.to_string())?;
    if !status.is_success() { return Err(body.get("error_description").and_then(|v| v.as_str()).unwrap_or("Microsoft device authorization failed.").to_string()); }
    Ok(body)
}

async fn read_auth_response(response: reqwest::Response, service: &str) -> Result<serde_json::Value, String> {
    let status = response.status();
    let text = response.text().await.map_err(|error| error.to_string())?;
    let body: serde_json::Value = serde_json::from_str(&text).unwrap_or_else(|_| serde_json::json!({ "raw": text }));
    if !status.is_success() {
        let detail = body.get("Message").or_else(|| body.get("error_description")).or_else(|| body.get("error")).and_then(|value| value.as_str()).unwrap_or("No additional details.");
        return Err(format!("{service} rejected the account (HTTP {status}): {detail}"));
    }
    Ok(body)
}

#[tauri::command]
async fn complete_microsoft_login(client_id: String, device_code: String, interval: u64, expires_in: u64) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(expires_in);
    let mut wait_seconds = interval.max(5);
    let access_token = loop {
        if std::time::Instant::now() >= deadline { return Err("The Microsoft sign-in code expired.".into()); }
        tokio::time::sleep(std::time::Duration::from_secs(wait_seconds)).await;
        let response = client.post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token").form(&[("client_id", client_id.clone()), ("grant_type", "urn:ietf:params:oauth:grant-type:device_code".into()), ("device_code", device_code.clone())]).send().await.map_err(|error| error.to_string())?;
        let body: serde_json::Value = response.json().await.map_err(|error| error.to_string())?;
        if let Some(token) = body.get("access_token").and_then(|v| v.as_str()) { break token.to_string(); }
        match body.get("error").and_then(|v| v.as_str()) { Some("authorization_pending") => continue, Some("slow_down") => { wait_seconds += 5; continue; }, _ => return Err(body.get("error_description").and_then(|v| v.as_str()).unwrap_or("Microsoft sign-in failed.").to_string()) }
    };
    let xbl_response = client.post("https://user.auth.xboxlive.com/user/authenticate").json(&serde_json::json!({"Properties":{"AuthMethod":"RPS","SiteName":"user.auth.xboxlive.com","RpsTicket":format!("d={access_token}")},"RelyingParty":"http://auth.xboxlive.com","TokenType":"JWT"})).send().await.map_err(|error| error.to_string())?;
    let xbl = read_auth_response(xbl_response, "Xbox Live").await?;
    let xsts_response = client.post("https://xsts.auth.xboxlive.com/xsts/authorize").json(&serde_json::json!({"Properties":{"SandboxId":"RETAIL","UserTokens":[xbl["Token"]]},"RelyingParty":"rp://api.minecraftservices.com/","TokenType":"JWT"})).send().await.map_err(|error| error.to_string())?;
    let xsts = read_auth_response(xsts_response, "Xbox security").await?;
    let identity = xsts["DisplayClaims"]["xui"][0]["uhs"].as_str().ok_or("Xbox authentication did not return a user identity.")?;
    let xsts_token = xsts["Token"].as_str().ok_or("Xbox authentication did not return an XSTS token.")?;
    let minecraft_response = client.post("https://api.minecraftservices.com/authentication/login_with_xbox").json(&serde_json::json!({"identityToken":format!("XBL3.0 x={identity};{xsts_token}")})).send().await.map_err(|error| error.to_string())?;
    let minecraft = read_auth_response(minecraft_response, "Minecraft services").await?;
    let minecraft_token = minecraft["access_token"].as_str().ok_or("Minecraft services login failed. Make sure this Microsoft account owns Minecraft.")?;
    let profile_response = client.get("https://api.minecraftservices.com/minecraft/profile").bearer_auth(minecraft_token).send().await.map_err(|error| error.to_string())?;
    let profile = read_auth_response(profile_response, "Minecraft profile").await?;
    if profile.get("id").and_then(|v| v.as_str()).is_none() || profile.get("name").and_then(|v| v.as_str()).is_none() { return Err("No Minecraft profile was found on this account.".into()); }
    Ok(profile)
}

#[derive(serde::Serialize)]
struct JavaInstallation { path: String, major_version: Option<u32>, usable: bool }

#[derive(serde::Deserialize, serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct InstanceConfig {
    id: String, name: String, version: String, directory: String, java: String, memory: u32,
    jvm_arguments: String, mods: bool, resource_packs: bool, shader_packs: bool, config: bool,
    custom_resolution: bool, visible: bool, shortcut: bool,
}

fn bloom_data_dir() -> Result<std::path::PathBuf, String> {
    let appdata = std::env::var("APPDATA").map_err(|_| "APPDATA is unavailable on this computer.".to_string())?;
    let path = std::path::PathBuf::from(appdata).join("BloomClient");
    std::fs::create_dir_all(path.join("instances")).map_err(|error| error.to_string())?;
    Ok(path)
}

fn java_major(path: &str) -> Option<u32> {
    let output = std::process::Command::new(path).arg("-version").output().ok()?;
    let text = format!("{}{}", String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr));
    let quoted = text.split('"').nth(1)?;
    let first = quoted.split('.').next()?;
    if first == "1" { quoted.split('.').nth(1)?.parse().ok() } else { first.parse().ok() }
}

#[tauri::command]
fn detect_java_installations() -> Vec<JavaInstallation> {
    let mut candidates: Vec<String> = Vec::new();
    if let Ok(path) = std::env::var("PATH") { for entry in std::env::split_paths(&path) { let java = entry.join("java.exe"); if java.exists() { candidates.push(java.to_string_lossy().to_string()); } } }
    for root in ["ProgramFiles", "ProgramFiles(x86)"] { if let Ok(base) = std::env::var(root) { for folder in ["Java", "Eclipse Adoptium", "Microsoft"] { let parent = std::path::PathBuf::from(&base).join(folder); if let Ok(entries) = std::fs::read_dir(parent) { for entry in entries.flatten() { let java = entry.path().join("bin").join("java.exe"); if java.exists() { candidates.push(java.to_string_lossy().to_string()); } } } } } }
    candidates.sort(); candidates.dedup();
    candidates.into_iter().map(|path| { let major_version = java_major(&path); JavaInstallation { path, usable: major_version.is_some(), major_version } }).collect()
}

#[tauri::command]
async fn get_minecraft_releases() -> Result<Vec<serde_json::Value>, String> {
    let manifest: serde_json::Value = reqwest::get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").await.map_err(|error| error.to_string())?.json().await.map_err(|error| error.to_string())?;
    Ok(manifest["versions"].as_array().unwrap_or(&Vec::new()).iter().filter(|version| version["type"] == "release").cloned().collect())
}

#[tauri::command]
fn save_instance(config: InstanceConfig) -> Result<InstanceConfig, String> {
    if config.name.trim().is_empty() { return Err("Choose an instance name first.".into()); }
    let mut config = config;
    config.id = config.name.to_lowercase().chars().map(|character| if character.is_ascii_alphanumeric() { character } else { '-' }).collect::<String>().trim_matches('-').to_string();
    if config.id.is_empty() { return Err("Choose an instance name containing letters or numbers.".into()); }
    let game_dir = if config.directory.starts_with(".minecraft") { std::env::var("APPDATA").map_err(|_| "APPDATA is unavailable.".to_string())?.into() } else { std::path::PathBuf::from(&config.directory) };
    let target = if config.directory.starts_with(".minecraft") { game_dir.join(&config.directory) } else { game_dir };
    std::fs::create_dir_all(&target).map_err(|error| error.to_string())?;
    for (enabled, folder) in [(config.mods, "mods"), (config.resource_packs, "resourcepacks"), (config.shader_packs, "shaderpacks"), (config.config, "config")] { if enabled { std::fs::create_dir_all(target.join(folder)).map_err(|error| error.to_string())?; } }
    config.directory = target.to_string_lossy().to_string();
    let path = bloom_data_dir()?.join("instances").join(format!("{}.json", config.id));
    std::fs::write(path, serde_json::to_vec_pretty(&config).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
    Ok(config)
}

#[tauri::command]
fn list_instances() -> Result<Vec<InstanceConfig>, String> {
    let folder = bloom_data_dir()?.join("instances");
    let mut instances = Vec::new();
    for entry in std::fs::read_dir(folder).map_err(|error| error.to_string())?.flatten() { if entry.path().extension().and_then(|extension| extension.to_str()) == Some("json") { if let Ok(bytes) = std::fs::read(entry.path()) { if let Ok(instance) = serde_json::from_slice(&bytes) { instances.push(instance); } } } }
    Ok(instances)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, request_microsoft_device_code, complete_microsoft_login, detect_java_installations, get_minecraft_releases, save_instance, list_instances])
        .run(tauri::generate_context!())
        .expect("error while running Bloom Client");
}
