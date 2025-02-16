import {
	float32ToFloat16,
	float16ToFloa32,
	encodeUnitVector,
	decodeUnitVector,
	floatToRGB565,
	rgb565ToFloat,
	floatToRGBA5551,
	rgba5551ToFloat,
	encodeVersion,
	decodeVersion,
} from "./utils.js"

import {
	MAGIC,
	HAS_INDICES,
	HAS_NORMALS,
	HAS_UVS,
	HAS_RGBA5551,
	HAS_RGB565,
} from "./constants.js"

/**
* Encodes 3D geometry data into a binary RAWGD format buffer.
* Compresses vertex attributes using optimized formats:
* - Vertices: 16-bit half-float
* - Normals: 8-bit octahedral encoding 
* - UVs: 16-bit quantized
* - Colors: RGB565 or RGBA5551
*
* @param {Object} geometry - Geometry data to encode
* @param {Float32Array} geometry.vertices - Vertex positions [x,y,z, x,y,z, ...]
* @param {Uint16Array} [geometry.indices] - Triangle indices [i1,i2,i3, i1,i2,i3, ...]
* @param {Float32Array} [geometry.normals] - Vertex normals [nx,ny,nz, nx,ny,nz, ...]
* @param {Float32Array} [geometry.uvs] - Texture coordinates [u,v, u,v, ...]
* @param {Float32Array} [geometry.colors] - Vertex colors [r,g,b, r,g,b, ...] or [r,g,b,a, r,g,b,a, ...]
* @returns {ArrayBuffer} Encoded binary buffer in RAWGD format
*
* @example
* const geometry = {
*     vertices: new Float32Array( [-1,0,1, 1,0,1, 1,0,-1] ),
*     normals: new Float32Array( [0,1,0, 0,1,0, 0,1,0] ),
*     colors: new Float32Array( [1,0,0,1, 0,1,0,1, 0,0,1,1] )
* }
* const buffer = encode( geometry )
*/
export function encode( { vertices, indices, normals, uvs, colors } ) {

	let flags = 0

	if ( indices ) {

		flags |= HAS_INDICES
	}

	if ( normals ) {

		flags |= HAS_NORMALS
	}

	if ( uvs ) {

		flags |= HAS_UVS
	}

	// Check color format from array length
	if ( colors ) {

		if ( colors.length === vertices.length / 3 * 4 ) {

			flags |= HAS_RGBA5551
		}
		else {
			flags |= HAS_RGB565
		}
	}

	// Calculate buffer size in bytes
	let size = MAGIC.length			// 5 bytes for "RAWGD"
	size += 1						// 1 byte for version
	size += 1						// 1 byte for flags
	size += 2						// 2 bytes for vertex count
	size += vertices.length * 2		// 2 bytes per vertex component (float16)

	if ( flags & HAS_INDICES ) {

		size += 2					// 2 bytes for index count
		size += indices.length * 2	// 2 bytes per index (uint16)
	}

	if ( flags & HAS_NORMALS ) {

		size += normals.length * 2 / 3	// 2 bytes per normal (octahedral encoded)
	}

	if ( flags & HAS_UVS ) {

		size += uvs.length * 2	// 2 bytes per uv component (int16)
	}

	if ( flags & ( HAS_RGB565 | HAS_RGBA5551 ) ) {

		size += colors.length / ( flags & HAS_RGBA5551 ? 4 : 3 ) * 2
	}

	const buffer = new ArrayBuffer( size )
	const view = new DataView( buffer )

	let offset = 0

	// Write magic
	for ( let i = 0; i < MAGIC.length; i++ ) {

		view.setUint8( offset, MAGIC[ i ] )

		offset++
	}

	// Write version information (1 byte)
	const version = encodeVersion()
	view.setUint8( offset++, version )

	// Write flags
	view.setUint8( offset, flags )
	offset++

	// Write vertex count
	view.setUint16( offset, vertices.length / 3, true ) // true for little-endian
	offset += 2

	// Write vertices as float16
	for ( let i = 0; i < vertices.length; i++ ) {

		const float16 = float32ToFloat16( vertices[ i ] )

		view.setUint16( offset, float16, true )
		offset += 2
	}

	// Write indices if present
	if ( flags & HAS_INDICES ) {

		// Write index count
		view.setUint16( offset, indices.length, true )
		offset += 2

		// Write indices
		for ( let i = 0; i < indices.length; i++ ) {

			view.setUint16( offset, indices[ i ], true )
			offset += 2
		}
	}

	// Write normals if present
	if ( flags & HAS_NORMALS ) {

		for ( let i = 0; i < normals.length; i += 3 ) {

			const [ oct1, oct2 ] = encodeUnitVector( normals[ i ], normals[ i + 1 ], normals[ i + 2 ] )

			view.setUint8( offset++, oct1 )
			view.setUint8( offset++, oct2 )
		}
	}

	// Write UVs if present
	if ( flags & HAS_UVS ) {

		for ( let i = 0; i < uvs.length; i++ ) {

			const quantized = Math.floor( uvs[ i ] * 32_767 ) // Convert from float to int16
			view.setInt16( offset, quantized, true )

			offset += 2
		}
	}

	// Write colors if present
	if ( flags & HAS_RGBA5551 ) {

		for ( let i = 0; i < colors.length; i += 4 ) {

			const color = floatToRGBA5551(
				colors[ i ],
				colors[ i + 1 ],
				colors[ i + 2 ],
				colors[ i + 3 ]
			)

			view.setUint16( offset, color, true )
			offset += 2
		}
	}
	else if ( flags & HAS_RGB565 ) {

		for ( let i = 0; i < colors.length; i += 3 ) {

			const color = floatToRGB565(
				colors[ i ],
				colors[ i + 1 ],
				colors[ i + 2 ]
			)

			view.setUint16( offset, color, true )
			offset += 2
		}
	}

	return buffer
}

/**
 * Decodes a binary RAWGD format buffer into 3D geometry data.
 *
 * Decompresses vertex attributes from optimized formats:
 * - Vertices: 16-bit half-float to 32-bit float
 * - Normals: 8-bit octahedral to normalized vectors
 * - UVs: 16-bit quantized to float
 * - Colors: RGB565/RGBA5551 to float components
 *
 * @param {ArrayBuffer} buffer - Binary buffer in RAWGD format
 * @returns {Object} Decoded geometry data
 * @returns {Object} version - Format version {major, minor}
 * @returns {Float32Array} vertices - Vertex positions [x,y,z, x,y,z, ...]
 * @returns {Uint16Array} [indices] - Triangle indices [i1,i2,i3, i1,i2,i3, ...]
 * @returns {Float32Array} [normals] - Vertex normals [nx,ny,nz, nx,ny,nz, ...]
 * @returns {Float32Array} [uvs] - Texture coordinates [u,v, u,v, ...]
 * @returns {Float32Array} [colorsRGB] - RGB colors [r,g,b, r,g,b, ...]
 * @returns {Float32Array} [colorsRGBA] - RGBA colors [r,g,b,a, r,g,b,a, ...]
 * @throws {Error} If file format is invalid
 *
 * @example
 * const { vertices, normals, colorsRGBA } = decode( buffer )
 */
export function decode( buffer ) {

	const view = new DataView( buffer )

	let offset = 0

	// Read and verify magic (5 bytes)
	const magic = new Uint8Array( MAGIC.length )

	for ( let i = 0; i < MAGIC.length; i++ ) {

		magic[ i ] = view.getUint8( offset++ )
	}

	// Compare magic with expected value
	for ( let i = 0; i < MAGIC.length; i++ ) {

		if ( magic[ i ] !== MAGIC[ i ] ) {

			throw new Error( "Invalid file format" )
		}
	}

	// Read version information (1 byte)
	const version = decodeVersion( view.getUint8( offset++ ) )

	// Read flags
	const flags = view.getUint8( offset++ )

	// Read vertex count (uint16 = 2 bytes)
	const vertexCount = view.getUint16( offset, true )
	offset += 2

	// Read vertices (each vertex component is float16 = 2 bytes)
	const vertices = new Float32Array( vertexCount * 3 )

	for ( let i = 0; i < vertices.length; i++ ) {

		const float16 = view.getUint16( offset, true )
		vertices[ i ] = float16ToFloa32( float16 )
		offset += 2
	}

	// Read indices if present
	let indices = null

	if ( flags & HAS_INDICES ) {

		const indexCount = view.getUint16( offset, true )

		offset += 2

		indices = new Uint16Array( indexCount )

		for ( let i = 0; i < indexCount; i++ ) {

			indices[ i ] = view.getUint16( offset, true )

			offset += 2
		}
	}

	// Read normals if present
	let normals = null

	if ( flags & HAS_NORMALS ) {

		normals = new Float32Array( vertexCount * 3 )

		for ( let i = 0; i < vertexCount; i++ ) {

			const oct1 = view.getUint8( offset++ )
			const oct2 = view.getUint8( offset++ )
			const [ x, y, z ] = decodeUnitVector( oct1, oct2 )

			normals[ i * 3 ] = x
			normals[ i * 3 + 1 ] = y
			normals[ i * 3 + 2 ] = z
		}
	}

	// Read UVs if present
	let uvs = null

	if ( flags & HAS_UVS ) {

		uvs = new Float32Array( vertexCount * 2 )

		for ( let i = 0; i < uvs.length; i++ ) {

			const quantized = view.getInt16( offset, true )
			uvs[ i ] = quantized / 32_767 // Convert from int16 back to float

			offset += 2
		}
	}

	// Read colors if present
	let colorsRGB = null
	let colorsRGBA = null

	if ( flags & HAS_RGBA5551 ) {

		colorsRGBA = new Float32Array( vertexCount * 4 )

		for ( let i = 0; i < vertexCount; i++ ) {

			const rgba5551 = view.getUint16( offset, true )
			const [ r, g, b, a]  = rgba5551ToFloat( rgba5551 )

			colorsRGBA[ i * 4 ] = r
			colorsRGBA[ i * 4 + 1 ] = g
			colorsRGBA[ i * 4 + 2 ] = b
			colorsRGBA[ i * 4 + 3 ] = a

			offset += 2
		}
	}
	else if ( flags & HAS_RGB565 ) {

		colorsRGB = new Float32Array( vertexCount * 3 )

		for ( let i = 0; i < vertexCount; i++ ) {

			const rgb565 = view.getUint16( offset, true )
			const [ r, g, b ] = rgb565ToFloat( rgb565 )

			colorsRGB[ i * 3 ] = r
			colorsRGB[ i * 3 + 1 ] = g
			colorsRGB[ i * 3 + 2 ] = b

			offset += 2
		}
	}

	return { version, vertices, indices, normals, uvs, colorsRGB, colorsRGBA }
}
