// Types for geometry data
interface RAWGDGeometry {

	/** Vertex positions [x,y,z, x,y,z, ...] */
	vertices: Float32Array;

	/** Triangle indices [i1,i2,i3, i1,i2,i3, ...] (optional) */
	indices?: Uint16Array;

	/** Vertex normals [nx,ny,nz, nx,ny,nz, ...] (optional) */
	normals?: Float32Array;

	/** Texture coordinates [u,v, u,v, ...] (optional) */
	uvs?: Float32Array;

	/** Vertex colors RGB[r,g,b, r,g,b, ...] or RGBA[r,g,b,a, r,g,b,a, ...] (optional) */
	colors?: Float32Array;
}

interface DecodedRAWGDGeometry {

	/** Format version */
	version: { major: number; minor: number };

	/** Vertex positions [x,y,z, x,y,z, ...] */
	vertices: Float32Array;

	/** Triangle indices [i1,i2,i3, i1,i2,i3, ...] or null if not present */
	indices: Uint16Array | null;

	/** Vertex normals [nx,ny,nz, nx,ny,nz, ...] or null if not present */
	normals: Float32Array | null;

	/** Texture coordinates [u,v, u,v, ...] or null if not present */
	uvs: Float32Array | null;

	/** RGB vertex colors [r,g,b, r,g,b, ...] or null if not present */
	colorsRGB: Float32Array | null;

	/** RGBA vertex colors [r,g,b,a, r,g,b,a, ...] or null if not present */
	colorsRGBA: Float32Array | null;
}

/**
* Encodes 3D geometry data into a binary RAWGD format buffer
*/
export function encode( geometry: RAWGDGeometry ): ArrayBuffer;

/**
* Decodes a binary RAWGD format buffer into 3D geometry data
*
* @throws {Error} If file format is invalid
*/
export function decode( buffer: ArrayBuffer ): DecodedRAWGDGeometry;
