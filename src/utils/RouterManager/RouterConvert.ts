import type { BuiltRoute, ServerRouteNode } from './types';
import type { IComponentResolver } from './ComponentResolver';

export class RouteConverter {
    constructor(private resolver: IComponentResolver) {}

    toVueRoutes(nodes: ServerRouteNode[], componentMapping?: Record<string, string>): BuiltRoute[] {
        const walk = (n: ServerRouteNode): BuiltRoute => {
            const mappedKey = n.componentId ? componentMapping?.[n.componentId] : undefined;
            const keyToUse = mappedKey ?? n.componentKey;
            const route: BuiltRoute = {
                path: n.path,
                name: n.name,
                meta: n.meta,
                props: n.props,
                children: n.children?.map(walk)
            };
            const resolved = this.resolver.resolve(keyToUse);
            if (resolved) route.component = resolved;
            if (n.redirect) route.redirect = n.redirect;
            if (n.hidden ?? n.meta?.hidden) (route as any).hidden = true;
            return route;
        };
        return nodes.map(walk);
    }
}
