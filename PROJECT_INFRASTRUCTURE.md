# SurgeLab Infrastructure & System Architecture Manual

> **SurgeLab**: Next-Generation Urban Waterlogging, Flood Risk Analytics & Dynamic Navigation Infrastructure for Gurugram.  
> Powered by **React 19**, **Leaflet GIS**, **TypeScript**, and a native **AVX2 SIMD C/WASM Deep Hydro-Tensor Fluid Dynamics & Neural Prediction Engine**.

---

## 1. Executive Summary & System Overview

**SurgeLab** is an enterprise-grade geospatial intelligence and real-time hazard-aware navigation platform designed specifically to combat urban waterlogging and storm surge inundation in **Gurugram, Haryana, India**.

The application combines high-resolution terrain elevation models, historical waterlogging incident datasets, live Open-Meteo weather telemetry, user-submitted incident reports, and a high-performance **native C hydro-dynamics & neural prediction engine** compiled directly to **WebAssembly (WASM)**.

```mermaid
graph TD
    subgraph Data Sources & Telemetry
        OSM["OpenStreetMap Road Network"]
        DEM["Topographic DEM Grid"]
        MLCSV["Gurugram Waterlogging ML Dataset"]
        WeatherAPI["Live Open-Meteo API"]
        CrowdReports["Citizen Waterlogging Reports"]
    end

    subgraph Native Prediction Engine (C / WASM Core)
        HydroTensor["Deep Hydro-Tensor v4 Engine (hydro_tensor_v4.c)"]
        EKF["Extended Kalman Filter Fusion (surge_kalman_fusion.c)"]
        PDE["2D Shallow Water Navier-Stokes PDE Solver"]
        WASMBridge["WASM FFI Shared Memory Bridge (wasm_bridge.c)"]
    end

    subgraph Frontend Application Stack (React 19 + Vite)
        Store["Zustand Global State (mapStore.ts)"]
        NavEngine["Navigation & Routing Engine (A* Pathfinder)"]
        LeafletMap["React-Leaflet Vector & Heatmap Layers"]
        HUD["Real-Time HUD & Reroute Alert System"]
        Preloader["Preloader & Async Resource Pipeline"]
    end

    OSM --> NavEngine
    DEM --> HydroTensor
    MLCSV --> HydroTensor
    WeatherAPI --> EKF
    CrowdReports --> EKF

    HydroTensor --> PDE
    PDE --> EKF
    EKF --> WASMBridge
    WASMBridge -- "Direct Memory Access (DMA)" --> Store

    Store --> LeafletMap
    Store --> NavEngine
    NavEngine --> HUD
    Preloader --> LeafletMap
```

---

## 2. Native Computational Core: C & WASM Hydro-Tensor Engine

At the core of SurgeLab’s prediction subsystem is a custom native computational kernel written in C (`native/engine/`) designed for hyper-fast spatial fluid dynamics simulation and neural flood risk inference.

### 2.1 Native Engine Architecture (`native/engine/`)

The native engine consists of 5 main components:

| File | Purpose / Functional Role |
| :--- | :--- |
| [`native/engine/hydro_tensor_v4.h`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/native/engine/hydro_tensor_v4.h) | Primary header defining `TerrainNode`, `HydroTensorState`, `TelemetryFrame`, and model weight structures. |
| [`native/engine/hydro_tensor_v4.c`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/native/engine/hydro_tensor_v4.c) | SIMD AVX2-vectorized 2D Navier-Stokes shallow water equations solver and multi-layer neural tensor risk mapping. |
| [`native/engine/surge_kalman_fusion.c`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/native/engine/surge_kalman_fusion.c) | Extended Kalman Filter (EKF) sensor fusion kernel merging citizen telemetry with Gaussian spatial Kriging weights. |
| [`native/engine/wasm_bridge.c`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/native/engine/wasm_bridge.c) | WebAssembly FFI interface exposing C pointers for JS Float32Array Zero-Copy Memory Access. |
| [`native/engine/Makefile`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/native/engine/Makefile) | Dual-target build script for native x86_64 GCC compilation (`-mavx2 -fopenmp`) and EMSCRIPTEN WebAssembly compilation. |

---

### 2.2 Mathematical Formulation & Physical PDE Models

#### 1. 2D Shallow Water Hydrodynamics (Saint-Venant Partial Differential Equations)
The engine integrates conservation of mass and momentum over a $1024 \times 1024$ spatial grid:

$$\frac{\partial h}{\partial t} + \nabla \cdot (h \mathbf{u}) = R - I$$

$$\frac{\partial (h\mathbf{u})}{\partial t} + \nabla \cdot (h \mathbf{u} \otimes \mathbf{u}) + g h \nabla (h + z) = -\mathbf{S}_f$$

Where:
- $h$: Water depth (meters)
- $\mathbf{u} = (u, v)^T$: Horizontal velocity vector field
- $R$: Live rainfall inflow rate ($\text{mm/hr}$)
- $I$: Soil infiltration capacity & drainage loss vector
- $g = 9.80665 \, \text{m/s}^2$: Gravitational acceleration
- $z$: Terrain elevation (DEM grid)
- $\mathbf{S}_f$: Manning friction dissipation slope

#### 2. Deep Spatial Neural Tensor Activation
Fluid states are passed into a 2-layer neural spatial tensor convolution map to calculate instant risk percentages $[0.0, 100.0\%]$:

$$z^{(1)}_i = w_{\text{twi}} \cdot \text{TWI}_i + w_{\text{depth}} \cdot h_i - w_{\text{drain}} \cdot d_i + b^{(1)}$$

$$a^{(1)}_i = \max\left(0, z^{(1)}_i\right) \quad (\text{ReLU})$$

$$\text{Risk}_i = \sigma\left( \gamma \cdot a^{(1)}_i + \beta \cdot \text{Imperviousness}_i \right) \times 100\%$$

#### 3. Extended Kalman Filter (EKF) Telemetry Update
Real-time crowd reports are integrated into the grid using EKF matrix propagation:

$$K_k = P_k^- H^T \left( H P_k^- H^T + R \right)^{-1}$$

$$\hat{x}_k = \hat{x}_k^- + K_k \left( z_k - H \hat{x}_k^- \right)$$

---

## 3. Frontend Architecture & React 19 Application Stack

SurgeLab's client application is built with modern, ultra-responsive Web technologies:

- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) with custom risk color palettes
- **State Engine**: Zustand (`mapStore.ts`) for zero-boilerplate reactive UI state management
- **Geospatial Rendering**: Leaflet 1.9 + React-Leaflet 5 for interactive tile maps, vector polygons, heatmaps, and routing polylines
- **Iconography**: Lucide React (`lucide-react`)

### 3.1 Core Client Subsystems

#### A. Global State Store ([`src/store/mapStore.ts`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/src/store/mapStore.ts))
Controls global state including:
- Current user location & viewport tracking
- Storm simulation intensity slider ($0 - 100\%$)
- Active map basemap (CartoDB Voyager, Fastly Light, Satellite imagery)
- Waterlogging incident reports & flood polygon overlays
- Active navigation routes, turn-by-turn HUD, and reroute trigger flags

#### B. Machine Learning & Risk Engines
- [`src/services/mlInferenceEngine.ts`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/src/services/mlInferenceEngine.ts): TypeScript fallback and wrapper for ML predictions based on Topographic Wetness Index, drainage distance, and live rain rates.
- [`src/services/terrainRiskEngine.ts`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/src/services/terrainRiskEngine.ts): Computes slope, elevation loss, and water accumulation risk along route coordinates.
- [`src/services/roadRiskService.ts`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/src/services/roadRiskService.ts): Evaluates street segment hazard scores for Gurugram highway and arterial road networks.

#### C. Navigation & Pathfinder Engine ([`src/services/routingService.ts`](file:///c:/Users/bhave/OneDrive/Documents/projects/coding/SurgeLab/src/services/routingService.ts))
Implements risk-weighted pathfinding:
- Calculates alternative paths avoiding flooded road segments
- Evaluates elevation profiles across coordinates
- Triggers dynamic rerouting alerts when live storm intensity renders current path high-risk ($> 65\%$)

---

## 4. Complete Project Directory Hierarchy

```
SurgeLab/
├── native/                            # Native Computational C Core
│   └── engine/
│       ├── hydro_tensor_v4.h          # C Header: Structs, SIMD constants, API declarations
│       ├── hydro_tensor_v4.c          # C Implementation: Shallow Water PDEs & Neural Tensor
│       ├── surge_kalman_fusion.c      # C Implementation: Extended Kalman Filter Fusion
│       ├── wasm_bridge.c              # Emscripten WASM memory bridge
│       └── Makefile                   # GCC (AVX2/FMA) & Emscripten compilation
├── dataset/                           # Spatial Datasets & ML Training Data
│   ├── gurugram_waterlogging_ml.csv   # Micro-grid terrain ML features (TWI, slope, drain dist)
│   ├── gurugram_waterlogging_training.csv
│   ├── waterlogging_incidents.csv     # Historical & live crowd-reported flood incidents
│   ├── spatial_coverage_report.csv
│   └── temporal_coverage_report.csv
├── public/                            # Static Web Assets & Basemap Tiles
├── scripts/                           # Python & Node Data Ingestion Scripts
│   ├── fetch_gurugram_roads.mjs       # OSM Overpass API road network fetcher
│   ├── fetch_small_streets.py         # Sub-arterial street vector collector
│   └── append_hotspots_and_roads.py   # Spatial join tool for flood hotspot binding
├── src/
│   ├── components/                    # UI & Map React Components
│   │   ├── Preloader.tsx              # Application loading screen
│   │   ├── SplashScreen.tsx           # Initializing screen
│   │   ├── ErrorBoundary.tsx          # React error boundary wrapper
│   │   ├── map/                       # GIS Map Components
│   │   │   ├── MapContainer.tsx       # Leaflet Map root
│   │   │   ├── BasemapLayers.tsx      # Raster tile switches
│   │   │   ├── IncidentPinsLayer.tsx  # Marker cluster pins
│   │   │   ├── NavigationRouteLayer.tsx # Route polylines
│   │   │   ├── RegionHeatmapLayer.tsx # Flood risk polygon heatmaps
│   │   │   ├── RoadRiskLayer.tsx      # Road segment risk highlighting
│   │   │   ├── TerrainRiskLayer.tsx   # DEM elevation risk layer
│   │   │   └── WaterloggingReportLayer.tsx
│   │   └── ui/                        # User Interface Components
│   │       ├── NavigationHUD.tsx      # Driving turn-by-turn guidance HUD
│   │       ├── StormSimulator.tsx     # Live rain intensity controller
│   │       ├── ConditionsPanel.tsx    # Live weather metrics
│   │       ├── RerouteAlert.tsx       # Dynamic hazard reroute banner
│   │       ├── ElevationProfile.tsx   # Route slope & depth chart
│   │       ├── SearchBar.tsx          # Geocoding location search
│   │       └── SmartAnalysisDrawer.tsx # AI/ML hazard breakdown
│   ├── data/                          # Dataset loaders & typescript types
│   │   └── datasetLoader.ts           # CSV parser & spatial index builder
│   ├── hooks/                         # Custom React Hooks
│   ├── lib/                           # Utility helpers
│   ├── services/                      # Business Logic & Algorithms
│   │   ├── mlInferenceEngine.ts       # Risk inference engine
│   │   ├── mlSpatialIndex.ts          # R-tree spatial index
│   │   ├── navigationEngine.ts        # Turn-by-turn step guidance
│   │   ├── roadRiskService.ts         # Road segment evaluator
│   │   ├── routingService.ts          # Safe routing pathfinder
│   │   ├── terrainRiskEngine.ts       # Elevation & slope analysis
│   │   ├── weatherService.ts          # Open-Meteo live API client
│   │   └── geocodingService.ts        # Address geocoder
│   ├── store/
│   │   └── mapStore.ts                # Zustand global store
│   ├── styles/                        # CSS styles
│   ├── types/                         # TypeScript interfaces
│   ├── App.tsx                        # Root Application Component
│   ├── index.css                      # Tailwind entry & custom styles
│   ├── main.tsx                       # React DOM entrypoint
│   └── vite-env.d.ts
├── .env.example                       # Environment variable templates
├── package.json                       # Project dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
├── vercel.json                        # Vercel SPA rewrite deployment config
└── vite.config.ts                     # Vite build & plugin configuration
```

---

## 5. Deployment & Build Infrastructure

SurgeLab is configured for seamless deployment on serverless edge platforms such as **Vercel**:

- **Build Script**: `npm run build` (`vite build`)
- **Node Engine Requirement**: `>=20.0.0`
- **Single Page Application (SPA) Routing**: Configured in `vercel.json` to handle clean client-side dynamic routes:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 6. Summary of Key Performance Innovations

1. **AVX2 SIMD Vectorization**: Native 8-lane parallel float processing for fluid momentum integration in C.
2. **Zero-Copy Memory WASM Bridge**: High-efficiency array transfer via shared memory buffers between WebAssembly C memory and JS `Float32Array`.
3. **Extended Kalman Filter (EKF) Sensor Fusion**: Dynamic continuous correction of hydro-dynamic predictions using real-time crowd reports.
4. **Hazard-Aware Navigation**: A* pathfinding incorporating live storm surge simulation and elevation loss penalties to keep drivers safe during intense monsoon inundations in Gurugram.
