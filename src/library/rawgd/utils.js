import {
	VERSION_MAJOR,
	VERSION_MINOR,
} from "./constants.js"

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
export function float32ToFloat16( float32Value ) {

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
export function float16ToFloa32( float16Bits ) {

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
export function encodeUnitVector( x, y, z ) {

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
export function decodeUnitVector( oct1, oct2 ) {

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

/**
* Converts float RGB values [0-1] to RGB565 format
*
* @param {number} r - Red component [0-1]
* @param {number} g - Green component [0-1]
* @param {number} b - Blue component [0-1]
* @returns {number} 16-bit RGB565 value
*
* @example
* const rgb565 = floatToRGB565( 1, 0, 0 ) // returns 63488 (pure red)
* const rgb565 = floatToRGB565( 0, 1, 0 ) // returns 2016 (pure green)
* const rgb565 = floatToRGB565( 0, 0, 1 ) // returns 31 (pure blue)
*/
export function floatToRGB565( r, g, b ) {

	const r5 = Math.round( r * 31 )
	const g6 = Math.round( g * 63 )
	const b5 = Math.round( b * 31 )

	return ( r5 << 11 ) | ( g6 << 5 ) | b5
}

/**
* Converts RGB565 value to float RGB values [0-1]
*
* @param {number} rgb565 - 16-bit RGB565 value
* @returns {[number, number, number]} RGB float values
*
* @example
* const [ r, g, b ] = rgb565ToFloat( 63488 ) // returns [1, 0, 0] (pure red)
* const [ r, g, b ] = rgb565ToFloat( 2016 )  // returns [0, 1, 0] (pure green)
* const [ r, g, b ] = rgb565ToFloat( 31 )    // returns [0, 0, 1] (pure blue)
*/
export function rgb565ToFloat( rgb565 ) {

	const r = ( ( rgb565 >> 11 ) & 0x1F ) / 31
	const g = ( ( rgb565 >> 5 ) & 0x3F ) / 63
	const b = ( rgb565 & 0x1F ) / 31

	return [ r, g, b ]
}

/**
* Converts float RGBA values [0-1] to RGBA5551 format
*
* @param {number} r - Red component [0-1]
* @param {number} g - Green component [0-1]
* @param {number} b - Blue component [0-1]
* @param {number} a - Alpha component [0-1]
* @returns {number} 16-bit RGBA5551 value
*
* @example
* const rgba5551 = floatToRGBA5551( 1, 0, 0, 1 ) // returns 63489 (pure red, full alpha)
* const rgba5551 = floatToRGBA5551( 0, 1, 0, 1 ) // returns 1985 (pure green, full alpha)
* const rgba5551 = floatToRGBA5551( 0, 0, 1, 0 ) // returns 30 (pure blue, zero alpha)
*/
export function floatToRGBA5551( r, g, b, a ) {

	const r5 = Math.round( r * 31 )
	const g5 = Math.round( g * 31 )
	const b5 = Math.round( b * 31 )
	const a1 = a > 0.5 ? 1 : 0

	return ( r5 << 11 ) | ( g5 << 6 ) | ( b5 << 1 ) | a1
}

/**
* Converts RGBA5551 value to float RGBA values [0-1]
*
* @param {number} rgba5551 - 16-bit RGBA5551 value
* @returns {[number, number, number, number]} RGBA float values
*
* @example
* const [ r, g, b, a ] = rgba5551ToFloat( 63489 ) // returns [1, 0, 0, 1] (pure red, full alpha)
* const [ r, g, b, a ] = rgba5551ToFloat( 1985 )  // returns [0, 1, 0, 1] (pure green, full alpha)
* const [ r, g, b, a ] = rgba5551ToFloat( 30 )    // returns [0, 0, 1, 0] (pure blue, zero alpha)
*/
export function rgba5551ToFloat( rgba5551 ) {

	const r = ( ( rgba5551 >> 11 ) & 0x1F ) / 31
	const g = ( ( rgba5551 >> 6 ) & 0x1F ) / 31
	const b = ( ( rgba5551 >> 1 ) & 0x1F ) / 31
	const a = ( rgba5551 & 0x1 ) ? 1 : 0

	return [ r, g, b, a ]
}

/**
* Encodes version info into a single byte.
* Major and minor versions are stored in the same byte:
* - Major version uses the first 4 bits (values 0-15)
* - Minor version uses the last 4 bits (values 0-15)
* @returns {number} Encoded version byte
*
* @example
* // Version 1.0 = 00010000 = 16
* const versionByte = encodeVersion() // returns 16
*/
export function encodeVersion() {

	return ( VERSION_MAJOR << 4 ) | VERSION_MINOR
}

/**
* Decodes version info from a single byte
* @param {number} byte - Version byte to decode
* @returns {{major: number, minor: number}} Object containing major and minor version numbers
*
* @example
* // 00010000 = Version 1.0
* const version = decodeVersion( 16 ) // returns { major: 1, minor: 0 }
*/
export function decodeVersion( byte ) {

	const major = (byte >> 4) & 0x0F	// Extract first 4 bits
	const minor = byte & 0x0F			// Extract last 4 bits

	return { major, minor }
}
