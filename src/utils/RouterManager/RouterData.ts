import type { ServerRouteResponse } from './types';

export interface IRouteDataSource {
    fetch(): Promise<ServerRouteResponse>;
    readCache(): ServerRouteResponse | null;
    writeCache(resp: ServerRouteResponse): void;
    isSameVersion(localVersion: string | null, remoteVersion: string): boolean;
}

export class HttpRouteDataSource implements IRouteDataSource {
    private CACHE_KEY = 'dynamic_routes';
    private VERSION_KEY = 'dynamic_routes_version';

    async fetch(): Promise<ServerRouteResponse> {
        const res = await fetch('/api/routes'); // 替换为你的请求封装
        if (!res.ok) throw new Error('fetch routes failed');
        return res.json();
    }

    readCache(): ServerRouteResponse | null {
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

    writeCache(resp: ServerRouteResponse) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(resp.routes));
        localStorage.setItem(this.VERSION_KEY, resp.version);
    }

    isSameVersion(localVersion: string | null, remoteVersion: string) {
        return !!localVersion && localVersion === remoteVersion;
    }
}

// 简单的 mock 数据源，用于本地调试
const mockData: ServerRouteResponse = {
    version: 'mock-1.0.0',
    componentMapping: {
        '1001': 'home',
        '1002': 'about',
        '1003': 'alpha',
        '1004': 'beta'
    },
    routes: [
        { path: '/home', name: 'Home', componentId: '1001', meta: { title: '首页' } },
        { path: '/about', name: 'About', componentId: '1002', meta: { title: '关于' } },
        { path: '/alpha', name: 'Alpha', componentId: '1003', meta: { title: 'Alpha' } },
        { path: '/legacy', name: 'Legacy', redirect: '/home', meta: { title: '重定向示例' } }
    ]
};

const LOCAL_ROUTE_KEY = 'router_manager_local_routes';

export class MockRouteDataSource implements IRouteDataSource {
    private cache: ServerRouteResponse | null = null;
    async fetch(): Promise<ServerRouteResponse> {
        const local = readLocalRouteData();
        if (local) return local;
        await new Promise(r => setTimeout(r, 120));
        return JSON.parse(JSON.stringify(mockData));
    }
    readCache(): ServerRouteResponse | null {
        return this.cache;
    }
    writeCache(resp: ServerRouteResponse): void {
        this.cache = resp;
    }
    isSameVersion(localVersion: string | null, remoteVersion: string): boolean {
        return !!localVersion && localVersion === remoteVersion;
    }
}

export function readLocalRouteData(): ServerRouteResponse | null {
    try {
        const raw = localStorage.getItem(LOCAL_ROUTE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ServerRouteResponse;
    } catch {
        return null;
    }
}

export function writeLocalRouteData(resp: ServerRouteResponse) {
    localStorage.setItem(LOCAL_ROUTE_KEY, JSON.stringify(resp));
}
