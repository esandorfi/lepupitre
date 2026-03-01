pub struct AsrModelSpec {
    pub id: &'static str,
    pub label: &'static str,
    pub filename: &'static str,
    pub url: &'static str,
    pub sha256: &'static str,
    pub size_bytes: u64,
    pub bundled: bool,
}

const MODEL_SPECS: [AsrModelSpec; 2] = [
    AsrModelSpec {
        id: "tiny",
        label: "Tiny",
        filename: "ggml-tiny.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        sha256: "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
        size_bytes: 77_691_713,
        bundled: false,
    },
    AsrModelSpec {
        id: "base",
        label: "Base",
        filename: "ggml-base.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
        size_bytes: 147_951_465,
        bundled: false,
    },
];

pub fn model_specs() -> &'static [AsrModelSpec] {
    &MODEL_SPECS
}

pub fn model_spec(model_id: &str) -> Option<&'static AsrModelSpec> {
    MODEL_SPECS.iter().find(|spec| spec.id == model_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_specs_are_consistent() {
        let specs = model_specs();
        let mut ids = std::collections::HashSet::new();
        for spec in specs {
            assert!(ids.insert(spec.id), "duplicate model id: {}", spec.id);
            assert!(spec.filename.ends_with(".bin"));
            assert!(spec.url.starts_with("https://"));
            assert!(spec.size_bytes > 0);
            assert_eq!(spec.sha256.len(), 64);
        }
    }
}
