<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">RouterManager Demo</div>
      <nav class="nav">
        <RouterLink to="/route-manager">路由管理</RouterLink>
        <RouterLink to="/home">/home</RouterLink>
        <RouterLink to="/about">/about</RouterLink>
        <RouterLink to="/workspace/profile">/workspace/profile</RouterLink>
      </nav>
    </header>

    <main class="content">
      <RouterView />
    </main>
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
  justify-content: space-between;
  padding: 14px 24px;
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

.nav {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.nav a {
  padding: 6px 10px;
  border-radius: 8px;
  color: #1f2933;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav a.router-link-active {
  background: #1f6feb;
  color: #fff;
}

.nav a:hover {
  background: #e7efff;
}

.content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
