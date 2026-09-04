/**
 * SurgeLab WebAssembly (WASM) FFI Bridge & JS Bindings Interface
 * 
 * Exposes native C hydro-tensor prediction kernel to React/Vite web application.
 *
 * Copyright (c) 2026 SurgeLab Infrastructure Systems
 */

#include "hydro_tensor_v4.h"

#if defined(__EMSCRIPTEN__)
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

static HydroTensorState g_current_state;
static TelemetryFrame g_latest_telemetry;
static float g_wasm_transfer_buffer[SURGE_TOTAL_NODES];

EMSCRIPTEN_KEEPALIVE
int init_native_hydro_kernel(void) {
    hydro_tensor_init(NULL);
    memset(&g_current_state, 0, sizeof(HydroTensorState));
    memset(&g_latest_telemetry, 0, sizeof(TelemetryFrame));
    return 1; // Success
}

EMSCRIPTEN_KEEPALIVE
void set_telemetry_params(float live_rain_mm_hr, float precip_6h, float pressure, float storm_x, float storm_y) {
    g_latest_telemetry.live_rainfall_mm_hr = live_rain_mm_hr;
    g_latest_telemetry.cumulative_precipitation_6h = precip_6h;
    g_latest_telemetry.atmospheric_pressure_hpa = pressure;
    g_latest_telemetry.storm_surge_vector_x = storm_x;
    g_latest_telemetry.storm_surge_vector_y = storm_y;
}

EMSCRIPTEN_KEEPALIVE
float* run_prediction_step_wasm(float storm_intensity_modifier, float dt_seconds) {
    // Run SIMD 2D Navier-Stokes numerical integration step
    hydro_tensor_step_pde(&g_current_state, &g_latest_telemetry, dt_seconds);
    
    // Execute Deep Neural Risk Tensor Layer
    hydro_tensor_compute_risk_field(&g_current_state, storm_intensity_modifier);

    // Export internal risk float pointer for Direct Memory Access (DMA) from JS TypedArrays
    hydro_tensor_export_wasm_buffer(&g_current_state, g_wasm_transfer_buffer);
    return g_wasm_transfer_buffer;
}

EMSCRIPTEN_KEEPALIVE
float predict_single_node_risk(int grid_x, int grid_y) {
    if (grid_x < 0 || grid_x >= SURGE_GRID_DIM_X || grid_y < 0 || grid_y >= SURGE_GRID_DIM_Y) return 0.0f;
    int idx = grid_y * SURGE_GRID_DIM_X + grid_x;
    return g_current_state.risk_index[idx];
}

EMSCRIPTEN_KEEPALIVE
uint32_t get_grid_total_nodes(void) {
    return SURGE_TOTAL_NODES;
}
