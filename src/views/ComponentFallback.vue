<script setup lang="ts">
defineProps<{ missing?: string }>();
</script>

<template>
  <section class="page">
    <h1>组件缺失</h1>
    <p>未找到映射的组件：{{ missing || '未指定' }}</p>
  </section>
</template>

<style scoped>
.page {
  padding: 20px;
  background: #fff3f3;
  border: 1px solid #f5c2c2;
  border-radius: 12px;
  color: #8a1c1c;
}
</style>
