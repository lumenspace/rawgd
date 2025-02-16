import { expect, test, describe } from "vitest"
import * as RAWGD from "@lib/rawgd"

describe( "Float16 Conversion", () => {

	test( "converts common float32 values to float16 correctly", () => {

		expect( RAWGD.float32ToFloat16( 0 ) ).toBe( 0 )
		expect( RAWGD.float32ToFloat16( 1 ) ).toBe( 0x3C00 )
		expect( RAWGD.float32ToFloat16( - 2 ) ).toBe( 0xC000 )
	} )

	test( "handles special float values correctly", () => {

		expect( RAWGD.float32ToFloat16( Infinity ) ).toBe( 0x7C00 )
		expect( RAWGD.float32ToFloat16( - Infinity ) ).toBe( 0xFC00 )
	} )

	test( "roundtrip conversion preserves precision", () => {

		const original = 1.5
		const float16 = RAWGD.float32ToFloat16( original )
		const restored = RAWGD.float16ToFloa32( float16 )

		expect( restored ).toBeCloseTo( original, 3 )
	} )
} )
