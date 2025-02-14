import path from "node:path"
import { defineConfig } from "vite"
import eslintPlugin from "vite-plugin-eslint"

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
	},
	resolve: {
		alias: {
			"@lib": path.resolve( __dirname, "./src/library" ),
		},
	},
	plugins: [
		eslintPlugin(),
	]
} )
