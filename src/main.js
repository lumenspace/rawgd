const MAGIC = new Uint8Array( [ 82, 65, 87, 71, 68 ] ) // RAWGD

const HAS_INDICES = 0x01
const HAS_NORMALS = 0x02

//

const vertices = new Float32Array( [ - 5, 0, 5, 5, 0, 5, 5, 0, - 5, - 5, 0, - 5 ] )
const indices = new Uint16Array( [ 0, 1, 2, 2, 3, 0 ] )
const normals = new Float32Array( [ 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0 ] )

const buffer = encode( { vertices, indices, normals } )

console.log( buffer )

{
	const { vertices, indices, normals } = decode( buffer )

	console.log( [ ...vertices ] )
	console.log( [ ...indices ] )
	console.log( [ ...normals ] )
}

//

function encode( { vertices, indices, normals } ) {

	let flags = 0

	if ( indices ) {

		flags |= HAS_INDICES
	}

	if ( normals ) {

		flags |= HAS_NORMALS
	}

	// Calculate buffer size in bytes
	let size = MAGIC.length			// 5 bytes for "RAWGD"
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

	const buffer = new ArrayBuffer( size )
	const view = new DataView( buffer )

	let offset = 0

	// Write magic
	for ( let i = 0; i < MAGIC.length; i++ ) {

		view.setUint8( offset, MAGIC[ i ] )

		offset++
	}

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

	return buffer
}

function decode( buffer ) {

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

	return { vertices, indices, normals }
}

/**
 * Converts a 32-bit floating-point number (IEEE 754 single-precision) to 
 * 16-bit floating-point representation (IEEE 754 half-precision) returned
 * as a 16-bit unsigned integer containing the raw bit pattern.
 *
 * @param {number} float32Value - Input number in Float32 (single-precision)
 * @returns {number} Uint16 value representing Float16 bits
 *
 * @example
 * const half = float32ToFloat16( 1.5498046875 ) // returns 15923 (0x3E3B)
 */
function float32ToFloat16( float32Value ) {

	// Use typed arrays to ensure bit-accurate conversion
	const float32Buffer = new Float32Array( [ float32Value ] )
	const uint32View = new Uint32Array( float32Buffer.buffer )

	// Decompose Float32 into sign, exponent and mantissa components
	// IEEE 754 Float32 layout: [1 sign bit | 8 exponent bits | 23 mantissa bits]
	const signBit = ( uint32View[ 0 ] & 0x80000000 ) >>> 16			// Shift sign to Float16 position
	const rawExponent = ( uint32View[ 0 ] & 0x7F800000 ) >>> 23		// Extract exponent bits
	const mantissaBits = ( uint32View[ 0 ] & 0x007FFFFF ) >>> 13	// Keep 10 significant bits

	// Convert Float32 exponent (bias 127) to Float16 (bias 15)
	const exponentValue = rawExponent - 127 + 15

	// Handle special cases
	if ( exponentValue > 31 ) {

		// Overflow: Return infinity with original sign
		return signBit | 0x7C00 // 0x7C00 = Float16 infinity
	}

	if ( exponentValue < - 14 ) {

		// Underflow: Return zero with original sign (flush to zero)
		return signBit
	}

	// Handle subnormal numbers (gradual underflow)
	if ( exponentValue < 1 ) {

		// Adjust mantissa with implicit leading 1 and denormalize
		const denormalizedMantissa = ( mantissaBits | 0x00800000 ) >>> ( 1 - exponentValue )
		return signBit | ( denormalizedMantissa >>> 13 )
	}

	// Normal number: Combine components
	// IEEE 754 Float16 layout: [1 sign bit | 5 exponent bits | 10 mantissa bits]
	return signBit | ( exponentValue << 10 ) | mantissaBits
}

/**
 * Converts a 16-bit floating-point value (IEEE 754 half-precision) stored
 * in a 16-bit unsigned integer to 32-bit floating-point representation.
 *
 * @param {number} float16Bits - Uint16 containing Float16 bit pattern
 * @returns {number} Float32 (single-precision) number
 *
 * @example
 * const single = float16ToFloa32( 15923 ) // returns ~1.5498046875
 */
function float16ToFloa32( float16Bits ) {

	// Decompose Float16 into components
	// IEEE 754 Float16 layout: [1 sign bit | 5 exponent bits | 10 mantissa bits]
	const signBit = ( float16Bits & 0x8000 ) << 16		// Move sign to Float32 position
	const rawExponent = ( float16Bits & 0x7C00 ) >>> 10	// Extract 5 exponent bits
	const mantissaBits = ( float16Bits & 0x03FF ) << 13	// Move to Float32 mantissa position

	// Handle special values
	if ( rawExponent === 0x1F ) { // Float16 infinity/NaN

		return new Float32Array( [ float16Bits ? NaN : Infinity ] )[ 0 ]
	}

	// Convert Float16 exponent (bias 15) to Float32 (bias 127)
	const exponentValue = rawExponent === 0 
		? 0 // Subnormal or zero
		: rawExponent - 15 + 127

	// Reconstruct Float32
	const reconstructed = signBit | ( exponentValue << 23 ) | mantissaBits
	const uint32Buffer = new Uint32Array( [ reconstructed ] )

	return new Float32Array( uint32Buffer.buffer )[ 0 ]
}

/**
* Encodes a normalized 3D vector into two 8-bit values using octahedral encoding.
* This compression method preserves the unit length while reducing storage from 
* 12 bytes (3 floats) to 2 bytes.
*
* The encoding process:
* 1. Projects the unit vector onto octahedron
* 2. Folds the bottom octahedron triangles onto the top ones
* 3. Maps the octahedron to [0,1] range
* 4. Quantizes to 8-bit integers
*
* @param {number} x - X component of the normalized vector
* @param {number} y - Y component of the normalized vector
* @param {number} z - Z component of the normalized vector
* @returns {[number, number]} Array containing two 8-bit values [oct1, oct2]
*
* @example
* const [ oct1, oct2 ] = encodeUnitVector( 0, 1, 0 ) // encodes a vector pointing up
*/
function encodeUnitVector( x, y, z ) {

	// Project the unit vector onto octahedron (L1 normalization)
	const invL1Norm = 1 / ( Math.abs( x ) + Math.abs( y ) + Math.abs( z ) )
	let nx = x * invL1Norm
	let ny = y * invL1Norm

	// Handle the negative z hemisphere by folding the octahedron
	if ( z < 0 ) {

		const tempX = ( 1 - Math.abs( ny ) ) * ( nx >= 0 ? 1 : - 1 )
		const tempY = ( 1 - Math.abs( nx ) ) * ( ny >= 0 ? 1 : - 1 )

		nx = tempX
		ny = tempY
	}

	// Map from [ - 1, 1 ] to [ 0, 1 ] range and then quantize to 8-bit integers
	const oct1 = Math.round( ( nx * 0.5 + 0.5 ) * 255 )
	const oct2 = Math.round( ( ny * 0.5 + 0.5 ) * 255 )

	return [ oct1, oct2 ]
}

/**
* Decodes two 8-bit values back into a normalized 3D vector.
* This is the inverse operation of encodeUnitVector.
*
* The decoding process:
* 1. Converts 8-bit integers back to [0,1] range
* 2. Maps to [-1,1] range
* 3. Reconstructs Z component
* 4. Unfolds octahedron if needed
* 5. Normalizes the final vector
*
* @param {number} oct1 - First 8-bit value (0-255)
* @param {number} oct2 - Second 8-bit value (0-255)
* @returns {[number, number, number]} Array containing normalized vector [x, y, z]
*
* @example
* const [ x, y, z ] = decodeUnitVector( 128, 255 ) // decodes back to a normalized vector
*/
function decodeUnitVector( oct1, oct2 ) {

	// Convert from 8-bit integers to [ - 1, 1 ] range
	let x = ( oct1 / 255 ) * 2 - 1
	let y = ( oct2 / 255 ) * 2 - 1

	// Compute Z component from octahedral map
	let z = 1 - Math.abs( x ) - Math.abs( y )

	// Handle the folded octahedron case
	if ( z < 0 ) {

		const tempX = ( 1 - Math.abs( y ) ) * ( x >= 0 ? 1 : - 1 )
		const tempY = ( 1 - Math.abs( x ) ) * ( y >= 0 ? 1 : - 1 )

		x = tempX
		y = tempY
		z = - z
	}

	// Normalize the vector to ensure unit length
	const length = Math.sqrt( x * x + y * y + z * z )

	return [ x / length, y / length, z / length ]
}
