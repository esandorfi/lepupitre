# SPEC — Tauri Voice Recorder

> **Objectif** : Application desktop d'enregistrement vocal performante.
> **Stack** : Tauri 2 (Rust) · Vue 3 · Nuxt UI 3 · Web Audio API · cpal · Opus
> **Cibles** : macOS, Windows, Linux

---

## 1. Vue d'ensemble

Application desktop légère permettant d'enregistrer, visualiser et gérer des mémos vocaux. L'interface Vue 3 communique avec un backend Rust via le bridge IPC de Tauri. Tout le traitement audio lourd (capture, encodage, I/O disque) reste côté Rust pour garantir une latence < 20ms et zéro freeze UI.

### 1.1 Principes architecturaux

- **Separation of concerns** : le WebView ne fait QUE du rendu. Zéro traitement audio côté JS.
- **Lock-free audio** : le thread audio cpal écrit dans un ring buffer, jamais de mutex sur le hot path.
- **IPC minimal** : les samples sont downsamplés (Float32 → u8, 128 points max) et envoyés par batch toutes les 50ms.
- **Async I/O** : toute écriture disque passe par `tokio::fs`, jamais de blocage du thread principal Rust.

---

## 2. Structure du projet

```
voice-recorder/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json          # permissions IPC
│   ├── src/
│   │   ├── main.rs               # entry point Tauri
│   │   ├── lib.rs                 # module exports
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── recording.rs      # start, stop, pause, resume
│   │   │   └── playback.rs       # play, stop, seek
│   │   ├── audio/
│   │   │   ├── mod.rs
│   │   │   ├── engine.rs         # AudioEngine (cpal stream)
│   │   │   ├── ring_buffer.rs    # lock-free SPSC ring buffer
│   │   │   ├── encoder.rs        # Opus encoder wrapper
│   │   │   └── decoder.rs        # Opus decoder pour playback natif
│   │   ├── storage/
│   │   │   ├── mod.rs
│   │   │   ├── file_manager.rs   # CRUD fichiers audio (tokio::fs)
│   │   │   └── metadata.rs       # index JSON des enregistrements
│   │   └── state.rs              # AppState (Mutex<InnerState>)
├── app/                          # Nuxt 3 app
│   ├── nuxt.config.ts
│   ├── app.vue
│   ├── composables/
│   │   ├── useRecorder.ts        # invoke() wrapper recording
│   │   ├── usePlayback.ts        # invoke() wrapper playback
│   │   ├── useWaveform.ts        # canvas rendering logic
│   │   └── useAudioEvents.ts     # listen() pour events Tauri
│   ├── stores/
│   │   └── recordings.ts         # Pinia store
│   ├── components/
│   │   ├── RecorderCard.vue      # UCard principal
│   │   ├── WaveformCanvas.vue    # canvas live waveform
│   │   ├── RecordingControls.vue # boutons rec/pause/stop
│   │   ├── RecordingsTable.vue   # UTable liste
│   │   ├── PlaybackWaveform.vue  # mini waveform par ligne
│   │   └── TimerDisplay.vue      # affichage chrono
│   ├── layouts/
│   │   └── default.vue
│   └── pages/
│       └── index.vue
├── package.json
└── README.md
```

---

## 3. Backend Rust — Modules détaillés

### 3.1 `audio/engine.rs` — AudioEngine

```
Responsabilité : gérer le stream cpal (input device).
```

- Initialiser le device audio par défaut via `cpal::default_host().default_input_device()`.
- Configurer le stream en `f32`, mono, 48kHz.
- Le callback `data_callback` écrit les samples dans le `RingBuffer` (SPSC lock-free).
- Exposer les méthodes : `start()`, `stop()`, `pause()`, `resume()`.
- Sur `pause()` : le stream continue à tourner mais les samples sont ignorés (flag atomique `is_paused: AtomicBool`).
- Sur `stop()` : drop le stream, flush le ring buffer vers l'encodeur.

**Contrainte perf** : le callback cpal tourne sur un thread temps-réel. AUCUNE allocation, AUCUN lock, AUCUN I/O dans ce callback. Uniquement écriture dans le ring buffer.

### 3.2 `audio/ring_buffer.rs` — RingBuffer SPSC

```
Responsabilité : transfert lock-free entre thread audio et thread principal.
```

- Implémenter un Single-Producer Single-Consumer ring buffer.
- Utiliser `rtrb` (crate) ou implémentation custom avec `AtomicUsize` pour head/tail.
- Capacité : 48000 samples (1 seconde de buffer à 48kHz).
- Le producer (callback cpal) fait `push` sans bloquer.
- Le consumer (thread encodeur) fait `pop` par batch de ~960 samples (20ms).
- Si le buffer est plein → les samples sont droppés (pas de blocage du thread audio).

### 3.3 `audio/encoder.rs` — Encoder Opus

```
Responsabilité : encoder les samples PCM en Opus, écrire dans un fichier .ogg.
```

- Utiliser la crate `opus` pour l'encodage.
- Spawner un thread dédié (`std::thread::spawn`) qui :
  1. Lit le ring buffer par chunks de 960 samples (20ms à 48kHz).
  2. Encode chaque chunk en Opus (bitrate 64kbps, mode VOIP).
  3. Pousse les packets encodés dans un channel `tokio::sync::mpsc`.
- Un autre task tokio lit le channel et écrit les packets dans le fichier via `tokio::fs`.
- Exposer : `start_encoding(ring_buffer, file_path)` → `JoinHandle`.
- Sur stop : signal via `AtomicBool`, le thread flush et se termine proprement.

### 3.4 `audio/decoder.rs` — Decoder (playback natif)

```
Responsabilité : décoder les fichiers .ogg/opus pour le playback côté Rust.
```

- Utiliser `symphonia` ou `rodio` pour le playback.
- `rodio` est préféré car il intègre le décodage et le playback cpal en une seule API.
- Exposer : `play(file_path)`, `pause()`, `resume()`, `stop()`, `seek(position_ms)`.
- Émettre un event Tauri `audio:playback-progress` toutes les 100ms avec la position courante.
- Émettre `audio:playback-ended` quand le fichier est terminé.

### 3.5 `storage/file_manager.rs` — FileManager

```
Responsabilité : gestion des fichiers audio sur disque.
```

- Stocker les fichiers dans `app_data_dir/recordings/`.
- Nommage : `rec_{timestamp_ms}.ogg`.
- Toutes les opérations via `tokio::fs` : `create`, `remove`, `read_dir`, `rename`.
- Exposer : `save(data) → PathBuf`, `delete(id)`, `list() → Vec<RecordingFile>`, `get_path(id) → PathBuf`.

### 3.6 `storage/metadata.rs` — Metadata Index

```
Responsabilité : index JSON des enregistrements avec métadonnées.
```

- Fichier : `app_data_dir/recordings/index.json`.
- Structure :

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct RecordingMeta {
    pub id: String,            // UUID v4
    pub name: String,          // "Recording 1"
    pub filename: String,      // "rec_1710000000000.ogg"
    pub duration_ms: u64,
    pub sample_rate: u32,
    pub created_at: String,    // ISO 8601
    pub file_size_bytes: u64,
    pub waveform_peaks: Vec<u8>, // 80 peaks pré-calculés pour affichage
}
```

- Les `waveform_peaks` sont calculés à l'encodage final (80 points normalisés 0-255).
- Exposer : `add(meta)`, `remove(id)`, `update(id, patch)`, `list() → Vec<RecordingMeta>`, `load()`, `save()`.

### 3.7 `state.rs` — AppState

```rust
pub struct AppState {
    pub inner: Mutex<InnerState>,
}

pub struct InnerState {
    pub is_recording: bool,
    pub is_paused: bool,
    pub current_recording_id: Option<String>,
    pub playback_id: Option<String>,
    pub elapsed_ms: u64,
    pub metadata_index: Vec<RecordingMeta>,
}
```

- Managé par Tauri : `app.manage(AppState::default())`.
- Les commands accèdent via `State<'_, AppState>`.
- Le `Mutex` est un `tokio::sync::Mutex` pour être compatible async.

### 3.8 `commands/recording.rs` — Commandes IPC

```rust
#[tauri::command]
async fn start_recording(state: State<'_, AppState>, app: AppHandle) -> Result<String, String>

#[tauri::command]
async fn stop_recording(state: State<'_, AppState>, app: AppHandle) -> Result<RecordingMeta, String>

#[tauri::command]
async fn pause_recording(state: State<'_, AppState>) -> Result<(), String>

#[tauri::command]
async fn resume_recording(state: State<'_, AppState>) -> Result<(), String>
```

**Flow `start_recording`** :
1. Générer un UUID pour l'enregistrement.
2. Résoudre le path fichier via `FileManager`.
3. Créer l'`AudioEngine`, démarrer le stream cpal.
4. Spawner le thread encodeur connecté au ring buffer.
5. Spawner un task timer qui émet `audio:elapsed` toutes les 100ms.
6. Spawner un task qui lit le ring buffer, downsample à 128 points, et émet `audio:samples` toutes les 50ms pour la waveform live.
7. Mettre à jour le state.
8. Retourner l'`id`.

**Flow `stop_recording`** :
1. Signaler l'arrêt au thread audio (AtomicBool).
2. Attendre le flush de l'encodeur.
3. Calculer les waveform_peaks finaux.
4. Créer le `RecordingMeta`, l'ajouter à l'index.
5. Sauvegarder l'index JSON.
6. Retourner le `RecordingMeta`.

### 3.9 `commands/playback.rs` — Commandes IPC

```rust
#[tauri::command]
async fn play_recording(id: String, state: State<'_, AppState>, app: AppHandle) -> Result<(), String>

#[tauri::command]
async fn stop_playback(state: State<'_, AppState>) -> Result<(), String>

#[tauri::command]
async fn seek_playback(position_ms: u64, state: State<'_, AppState>) -> Result<(), String>

#[tauri::command]
async fn delete_recording(id: String, state: State<'_, AppState>) -> Result<(), String>

#[tauri::command]
async fn rename_recording(id: String, new_name: String, state: State<'_, AppState>) -> Result<(), String>

#[tauri::command]
async fn list_recordings(state: State<'_, AppState>) -> Result<Vec<RecordingMeta>, String>
```

---

## 4. Events Tauri (Rust → Frontend)

| Event                    | Payload                          | Fréquence  | Usage                        |
|--------------------------|----------------------------------|------------|------------------------------|
| `audio:samples`          | `{ samples: number[] }`         | 50ms       | Waveform live (128 u8 vals)  |
| `audio:elapsed`          | `{ elapsed_ms: number }`        | 100ms      | Timer du recorder            |
| `audio:recording-stopped`| `RecordingMeta`                  | Ponctuel   | Ajout à la liste             |
| `audio:playback-progress`| `{ id: string, position_ms: number, duration_ms: number }` | 100ms | Progression lecture |
| `audio:playback-ended`   | `{ id: string }`                 | Ponctuel   | Reset UI playback            |
| `audio:error`            | `{ message: string }`           | Ponctuel   | Toast d'erreur               |

**Émission côté Rust** :
```rust
app.emit("audio:samples", SamplesPayload { samples: downsampled }).unwrap();
```

---

## 5. Frontend Vue 3 — Composants détaillés

### 5.1 `composables/useRecorder.ts`

```typescript
export function useRecorder() {
  const isRecording = ref(false)
  const isPaused = ref(false)
  const elapsedMs = ref(0)
  const liveSamples = ref<number[]>([])

  async function start() {
    const id = await invoke<string>('start_recording')
    isRecording.value = true
    isPaused.value = false
    return id
  }

  async function stop(): Promise<RecordingMeta> {
    const meta = await invoke<RecordingMeta>('stop_recording')
    isRecording.value = false
    isPaused.value = false
    elapsedMs.value = 0
    liveSamples.value = []
    return meta
  }

  async function pause() { /* invoke pause_recording */ }
  async function resume() { /* invoke resume_recording */ }

  return { isRecording, isPaused, elapsedMs, liveSamples, start, stop, pause, resume }
}
```

### 5.2 `composables/useAudioEvents.ts`

```typescript
export function useAudioEvents() {
  const recorder = useRecorder()
  const store = useRecordingsStore()

  onMounted(() => {
    listen<{ samples: number[] }>('audio:samples', (event) => {
      recorder.liveSamples.value = event.payload.samples
    })

    listen<{ elapsed_ms: number }>('audio:elapsed', (event) => {
      recorder.elapsedMs.value = event.payload.elapsed_ms
    })

    listen<RecordingMeta>('audio:recording-stopped', (event) => {
      store.addRecording(event.payload)
    })

    listen<PlaybackProgress>('audio:playback-progress', (event) => {
      store.updatePlaybackProgress(event.payload)
    })

    listen<{ id: string }>('audio:playback-ended', (event) => {
      store.stopPlayback(event.payload.id)
    })

    listen<{ message: string }>('audio:error', (event) => {
      const toast = useToast()
      toast.add({ title: 'Erreur audio', description: event.payload.message, color: 'error' })
    })
  })
}
```

### 5.3 `composables/useWaveform.ts`

```typescript
export function useWaveform(canvasRef: Ref<HTMLCanvasElement | null>) {
  let animFrameId: number

  function drawLive(samples: number[]) {
    // Dessiner la waveform oscilloscope (ligne continue)
    // Couleur : accent rouge pendant recording
    // throttle à 30fps via requestAnimationFrame
  }

  function drawStatic(peaks: number[], progress: number) {
    // Dessiner les barres verticales (80 barres)
    // Colorier les barres jouées vs non jouées
    // progress : 0.0 à 1.0
  }

  onUnmounted(() => cancelAnimationFrame(animFrameId))

  return { drawLive, drawStatic }
}
```

### 5.4 `stores/recordings.ts` — Pinia Store

```typescript
export const useRecordingsStore = defineStore('recordings', () => {
  const recordings = ref<RecordingMeta[]>([])
  const playingId = ref<string | null>(null)
  const playbackProgress = ref<Record<string, number>>({}) // id → 0.0-1.0

  async function loadRecordings() {
    recordings.value = await invoke<RecordingMeta[]>('list_recordings')
  }

  function addRecording(meta: RecordingMeta) {
    recordings.value.unshift(meta)
  }

  async function deleteRecording(id: string) {
    await invoke('delete_recording', { id })
    recordings.value = recordings.value.filter(r => r.id !== id)
  }

  async function playRecording(id: string) { /* ... */ }
  async function stopPlayback(id: string) { /* ... */ }
  function updatePlaybackProgress(payload: PlaybackProgress) { /* ... */ }

  return {
    recordings, playingId, playbackProgress,
    loadRecordings, addRecording, deleteRecording,
    playRecording, stopPlayback, updatePlaybackProgress
  }
})
```

### 5.5 Composants Vue — Mapping Nuxt UI

| Composant              | Nuxt UI                            | Description                              |
|------------------------|------------------------------------|------------------------------------------|
| `RecorderCard.vue`     | `<UCard>`                          | Carte principale avec #header, #default, #footer |
| `TimerDisplay.vue`     | texte brut + `<UBadge>`           | Chrono MM:SS.ms + badge statut REC/PAUSED/READY |
| `WaveformCanvas.vue`   | `<canvas>` natif                   | Waveform temps-réel via `useWaveform`    |
| `RecordingControls.vue`| `<UButton>` × 3                    | Boutons circulaires rec/pause/stop       |
| `RecordingsTable.vue`  | `<UTable>`                         | Tableau avec colonnes personnalisées     |
| `PlaybackWaveform.vue` | `<canvas>` natif dans slot UTable  | Mini waveform statique avec progression  |

### 5.6 `RecorderCard.vue` — Structure

```vue
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="text-sm font-mono text-gray-500">VOICE RECORDER</span>
        <UBadge
          :color="isRecording ? (isPaused ? 'warning' : 'error') : 'success'"
          :label="isRecording ? (isPaused ? 'PAUSED' : 'REC') : 'READY'"
          variant="subtle"
        />
      </div>
    </template>

    <div class="flex flex-col items-center gap-6 py-4">
      <TimerDisplay :elapsed-ms="elapsedMs" />
      <WaveformCanvas :samples="liveSamples" :active="isRecording && !isPaused" />
      <RecordingControls
        :is-recording="isRecording"
        :is-paused="isPaused"
        @start="start"
        @stop="stop"
        @pause="pause"
        @resume="resume"
      />
    </div>
  </UCard>
</template>
```

### 5.7 `RecordingsTable.vue` — Structure

```vue
<template>
  <UTable :data="recordings" :columns="columns">
    <template #name-cell="{ row }">
      <span class="font-medium">{{ row.original.name }}</span>
    </template>

    <template #waveform-cell="{ row }">
      <PlaybackWaveform
        :peaks="row.original.waveform_peaks"
        :progress="playbackProgress[row.original.id] || 0"
        :playing="playingId === row.original.id"
      />
    </template>

    <template #actions-cell="{ row }">
      <div class="flex gap-1">
        <UButton
          :icon="playingId === row.original.id ? 'i-lucide-pause' : 'i-lucide-play'"
          size="xs"
          variant="soft"
          :color="playingId === row.original.id ? 'success' : 'neutral'"
          @click="togglePlay(row.original)"
        />
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          variant="soft"
          color="error"
          @click="confirmDelete(row.original)"
        />
      </div>
    </template>
  </UTable>
</template>
```

**Colonnes UTable** :

```typescript
const columns = [
  { accessorKey: 'name', header: 'Nom' },
  { accessorKey: 'duration_ms', header: 'Durée',
    cell: ({ row }) => formatDuration(row.original.duration_ms) },
  { accessorKey: 'created_at', header: 'Date',
    cell: ({ row }) => formatDate(row.original.created_at) },
  { accessorKey: 'file_size_bytes', header: 'Taille',
    cell: ({ row }) => formatFileSize(row.original.file_size_bytes) },
  { accessorKey: 'waveform', header: 'Forme' },
  { accessorKey: 'actions', header: '' },
]
```

---

## 6. Configuration Tauri

### 6.1 `tauri.conf.json` — Extrait clé

```json
{
  "productName": "Voice Recorder",
  "identifier": "com.voicerecorder.app",
  "build": {
    "frontendDist": "../app/.output/public"
  },
  "app": {
    "windows": [
      {
        "title": "Voice Recorder",
        "width": 520,
        "height": 720,
        "resizable": true,
        "minWidth": 420,
        "minHeight": 600
      }
    ]
  }
}
```

### 6.2 `capabilities/default.json`

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit"
  ]
}
```

---

## 7. Cargo.toml — Dépendances Rust

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
cpal = "0.15"
opus = "0.3"
ogg = "0.9"
rtrb = "0.3"              # lock-free ring buffer SPSC
rodio = "0.19"             # playback
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
```

---

## 8. Optimisations de performance

### 8.1 Thread audio (CRITIQUE)

Le callback `cpal` tourne sur un thread temps-réel OS. Règles strictes :
- JAMAIS d'allocation (`Vec::push`, `String::new`, `Box::new`).
- JAMAIS de lock (`Mutex`, `RwLock`).
- JAMAIS d'I/O (`println!`, file write).
- UNIQUEMENT : écriture dans le ring buffer via opérations atomiques.

### 8.2 Pipeline IPC

```
[Thread Audio] --push--> [RingBuffer SPSC] --pop--> [Thread Encoder]
                                                          |
                                            +-------------+-------------+
                                            |                           |
                                    [Opus encode]              [Downsample 128pts]
                                            |                           |
                                    [tokio::fs write]          [emit("audio:samples")]
                                                                   ↓
                                                            [WebView JS]
                                                                   ↓
                                                          [Canvas 30fps]
```

### 8.3 Tailles de batch

| Opération                | Taille batch       | Fréquence | Justification                      |
|--------------------------|--------------------|-----------|------------------------------------|
| cpal → ring buffer       | variable (256-1024)| ~5ms      | Dépend du driver OS                |
| ring buffer → encoder    | 960 samples        | 20ms      | Trame Opus standard                |
| ring buffer → downsample | 2400 samples       | 50ms      | 128 points visuels                 |
| emit `audio:samples`     | 128 u8             | 50ms      | Suffisant pour waveform fluide     |
| emit `audio:elapsed`     | 1 u64              | 100ms     | Timer UI                           |
| Canvas redraw            | 128 points         | 33ms      | 30fps via requestAnimationFrame    |
| emit playback progress   | 2 u64              | 100ms     | Position + durée                   |

### 8.4 Mémoire

- Ring buffer : ~192KB (48000 × 4 bytes f32).
- Index JSON en mémoire : négligeable (< 100 enregistrements typiques).
- Waveform peaks : 80 bytes par enregistrement.
- Pas de blob audio en mémoire côté frontend : tout est streamé depuis le disque.

---

## 9. Types partagés (TypeScript)

```typescript
// types/audio.ts

interface RecordingMeta {
  id: string
  name: string
  filename: string
  duration_ms: number
  sample_rate: number
  created_at: string
  file_size_bytes: number
  waveform_peaks: number[]  // 80 values, 0-255
}

interface SamplesPayload {
  samples: number[]  // 128 values, 0-255
}

interface ElapsedPayload {
  elapsed_ms: number
}

interface PlaybackProgress {
  id: string
  position_ms: number
  duration_ms: number
}

interface AudioError {
  message: string
}
```

---

## 10. Plan d'implémentation (ordre recommandé)

### Phase 1 — Squelette (1-2h)
1. `cargo create-tauri-app` avec template Nuxt.
2. Configurer `tauri.conf.json` (fenêtre, permissions).
3. Installer Nuxt UI 3, configurer le thème dark.
4. Créer `RecorderCard.vue` et `RecordingsTable.vue` avec données mockées.
5. Vérifier que `tauri dev` fonctionne.

### Phase 2 — Audio Rust (2-3h)
1. Implémenter `ring_buffer.rs` (ou intégrer `rtrb`).
2. Implémenter `engine.rs` avec cpal.
3. Implémenter `encoder.rs` avec opus.
4. Implémenter les commands `start_recording` / `stop_recording`.
5. Tester la capture et l'encodage en CLI (sans UI).

### Phase 3 — IPC & Events (1-2h)
1. Implémenter l'émission des events `audio:samples` et `audio:elapsed`.
2. Implémenter `useRecorder.ts` et `useAudioEvents.ts`.
3. Connecter `WaveformCanvas.vue` aux samples live.
4. Connecter `TimerDisplay.vue` au chrono.

### Phase 4 — Storage & Playback (1-2h)
1. Implémenter `file_manager.rs` et `metadata.rs`.
2. Implémenter `decoder.rs` / playback via rodio.
3. Implémenter les commands `list_recordings`, `play_recording`, `delete_recording`.
4. Connecter `RecordingsTable.vue` au store Pinia.

### Phase 5 — Polish (1h)
1. Animations et transitions CSS.
2. Gestion d'erreurs (micro non disponible, disque plein).
3. Toast notifications via Nuxt UI `useToast()`.
4. Raccourcis clavier (Espace = rec/stop, P = pause).
5. System tray icon avec indicateur d'enregistrement.

---

## 11. Commandes de développement

```bash
# Setup initial
cargo create-tauri-app voice-recorder --template nuxt
cd voice-recorder
npm install
cd src-tauri && cargo add cpal opus ogg rtrb rodio uuid chrono

# Développement
npm run tauri dev

# Build production
npm run tauri build

# Tests Rust uniquement
cd src-tauri && cargo test

# Lint
cd src-tauri && cargo clippy -- -D warnings
npm run lint
```

---

## 12. Gestion d'erreurs

| Erreur                       | Handling côté Rust                        | Handling côté UI                        |
|------------------------------|-------------------------------------------|-----------------------------------------|
| Micro non disponible         | Return `Err("no_input_device")`           | Toast + message explicatif              |
| Permission micro refusée     | Return `Err("permission_denied")`         | Toast + lien vers settings OS           |
| Disque plein                 | Return `Err("disk_full")` via tokio::fs   | Toast + suggestion nettoyage            |
| Encodeur crash               | Catch panic, emit `audio:error`           | Stop recording, toast erreur            |
| Fichier corrompu (playback)  | Return `Err("decode_failed")`             | Toast + proposer suppression            |
| IPC timeout                  | Tauri gère nativement                     | Retry automatique × 3, puis toast       |

---

## 13. Tests

### Rust (cargo test)
- `ring_buffer` : test push/pop, overflow, underflow, concurrence SPSC.
- `encoder` : test encode chunk → decode → comparer PCM (SNR > 20dB).
- `file_manager` : test CRUD avec temp dir.
- `metadata` : test serialization/deserialization JSON.
- `commands` : integration test avec mock cpal device (si possible).

### Frontend (Vitest)
- `useRecorder` : mock `invoke`, vérifier state transitions.
- `stores/recordings` : test add/delete/update.
- `useWaveform` : test avec canvas mock (vérifier les appels drawRect).
- Composants : snapshot tests avec `@vue/test-utils`.

---

*Fin de la spécification. Ce document sert de référence unique pour Claude Code.*
