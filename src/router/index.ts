import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/route-manager',
            meta: { static: true }
        },
        {
            path: '/route-manager',
            name: 'RouteManagerDemo',
            component: () => import('../views/RouteManagerDemo.vue'),
            meta: { static: true }
        }
    ]
});

export { router };
