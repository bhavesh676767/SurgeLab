# SurgeLab: Urban Inundation Hydrodynamics Engine and Real-Time Hazard Pathfinding System

## 1. System Overview and Technical Architecture

SurgeLab is a high-performance geospatial intelligence system and inundation-aware pathfinder designed for urban flood risk evaluation in Gurugram, Haryana. The application executes a two-dimensional Saint-Venant Shallow Water Partial Differential Equation (PDE) solver coupled with a multi-layer spatial neural tensor network. The computational engine is implemented in C23 using AVX2 SIMD intrinsics and compiled to WebAssembly (WASM) for zero-copy memory dispatch inside a React 19 / Vite client architecture.

```
+---------------------------------------------------------------------------------------+
|                                1. DATA INGESTION TIER                                 |
|  [OpenStreetMap Overpass API]  [Gurugram DEM Grid]  [Open-Meteo API]  [Crowd Reports] |
+------------------------------------------+--------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                   2. NATIVE C23 / AVX2 SIMD / WASM CORE ENGINE                        |
|                                                                                       |
|   +--------------------------+    +-----------------------+    +------------------+   |
|   | 2D Shallow Water PDE     | -> | Spatial Neural Tensor | -> | EKF Kriging      |   |
|   | (hydro_tensor_v4.c)      |    | Activation Layer      |    | Telemetry Fusion |   |
|   +--------------------------+    +-----------------------+    +------------------+   |
|                                           |                                           |
|                                           v                                           |
|                     [WASM Linear Heap DMA (HEAPF32 Offset Pointer)]                   |
+------------------------------------------+--------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                           3. CLIENT APPLICATION (REACT 19)                            |
|                                                                                       |
|   [Zustand State Store]  ->  [React-Leaflet 5 GIS]  ->  [Risk-Weighted A* Pathfinder]   |
+---------------------------------------------------------------------------------------+
```

---

## 2. Mathematical Formulations and Discretization

### 2.1 Saint-Venant Shallow Water Equations (2D Hydrodynamics)

Water surface elevation h(x, y, t) and velocity components u(x, y, t) and v(x, y, t) across the 1024x1024 spatial grid are integrated using the conserved vector formulation:

$$\frac{\partial \mathbf{U}}{\partial t} + \frac{\partial \mathbf{F}(\mathbf{U})}{\partial x} + \frac{\partial \mathbf{G}(\mathbf{U})}{\partial y} = \mathbf{S}(\mathbf{U})$$

Where state vector U, flux vectors F(U) and G(U), and source term S(U) are defined as:

$$\mathbf{U} = \begin{bmatrix} h \\ hu \\ hv \end{bmatrix}, \quad \mathbf{F}(\mathbf{U}) = \begin{bmatrix} hu \\ hu^2 + \frac{1}{2} g h^2 \\ huv \end{bmatrix}, \quad \mathbf{G}(\mathbf{U}) = \begin{bmatrix} hv \\ huv \\ hv^2 + \frac{1}{2} g h^2 \end{bmatrix}$$

$$\mathbf{S}(\mathbf{U}) = \begin{bmatrix} R(x,y,t) - I(x,y,t) \\ -g h \frac{\partial z}{\partial x} - f_{\text{manning}} u \sqrt{u^2 + v^2} \\ -g h \frac{\partial z}{\partial y} - f_{\text{manning}} v \sqrt{u^2 + v^2} \end{bmatrix}$$

- h: Water depth column in meters
- z: Topographic Digital Elevation Model (DEM) height in meters
- g: Gravitational acceleration constant (9.80665 m/s^2)
- R(x,y,t): Spatial rainfall intensity in m/s
- I(x,y,t): Soil infiltration rate based on soil permeability K_soil
- f_manning: Manning friction factor for urban impervious surfaces

### 2.2 Topographic Wetness Index (TWI)

Spatial water accumulation preference is calculated via cell slope angle beta and specific catchment area alpha:

$$\text{TWI}_i = \ln \left( \frac{\alpha_i}{\tan \beta_i + \epsilon} \right)$$

### 2.3 Deep Neural Spatial Tensor Activations

Physical state parameters are transformed through a 2-layer spatial feed-forward network to calculate hazard probability P_risk:

$$Z_i^{(1)} = W_{\text{twi}} \cdot \text{TWI}_i + W_{\text{depth}} \cdot h_i - W_{\text{drain}} \cdot \left( \frac{d_{\text{drain}}}{100} \right) + b^{(1)}$$

$$A_i^{(1)} = \max\left(0, Z_i^{(1)}\right)$$

$$P_{\text{risk}, i} = \frac{1}{1 + \exp\left(-\left( \gamma \cdot A_i^{(1)} \cdot \phi_{\text{storm}} + \beta \cdot K_{\text{imp}} \right)\right)} \times 100$$

### 2.4 Extended Kalman Filter (EKF) Telemetry State Estimation

Real-time crowd reports z_k update cell states using spatial Gaussian Kriging weights:

$$w_{i,j} = \exp\left( -\frac{(x_i - x_j)^2 + (y_i - y_j)^2}{2 \sigma^2} \right)$$

$$\mathbf{K}_k = \mathbf{P}_k^- \mathbf{H}^T \left( \mathbf{H} \mathbf{P}_k^- \mathbf{H}^T + \mathbf{R} \right)^{-1}$$

$$\hat{\mathbf{x}}_k = \hat{\mathbf{x}}_k^- + \mathbf{K}_k \left( \mathbf{z}_k - \mathbf{H} \hat{\mathbf{x}}_k^- \right)$$

$$\mathbf{P}_k = (\mathbf{I} - \mathbf{K}_k \mathbf{H}) \mathbf{P}_k^-$$

### 2.5 Risk-Weighted A* Path Cost Calculation

Edge traversal cost cost(e) penalizes flooded segments exponentially:

$$f(n) = g(n) + h(n)$$

$$g(n) = \sum_{e \in \text{path}} L(e) \cdot \left[ 1.0 + \lambda_1 \left(\frac{P_{\text{risk}}(e)}{100}\right)^3 + \lambda_2 \max(0, -\Delta z_e) \right]$$

$$h(n) = 2 \cdot R_{\text{earth}} \cdot \arcsin\left( \sqrt{ \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right) } \right)$$

---

## 3. Low-Level Native Engine Architecture (native/engine/)

The calculation engine is written in C23 and optimized for x86_64 AVX2/FMA execution as well as WebAssembly SIMD128 targeting.

### 3.1 C Engine File Mapping

- hydro_tensor_v4.h: Struct memory layouts, grid dimension constants (SURGE_TOTAL_NODES = 1048576), AVX lane definitions.
- hydro_tensor_v4.c: SIMD-vectorized 2D Navier-Stokes numerical solver, OpenMP loop parallelization, neural tensor forward pass.
- surge_kalman_fusion.c: EKF state covariance update matrix implementation and spatial Kriging kernel diffusion.
- wasm_bridge.c: EMSCRIPTEN_KEEPALIVE exports for direct JS WebAssembly linear memory pointers.
- Makefile: GCC and Emscripten build directives.

### 3.2 AVX2 Vector Register Processing Kernel

Memory iteration operates over 256-bit SIMD vector lanes (8 packed 32-bit single-precision floats per register):

```c
#if defined(__AVX2__)
    // Load 8 contiguous spatial grid depth floats into YMM registers
    __m256 v_depth  = _mm256_loadu_ps(&state->depth_map[idx]);
    __m256 v_inflow = _mm256_set1_ps(rain_inflow);
    __m256 v_decay  = _mm256_set1_ps(g_weights.cell_decay_rate);

    // Fused Multiply-Add (FMA3): v_new = (v_depth * v_decay) + v_inflow
    __m256 v_new_depth = _mm256_fmadd_ps(v_depth, v_decay, v_inflow);

    _mm256_storeu_ps(&state->depth_map[idx], v_new_depth);
#endif
```

---

## 4. File and Module Directory Structure

```
SurgeLab/
|-- native/
|   `-- engine/
|       |-- hydro_tensor_v4.h          [C Header: Structs, SIMD constants, API declarations]
|       |-- hydro_tensor_v4.c          [C Implementation: Shallow Water PDEs & Neural Tensor]
|       |-- surge_kalman_fusion.c      [C Implementation: Extended Kalman Filter Fusion]
|       |-- wasm_bridge.c              [Emscripten WASM memory bridge]
|       `-- Makefile                   [GCC (AVX2/FMA) & Emscripten compilation]
|-- dataset/
|   |-- gurugram_waterlogging_ml.csv   [Micro-grid terrain features (TWI, slope, drain dist)]
|   |-- gurugram_waterlogging_training.csv
|   |-- waterlogging_incidents.csv     [Historical flood incident coordinates]
|   |-- spatial_coverage_report.csv
|   `-- temporal_coverage_report.csv
|-- scripts/
|   |-- fetch_gurugram_roads.mjs       [OSM Overpass road network fetcher]
|   |-- fetch_small_streets.py         [Sub-arterial vector collector]
|   `-- append_hotspots_and_roads.py   [Spatial join tool for flood hotspot binding]
|-- src/
|   |-- components/
|   |   |-- Preloader.tsx              [App initialization preloader component]
|   |   |-- SplashScreen.tsx           [Initial splash rendering component]
|   |   |-- ErrorBoundary.tsx          [React runtime error boundary]
|   |   |-- map/                       [Leaflet GIS Map Subsystem]
|   |   |   |-- MapContainer.tsx       [Leaflet root wrapper]
|   |   |   |-- BasemapLayers.tsx      [Raster tile layer controller]
|   |   |   |-- IncidentPinsLayer.tsx  [Incident marker cluster rendering]
|   |   |   |-- NavigationRouteLayer.tsx [Vector route polyline rendering]
|   |   |   |-- RegionHeatmapLayer.tsx [Flood risk polygon heatmaps]
|   |   |   |-- RoadRiskLayer.tsx      [Road segment hazard highlighting]
|   |   |   |-- TerrainRiskLayer.tsx   [DEM elevation risk layer]
|   |   |   `-- WaterloggingReportLayer.tsx
|   |   `-- ui/                        [User Interface Panels]
|   |       |-- NavigationHUD.tsx      [Driving turn-by-turn guidance HUD]
|   |       |-- StormSimulator.tsx     [Storm intensity input controller]
|   |       |-- ConditionsPanel.tsx    [Live weather metrics panel]
|   |       |-- RerouteAlert.tsx       [Dynamic hazard reroute alert overlay]
|   |       |-- ElevationProfile.tsx   [Route elevation profile visualization]
|   |       |-- SearchBar.tsx          [Geocoding location search bar]
|   |       `-- SmartAnalysisDrawer.tsx [AI/ML hazard breakdown drawer]
|   |-- services/
|   |   |-- mlInferenceEngine.ts       [Inference calculation engine wrapper]
|   |   |-- mlSpatialIndex.ts          [R-tree spatial indexing service]
|   |   |-- navigationEngine.ts        [Turn-by-turn guidance generator]
|   |   |-- roadRiskService.ts         [Road segment risk score evaluator]
|   |   |-- routingService.ts          [Risk-weighted A* pathfinder]
|   |   |-- terrainRiskEngine.ts       [DEM elevation and slope analyzer]
|   |   |-- weatherService.ts          [Open-Meteo live API integration]
|   |   `-- geocodingService.ts        [Geographic address search service]
|   |-- store/
|   |   `-- mapStore.ts                [Zustand global application state store]
|   |-- App.tsx                        [Root application component]
|   |-- index.css                      [Tailwind v4 styling entrypoint]
|   `-- main.tsx                       [React DOM root entrypoint]
|-- package.json                       [Dependencies and build scripts]
|-- tsconfig.json                      [TypeScript strict compiler rules]
|-- vercel.json                        [Vercel SPA route rewrite rules]
`-- vite.config.ts                     [Vite bundling configuration]
```

---

## 5. Build Procedures and Execution Instructions

### 5.1 JavaScript / TypeScript Environment Setup

Node.js >= 20.0.0 is required.

```bash
# Clone repository
git clone https://github.com/your-org/SurgeLab.git
cd SurgeLab

# Install NPM package tree
npm install

# Execute local Vite development server
npm run dev
```

### 5.2 Native Engine Compilation (C23 GCC and Emscripten WASM)

```bash
cd native/engine

# Build native x86_64 target with AVX2 and OpenMP acceleration
make native

# Build WebAssembly binary output (public/hydro_tensor_engine.js + .wasm)
make wasm
```

### 5.3 Production Bundle Compilation

```bash
npm run build
```

Production output will be generated inside the `dist/` directory. Serverless deployment configuration for Vercel is specified in `vercel.json`.
