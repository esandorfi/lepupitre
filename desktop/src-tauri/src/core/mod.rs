pub mod analysis;
pub mod artifacts;
pub mod asr;
pub mod asr_live;
pub mod asr_models;
pub mod asr_sidecar;
pub mod db;
pub mod db_helpers;
pub mod dsp;
pub mod ids;
pub mod models;
pub mod seed;
pub mod time;
pub mod transcript;
pub mod vad;

pub mod coach {
    pub use crate::domain::coach::*;
}

pub mod feedback {
    pub use crate::domain::feedback::*;
}

pub mod pack {
    pub use crate::domain::exchange::pack::*;
}

pub mod peer_review {
    pub use crate::domain::exchange::peer_review::*;
}

pub mod preferences {
    pub use crate::platform::preferences::*;
}

pub mod run {
    pub use crate::domain::run::*;
}

pub mod outline {
    pub use crate::domain::talk::outline::*;
}

pub mod project {
    pub use crate::domain::talk::project::*;
}

pub mod quest {
    pub use crate::domain::training::quest::*;
}

pub mod recorder {
    pub use crate::domain::recorder::*;
}

pub mod recording {
    pub use crate::domain::recorder::recording::*;
}

pub mod workspace {
    pub use crate::domain::workspace::*;
}
