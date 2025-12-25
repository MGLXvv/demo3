import type { Component } from 'vue';

// 组件白名单，后端只能返回这些 key
export const viewMap: Record<string, () => Promise<Component>> = {
    home: () => import("../../views/Home.vue"),
    my: () => import("../../views/My.vue"),
    about: () => import("../../views/About.vue"),
    alpha: () => import("../../views/Alpha.vue"),
    beta: () => import("../../views/Beta.vue"),
    gamma: () => import("../../views/Gamma.vue"),
    delta: () => import("../../views/Delta.vue"),
    layout: () => import("../../views/RouteContainer.vue")
};
