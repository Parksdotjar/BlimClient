fn main() {
    println!("cargo:rerun-if-env-changed=BLOOM_BACKEND_URL");
    tauri_build::build()
}
