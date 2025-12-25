import router from '@/router';
import type { BuiltRoute, RouteResponse } from './types';
import type { IRouteDataSource } from './dataSource';
import { RouteConverter } from './RouterConvert.ts';
import { MapResolver } from './componentResolver';

export interface LoadOptions { force?: boolean; }

export class DynamicRouteManager {
    private loaded = false;
    private loading: Promise<void> | null = null;
    private converter = new RouteConverter(new MapResolver());

    constructor(private dataSource: IRouteDataSource) {}

    async ensureLoaded(opts: LoadOptions = {}) {
        if (this.loaded && !opts.force) return;
        if (this.loading) return this.loading;

        this.loading = this.doLoad(opts).finally(() => { this.loading = null; });
        return this.loading;
    }

    private async doLoad(opts: LoadOptions) {
        const cached = this.dataSource.readCache();
        const remote = await this.dataSource.fetch();
        const useCache = !opts.force && cached && this.dataSource.isSameVersion(cached.version, remote.version);
        const resp: ServerRouteResponse = useCache ? cached! : remote;

        const built = this.converter.toVueRoutes(resp.routes);
        this.registerRoutes(built);
        if (!useCache) this.dataSource.writeCache(remote);
        this.loaded = true;
    }

    private registerRoutes(routes: BuiltRoute[]) {
        routes.forEach(r => router.addRoute(r));
    }

    // 如需对外暴露已注册的动态路由
    getDynamicRoutes(): BuiltRoute[] {
        return router.getRoutes().filter(r => r.name && !(r.meta as any)?.static);
    }
}
