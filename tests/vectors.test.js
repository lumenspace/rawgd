import { expect, test, describe } from "vitest"
import * as RAWGD from "@lib/rawgd"

describe( "Unit Vector Encoding", () => {

	test( "encodes basic unit vectors correctly", () => {

		expect( RAWGD.encodeUnitVector( 0, 1, 0 ) ).toStrictEqual( [ 128, 255 ] )
		expect( RAWGD.encodeUnitVector( 0, - 1, 0 ) ).toStrictEqual( [ 128, 0 ] )
	} )

	test( "roundtrip conversion preserves direction", () => {

		const [ x, y, z ] = [ 0.577, 0.577, 0.577 ] // Normalized diagonal
		const [ oct1, oct2 ] = RAWGD.encodeUnitVector( x, y, z )
		const [ rx, ry, rz ] = RAWGD.decodeUnitVector( oct1, oct2 )

		expect( rx ).toBeCloseTo( x, 2 )
		expect( ry ).toBeCloseTo( y, 2 )
		expect( rz ).toBeCloseTo( z, 2 )
	} )
} )
