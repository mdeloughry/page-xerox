import { A as AdapterOptions } from './types-D43B_LsG.cjs';

interface AstroIntegration {
    name: string;
    hooks: Record<string, (...args: any[]) => any>;
}
declare function pageXerox(options?: AdapterOptions): AstroIntegration;

export { pageXerox as default };
