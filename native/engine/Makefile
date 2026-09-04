# SurgeLab Hydro-Tensor Native Engine Makefile
# Supports Native GCC/Clang build and Emscripten WebAssembly target

CC ?= gcc
EMCC ?= emcc

CFLAGS = -O3 -march=native -mavx2 -mfma -ffast-math -fopenmp -Wall -Wextra
EMCFLAGS = -O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS='["cwrap", "getValue", "setValue"]'

SRCS = hydro_tensor_v4.c surge_kalman_fusion.c wasm_bridge.c
OBJS = $(SRCS:.c=.o)
TARGET = hydro_tensor_engine

.PHONY: all clean native wasm

all: native wasm

native: $(TARGET)

$(TARGET): $(SRCS)
	$(CC) $(CFLAGS) $(SRCS) -o $(TARGET) -lm

wasm:
	$(EMCC) $(EMCFLAGS) $(SRCS) -o ../../public/hydro_tensor_engine.js

clean:
	rm -f $(TARGET) $(OBJS) ../../public/hydro_tensor_engine.js ../../public/hydro_tensor_engine.wasm
