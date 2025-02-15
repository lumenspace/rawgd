import * as RAWGD from "@lib/rawgd"

// Test a binary file
{
	const buffer = await ( await fetch( "/sample-geometries/plane.rawgd" ) ).arrayBuffer()

	console.log( RAWGD.decode( buffer ) )
}

// const vertices = new Float32Array( [ - 5, 0, 5, 5, 0, 5, 5, 0, - 5, - 5, 0, - 5 ] )
// const indices = new Uint16Array( [ 0, 1, 2, 2, 3, 0 ] )
// const normals = new Float32Array( [ 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0 ] )

// const buffer = RAWGD.encode( { vertices, indices, normals } )

// downloadGeometry( buffer, "geometry.rawgd" )

// Decode
// {
// 	const { vertices, indices, normals } = decode( buffer )

// 	console.log( [ ...vertices ] )
// 	console.log( [ ...indices ] )
// 	console.log( [ ...normals ] )
// }

// Utils

// function downloadGeometry( buffer, filename ) {

// 	const blob = new Blob( [ buffer ], { type: "application/octet-stream" } )
// 	const objectURL = URL.createObjectURL( blob )

// 	const link = document.createElement( "A" )
// 	link.href = objectURL
// 	link.download = filename

// 	link.click()

// 	URL.revokeObjectURL( link.href )

// 	link.remove()
// }
