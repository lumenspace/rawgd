import path from "node:path"
import { defineConfig } from "vite"
import eslintPlugin from "vite-plugin-eslint"
import { viteStaticCopy } from "vite-plugin-static-copy"

export default defineConfig( {
	server: {
		host: true,
	},
	optimizeDeps: {
		esbuildOptions: {
			target: "esnext",
		}
	},
	build: {
		target: "esnext",
		lib: {
			entry: "src/library/rawgd/index.js",
			name: "RAWGD",
			formats: [ "es", "umd" ],
			fileName: format => `rawgd/index.${ format }.js`
		},
	},
	resolve: {
		alias: {
			"@lib": path.resolve( __dirname, "./src/library" ),
		},
	},
	plugins: [
		eslintPlugin(),
		viteStaticCopy( {
			targets: [
				{ src: "src/library/rawgd/index.d.ts", dest: "./rawgd" }
			]
		} )
	]
} )
