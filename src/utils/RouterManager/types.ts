import type { RouteMeta, RouteRecordRaw } from 'vue-router';

export interface AppRouteMeta extends RouteMeta {
    roles?: string[];
    icon?: string;
    keepAlive?: boolean;
    hidden?: boolean;
    activeMenu?: string;
}

export interface ServerRouteNode {
    path: string;
    name: string;
    componentKey?: string;
    componentId?: string;
    redirect?: string;
    meta?: AppRouteMeta;
    props?: any;
    hidden?: boolean;
    children?: ServerRouteNode[];
}

export interface ServerRouteResponse {
    version: string;
    routes: ServerRouteNode[];
    componentMapping?: Record<string, string>; // id -> componentKey
}

export type BuiltRoute = RouteRecordRaw & { hidden?: boolean };
