import type { BuiltRoute, RouteRecord } from './types';
import type { IComponentResolver } from './componentResolver';

export class RouteConverter {
    constructor(private resolver: IComponentResolver) {}

    toVueRoutes(nodes: RouteRecord[]): BuiltRoute[] {
        const walk = (n: RouteRecord): BuiltRoute => {
            const route: BuiltRoute = {
                path: n.path,
                name: n.name,
                component: this.resolver.resolve(n.componentKey),
                redirect: n.redirect,
                meta: n.meta,
                props: n.props,
                children: n.children?.map(walk)
            };
            if (n.hidden ?? n.meta?.hidden) (route as any).hidden = true;
            return route;
        };
        return nodes.map(walk);
    }
}
