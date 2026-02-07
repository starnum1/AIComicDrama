<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* 确保 Element Plus 组件不被全局样式干扰 */
.el-button + .el-button {
  margin-left: 8px;
}
</style>
