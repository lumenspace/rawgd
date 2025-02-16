import { expect, test, describe } from "vitest"
import * as RAWGD from "@lib/rawgd"

describe( "Color Format Conversion", () => {

	test( "converts RGB colors correctly", () => {

		// Pure red
		expect( RAWGD.floatToRGB565( 1, 0, 0 ) ).toBe( 0xF800 )

		// Pure green
		expect( RAWGD.floatToRGB565( 0, 1, 0 ) ).toBe( 0x07E0 )

		// Pure blue
		expect( RAWGD.floatToRGB565( 0, 0, 1 ) ).toBe( 0x001F )
	} )

	test("converts RGBA colors correctly", () => {

		// Red with full alpha
		expect( RAWGD.floatToRGBA5551( 1, 0, 0, 1 ) ).toBe( 0xF801 )

		// Green with zero alpha
		expect( RAWGD.floatToRGBA5551( 0, 1, 0, 0 ) ).toBe( 0x07C0 )
	} )

	test( "roundtrip RGB conversion preserves colors", () => {

		const rgb565 = RAWGD.floatToRGB565( 0.5, 0.7, 0.9 )
		const [ r, g, b ] = RAWGD.rgb565ToFloat( rgb565 )

		expect( r ).toBeCloseTo( 0.5, 1 )
		expect( g ).toBeCloseTo( 0.7, 1 )
		expect( b ).toBeCloseTo( 0.9, 1 )
	} )

	test( "roundtrip RGBA conversion preserves colors and alpha", () => {

		const rgba5551 = RAWGD.floatToRGBA5551( 0.5, 0.7, 0.9, 1 )
		const [ r, g, b, a ] = RAWGD.rgba5551ToFloat( rgba5551 )

		expect( r ).toBeCloseTo( 0.5, 1 )
		expect( g ).toBeCloseTo( 0.7, 1 )
		expect( b ).toBeCloseTo( 0.9, 1 )
		expect( a ).toBe( 1 )
	} )
} )
