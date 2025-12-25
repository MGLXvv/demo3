import { DynamicRouteManager } from './RouterManager';
import { HttpRouteDataSource } from './RouterData.ts';

const dynamicRouteManager = new DynamicRouteManager(new HttpRouteDataSource());

export { dynamicRouteManager };
export * from './types';
export type { IRouteDataSource } from './RouterData';
