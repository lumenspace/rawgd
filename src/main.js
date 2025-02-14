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
	const signBit = ( float16Bits & 0x8000 ) << 16 // Move sign to Float32 position
	const rawExponent = ( float16Bits & 0x7C00 ) >>> 10 // Extract 5 exponent bits
	const mantissaBits = ( float16Bits & 0x03FF ) << 13 // Move to Float32 mantissa position

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

console.assert( 64.5 === float16ToFloa32( float32ToFloat16( 64.55 ) ), "Roundtrip conversion failed" )
