# RAWGD

RAWGD (RAW Geometric Data) is a lightweight binary format for 3D geometry data, optimized for WebGL and WebGPU applications. It provides highly compressed geometry data storage while maintaining direct GPU compatibility.

## Overview

RAWGD is designed to efficiently store and transfer 3D geometry data with these key features:
- Compact binary storage with optimized data types
- Direct compatibility with WebGL/WebGPU vertex buffers
- Flexible structure with optional attributes  
- Minimal runtime overhead

## Features

### Optimized Data Storage

- **Vertices (16-bit)**
 - Uses half-float precision instead of 32-bit
 - Maintains good precision for typical 3D coordinates
 - 50% size reduction with minimal quality loss

- **Normals (16-bit)**
 - Octahedral normal encoding
 - Preserves unit vector precision
 - 66% size reduction from standard format

- **UV Coordinates (16-bit)**
 - 16-bit quantized values
 - Full range support for texture coordinates
 - 50% size reduction with minimal quality loss

- **Colors (16-bit)**
 - RGB565 format (16-bit RGB)
 - RGBA5551 format (16-bit RGBA)
 - 50% size reduction from 32-bit colors

### Memory Efficiency

- Only required data is stored
- Optional attributes controlled by flags
- No redundant or padding bytes
- Compact header (7 bytes total)

### GPU Compatibility

- Direct mapping to GPU vertex buffers
- No data conversion needed at runtime
- Standard vertex attribute formats
- Aligned data for optimal performance

## File Structure

Header Block:
- MAGIC:   5 bytes ("RAWGD")
- VERSION: 1 byte (4-bit major, 4-bit minor)
- FLAGS:   1 byte (attribute flags)

Required Data:
- VERTICES: Array of 16-bit half-float [x,y,z]

Optional Data (based on flags):
- INDICES:  Array of 16-bit unsigned integers
- NORMALS:  Octahedral encoded normals (2 bytes per normal)
- UVS:      16-bit quantized UV coordinates
- COLORS:   RGB565 or RGBA5551 format

- Direct mapping to GPU vertex buffers
- No data conversion needed at runtime
- Standard vertex attribute formats
- Aligned data for optimal performance

## API

### Encoding

```javascript
import * as RAWGD from "@lib/rawgd"

const geometry = {
    vertices: new Float32Array( [   // Required
        - 1, 0, 1,                 // x, y, z
        1, 0, 1,
        1, 0, - 1,
        - 1, 0, - 1,
    ] ),
    indices: new Uint16Array( [     // Optional
        0, 1, 2,
        2, 3, 0,
    ] ),
    normals: new Float32Array( [    // Optional
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
    ] ),
    uvs: new Float32Array( [        // Optional
        0, 0,
        1, 0,
        1, 1,
        0, 1,
    ] ),
    colors: new Float32Array( [     // Optional
        1, 0, 0, 1,               // r, g, b, a
        1, 0, 0, 1,
        1, 0, 0, 1,
        1, 0, 0, 1,
    ] )
}

const buffer = RAWGD.encode( geometry )
```

### Decoding

```javascript
const {
    vertices,    // Float32Array [x,y,z, x,y,z, ...]
    indices,     // Uint16Array  [i1,i2,i3, i1,i2,i3, ...]
    normals,     // Float32Array [nx,ny,nz, nx,ny,nz, ...]
    uvs,         // Float32Array [u,v, u,v, ...]
    colorsRGB,   // Float32Array [r,g,b, r,g,b, ...] if RGB565
    colorsRGBA   // Float32Array [r,g,b,a, r,g,b,a, ...] if RGBA5551
} = RAWGD.decode( buffer )
```

## Size Comparison

Example model with 1000 vertices:
Standard Format:
- Vertices:  12000 bytes (3 × 4 bytes × 1000)
- Normals:   12000 bytes (3 × 4 bytes × 1000)
- UVs:       8000 bytes  (2 × 4 bytes × 1000)
- Colors:    16000 bytes (4 × 4 bytes × 1000)
Total: 48000 bytes

RAWGD Format:
- Vertices:  6000 bytes  (3 × 2 bytes × 1000)
- Normals:   2000 bytes  (2 bytes × 1000)
- UVs:       4000 bytes  (2 × 2 bytes × 1000)
- Colors:    2000 bytes  (2 bytes × 1000)
Total: 14000 bytes

Size Reduction: ~71%

## Use Cases

- WebGL/WebGPU geometry loading
- Real-time 3D applications and games
- Web-based CAD/architecture viewers
- Dynamic geometry streaming
- Model optimization and compression

## Contributing

Development Guidelines:
- Follow the existing code style with proper spacing/indentation
- Document code using JSDoc format
- Include Vitest tests for new features
- Save sample geometry files in /public/sample-geometries

Example code style:
```javascript
/**
* Converts 32-bit float to 16-bit float
*
* @param {number} float32 - Input float value
* @returns {number} 16-bit float value
*
* @example
* const half = float32ToFloat16( 1.5 ) // returns 15872
*/
function float32ToFloat16( float32 ) {

   // Convert float32 to float16
   const float32Array = new Float32Array( [ float32 ] )
   const int32Array = new Int32Array( float32Array.buffer )

   // Extract components
   const sign = ( int32Array[ 0 ] & 0x80000000 ) >> 16

   return sign | exponent | mantissa
}
```

Sample geometry rules:

- Save encoded files with .rawgdb extension
- Include source geometry data for reference
- Document geometry features being tested
- Keep file sizes small and focused
