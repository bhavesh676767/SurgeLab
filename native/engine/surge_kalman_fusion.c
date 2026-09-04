/**
 * SurgeLab Spatial Extended Kalman Filter (EKF) & Telemetry Fusion Engine
 * 
 * Dynamically fuses crowd-sourced citizen waterlogging reports, IoT gauge telemetry,
 * and satellite radar wetness indexes into the hydro-tensor prediction grid.
 *
 * Copyright (c) 2026 SurgeLab Infrastructure Systems
 */

#include "hydro_tensor_v4.h"

typedef struct {
    double x_lat;
    double y_lng;
    float reported_depth_cm;
    float confidence_score; // [0.0 - 1.0]
    uint64_t timestamp;
} CrowdTelemetryObservation;

typedef struct {
    float state_estimate;  // Filtered water depth (meters)
    float covariance_p;    // Estimation error covariance
    float kalman_gain_k;   // Calculated Kalman gain
} SpatialKalmanCell;

static SpatialKalmanCell g_kalman_grid[SURGE_TOTAL_NODES];

/**
 * Initialize EKF Spatial State Matrix
 */
void surge_kalman_init(float initial_covariance) {
    for (int i = 0; i < SURGE_TOTAL_NODES; i++) {
        g_kalman_grid[i].state_estimate = 0.0f;
        g_kalman_grid[i].covariance_p = initial_covariance > 0.0f ? initial_covariance : 1.0f;
        g_kalman_grid[i].kalman_gain_k = 0.0f;
    }
    printf("[SurgeKalman Fusion] EKF Grid State Matrix Initialized (P_0 = %.3f).\n", initial_covariance);
}

/**
 * Predict Step: Time update equation using PDE Hydro-Tensor prediction as state transition model
 * P_k^- = A * P_{k-1} * A^T + Q
 */
void surge_kalman_predict_step(const HydroTensorState *predicted_state, float process_noise_q) {
    if (!predicted_state) return;

    for (int i = 0; i < SURGE_TOTAL_NODES; i++) {
        // State transition model from shallow water solver
        g_kalman_grid[i].state_estimate = predicted_state->depth_map[i];
        
        // Error Covariance Propagation
        g_kalman_grid[i].covariance_p = g_kalman_grid[i].covariance_p + process_noise_q;
    }
}

/**
 * Update Step: Measurement update using crowdsourced telemetry & spatial Kriging interpolation
 * K_k = P_k^- * H^T * (H * P_k^- * H^T + R)^-1
 * \hat{x}_k = \hat{x}_k^- + K_k * (z_k - H * \hat{x}_k^-)
 * P_k = (I - K_k * H) * P_k^-
 */
void surge_kalman_update_telemetry(const CrowdTelemetryObservation *obs_list, size_t obs_count, float measurement_noise_r) {
    if (!obs_list || obs_count == 0) return;

    for (size_t k = 0; k < obs_count; k++) {
        const CrowdTelemetryObservation *obs = &obs_list[k];
        
        // Map Geo-coordinates to 1024x1024 spatial grid index (Gurugram Bounding Box)
        // BBox: Lat [28.35, 28.55], Lng [76.90, 77.15]
        int grid_x = (int)(((obs->y_lng - 76.90) / (77.15 - 76.90)) * SURGE_GRID_DIM_X);
        int grid_y = (int)(((obs->x_lat - 28.35) / (28.55 - 28.35)) * SURGE_GRID_DIM_Y);

        if (grid_x < 0 || grid_x >= SURGE_GRID_DIM_X || grid_y < 0 || grid_y >= SURGE_GRID_DIM_Y) continue;

        int target_idx = grid_y * SURGE_GRID_DIM_X + grid_x;
        float z_measurement_m = (obs->reported_depth_cm / 100.0f) * obs->confidence_score;

        // Spatial Gaussian Kernel Diffusion Radius (Kriging weights)
        int kernel_radius = 5;
        for (int dy = -kernel_radius; dy <= kernel_radius; dy++) {
            for (int dx = -kernel_radius; dx <= kernel_radius; dx++) {
                int cx = grid_x + dx;
                int cy = grid_y + dy;
                if (cx < 0 || cx >= SURGE_GRID_DIM_X || cy < 0 || cy >= SURGE_GRID_DIM_Y) continue;

                int cell_idx = cy * SURGE_GRID_DIM_X + cx;
                float dist_sq = (float)(dx * dx + dy * dy);
                float spatial_weight = expf(-dist_sq / (2.0f * 2.25f)); // Gaussian \sigma = 1.5 grid cells

                SpatialKalmanCell *cell = &g_kalman_grid[cell_idx];

                // Compute Kalman Gain
                float r_adj = measurement_noise_r / (obs->confidence_score * spatial_weight + 1e-5f);
                cell->kalman_gain_k = cell->covariance_p / (cell->covariance_p + r_adj);

                // State Estimate Update
                float innovation = z_measurement_m - cell->state_estimate;
                cell->state_estimate += cell->kalman_gain_k * innovation;

                // Covariance Update
                cell->covariance_p = (1.0f - cell->kalman_gain_k) * cell->covariance_p;
            }
        }
    }
}

/**
 * Returns the posterior EKF state estimate map for WASM engine rendering
 */
void surge_kalman_get_posterior_depth(float *out_depth_grid) {
    if (!out_depth_grid) return;
    for (int i = 0; i < SURGE_TOTAL_NODES; i++) {
        out_depth_grid[i] = g_kalman_grid[i].state_estimate;
    }
}
