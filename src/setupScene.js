import * as THREE from "three"
import { MapControls } from "three/addons/controls/MapControls"

export function setupScene( canvas ) {

	const scene = new THREE.Scene()

	const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100 )
	camera.position.set( 10, 15, 10 )
	camera.lookAt( 0, 0, 0 )

	const controls = new MapControls( camera, canvas )
	controls.enableDamping = true
	controls.zoomToCursor = true

	const renderer = new THREE.WebGLRenderer( { canvas } )
	renderer.setPixelRatio( window.devicePixelRatio )
	renderer.setSize( window.innerWidth, window.innerHeight )

	const render = () => {

		requestAnimationFrame( render )

		controls.update()

		renderer.render( scene, camera )
	}

	render()

	//

	{
		const dirLight = new THREE.DirectionalLight( 0xffffff, 0.5 )
		dirLight.position.set( - 2, 20, 4 )
		scene.add( dirLight )
	}

	{
		const dirLight = new THREE.DirectionalLight( 0xffffff, 0.5 )
		dirLight.position.set( 2, 20, - 4 )
		scene.add( dirLight )
	}

	const hemiLight = new THREE.HemisphereLight( 0xcaf0f8, 0xd5bdaf )
	hemiLight.position.set( 0, 20, 0 )
	scene.add( hemiLight )

	//

	return {
		scene,
		camera,
		renderer,
	}
}
