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
    let xbl: serde_json::Value = client.post("https://user.auth.xboxlive.com/user/authenticate").json(&serde_json::json!({"Properties":{"AuthMethod":"RPS","SiteName":"user.auth.xboxlive.com","RpsTicket":format!("d={access_token}")},"RelyingParty":"http://auth.xboxlive.com","TokenType":"JWT"})).send().await.map_err(|error| error.to_string())?.json().await.map_err(|error| error.to_string())?;
    let xsts: serde_json::Value = client.post("https://xsts.auth.xboxlive.com/xsts/authorize").json(&serde_json::json!({"Properties":{"SandboxId":"RETAIL","UserTokens":[xbl["Token"]]},"RelyingParty":"rp://api.minecraftservices.com/","TokenType":"JWT"})).send().await.map_err(|error| error.to_string())?.json().await.map_err(|error| error.to_string())?;
    let identity = xsts["DisplayClaims"]["xui"][0]["uhs"].as_str().ok_or("Xbox authentication did not return a user identity.")?;
    let xsts_token = xsts["Token"].as_str().ok_or("Xbox authentication did not return an XSTS token.")?;
    let minecraft: serde_json::Value = client.post("https://api.minecraftservices.com/authentication/login_with_xbox").json(&serde_json::json!({"identityToken":format!("XBL3.0 x={identity};{xsts_token}")})).send().await.map_err(|error| error.to_string())?.json().await.map_err(|error| error.to_string())?;
    let minecraft_token = minecraft["access_token"].as_str().ok_or("Minecraft services login failed. Make sure this Microsoft account owns Minecraft.")?;
    let profile: serde_json::Value = client.get("https://api.minecraftservices.com/minecraft/profile").bearer_auth(minecraft_token).send().await.map_err(|error| error.to_string())?.json().await.map_err(|error| error.to_string())?;
    if profile.get("id").and_then(|v| v.as_str()).is_none() || profile.get("name").and_then(|v| v.as_str()).is_none() { return Err("No Minecraft profile was found on this account.".into()); }
    Ok(profile)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, request_microsoft_device_code, complete_microsoft_login])
        .run(tauri::generate_context!())
        .expect("error while running Bloom Client");
}
