<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';

type NavLink = { path: string; name?: string };

const router = useRouter();
const dynamicLinks = ref<NavLink[]>([]);

const refreshLinks = () => {
  const routes = router.getRoutes();
  dynamicLinks.value = routes
    .filter(r => !r.meta?.static && r.path && r.path !== '/route-manager')
    .map(r => ({ path: r.path, name: r.name?.toString() }));
};

let routesUpdatedHandler: (() => void) | null = null;
let afterEachOff: (() => void) | void;

onMounted(() => {
  refreshLinks();
  afterEachOff = router.afterEach(() => refreshLinks());
  routesUpdatedHandler = () => refreshLinks();
  window.addEventListener('routes-updated', routesUpdatedHandler);
});

onUnmounted(() => {
  if (afterEachOff) afterEachOff();
  if (routesUpdatedHandler) window.removeEventListener('routes-updated', routesUpdatedHandler);
});
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">RouterManager Demo</div>
    </header>
    <div class="layout">
      <aside class="sidebar">
        <nav class="nav">
          <div class="nav-group">
            <p class="nav-title">工具</p>
            <RouterLink to="/route-manager">路由管理</RouterLink>
          </div>
          <div class="nav-group">
            <p class="nav-title">导航测试（当前路由树）</p>
            <RouterLink
              v-for="link in dynamicLinks"
              :key="link.path"
              :to="link.path"
              :style="{ paddingLeft: `${(link.path.split('/').length - 2) * 10 + 8}px` }"
            >
              {{ link.path }} <span v-if="link.name" class="muted">({{ link.name }})</span>
            </RouterLink>
          </div>
        </nav>
      </aside>
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  background: radial-gradient(600px at 10% 20%, #d0d8ff 0, transparent 40%),
    radial-gradient(700px at 80% 0%, #e1fff3 0, transparent 40%),
    linear-gradient(180deg, #f9fbff 0%, #ffffff 100%);
  color: #1f2933;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 14px 20px;
  border-bottom: 1px solid #e3e8ef;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  z-index: 10;
}

.brand {
  font-weight: 700;
  letter-spacing: 0.4px;
}

.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: calc(100vh - 54px);
}

.content {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.sidebar {
  border-right: 1px solid #e3e8ef;
  background: #f8fafc;
  padding: 18px;
}

.nav {
  display: grid;
  gap: 16px;
  font-size: 14px;
}

.nav-group {
  display: grid;
  gap: 8px;
}

.nav-title {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  letter-spacing: 0.2px;
}

.nav a {
  padding: 8px 10px;
  border-radius: 8px;
  color: #1f2933;
  text-decoration: none;
  transition: all 0.2s ease;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.nav a.router-link-active {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
}

.nav a:hover {
  background: #e7efff;
}

.muted {
  color: #6b7280;
  font-size: 12px;
}
</style>
