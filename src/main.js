import * as THREE from "three"
import * as RAWGD from "@lib/rawgd"
import { setupScene } from "./setupScene"

const { scene } = setupScene( document.getElementById( "gl" ) )

const texture = new THREE.TextureLoader().load( "/uv.png", t => {
	t.colorSpace = THREE.SRGBColorSpace
	t.wrapS = t.wrapT = THREE.RepeatWrapping
	t.anisotropy = 16
} )

// Test a binary file
{
	const buffer = await ( await fetch( "/sample-geometries/sphere.rawgd" ) ).arrayBuffer()

	const { indices, vertices, normals, uvs } = RAWGD.decode( buffer )

	const geometry = new THREE.BufferGeometry()

	if ( indices !== null ) {

		geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) )
	}

	geometry.setAttribute( "position", new THREE.BufferAttribute( vertices, 3 ) )

	if ( normals !== null ) {

		geometry.setAttribute( "normal", new THREE.BufferAttribute( normals, 3 ) )
	}

	if ( uvs !== null ) {

		geometry.setAttribute( "uv", new THREE.BufferAttribute( uvs, 2 ) )
	}

	//

	scene.add( new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { flatShading: !true, wireframe: true, map: texture } ) ) )
}

// const geometry = new THREE.SphereGeometry( 5 )
// scene.add( new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { flatShading: true, map: texture } ) ) )

// const buffer = RAWGD.encode( {
// 	vertices: geometry.attributes.position.array,
// 	indices: geometry.index.array,
// 	normals: geometry.attributes.normal.array,
// 	uvs: geometry.attributes.uv.array,
// } )

// const vertices = new Float32Array( [ - 5, 0, 5, 5, 0, 5, 5, 0, - 5, - 5, 0, - 5 ] )
// const indices = new Uint16Array( [ 0, 1, 2, 2, 3, 0 ] )
// const normals = new Float32Array( [ 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0 ] )

// const buffer = RAWGD.encode( { vertices, indices, normals } )

// downloadGeometry( buffer, "sphere.rawgd" )

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
