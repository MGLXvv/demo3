import type { Component } from 'vue';
import { viewMap } from './ViewMap';

export interface IComponentResolver {
    resolve(key?: string): (() => Promise<Component>) | undefined;
}

const fallback = () => async () => {
    const mod = await import('../../views/ComponentFallback.vue');
    return mod.default as Component;
};

export class MapResolver implements IComponentResolver {
    resolve(key?: string) {
        if (!key) return fallback();
        return viewMap[key] ?? fallback();
    }
}
