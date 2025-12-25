import type { Component } from 'vue';

// 组件白名单，后端只能返回这些 key
export const viewMap: Record<string, () => Promise<Component>> = {
    home: () => import("")
};
