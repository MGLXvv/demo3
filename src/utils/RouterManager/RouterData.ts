import type { RouteResponse } from './types';

export interface IRouteDataSource {
    fetch(): Promise<RouteResponse>;
    readCache(): RouteResponse | null;
    writeCache(resp: RouteResponse): void;
    isSameVersion(localVersion: string | null, remoteVersion: string): boolean;
}

export class HttpRouteDataSource implements IRouteDataSource {
    private CACHE_KEY = 'dynamic_routes';
    private VERSION_KEY = 'dynamic_routes_version';

    async fetch(): Promise<RouteResponse> {
        const res = await fetch('/api/routes'); // 替换为你的请求封装
        if (!res.ok) throw new Error('fetch routes failed');
        return res.json();
    }

    readCache(): RouteResponse | null {
        try {
            const raw = localStorage.getItem(this.CACHE_KEY);
            const version = localStorage.getItem(this.VERSION_KEY);
            if (!raw || !version) return null;
            const routes = JSON.parse(raw);
            return { version, routes };
        } catch {
            return null;
        }
    }

    writeCache(resp: RouteResponse) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(resp.routes));
        localStorage.setItem(this.VERSION_KEY, resp.version);
    }

    isSameVersion(localVersion: string | null, remoteVersion: string) {
        return !!localVersion && localVersion === remoteVersion;
    }
}
