import { A as AdapterOptions } from './types-D43B_LsG.cjs';

interface VitePlugin {
    name: string;
    closeBundle?: () => Promise<void>;
    configureServer?: (server: any) => void;
    configResolved?: (config: any) => void;
}
declare function pageXerox(options?: AdapterOptions): VitePlugin;

export { pageXerox as default };
