import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{input:{game:'index.html',garage:'garage.html',gallery:'gallery.html'},output:{manualChunks(id){
 if(id.includes('@dimforge/rapier3d-compat'))return 'physics';
 if(id.includes('node_modules/three'))return 'three';
}}}}});
