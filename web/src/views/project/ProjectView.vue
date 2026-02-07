<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useWebSocket } from '@/composables/useWebSocket'
import { PIPELINE_STEP_ORDER } from '@aicomic/shared'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const { connected, connect, disconnect } = useWebSocket()

const projectId = computed(() => route.params.id as string)

const stepNavItems = [
  { name: 'ProjectOverview', label: '概览', icon: 'Document', step: null },
  { name: 'ProjectEpisodes', label: '分集预览', icon: 'Collection', step: 'analysis' },
  { name: 'ProjectAssets', label: '视觉资产', icon: 'Picture', step: 'asset' },
  { name: 'ProjectStoryboard', label: '分镜编辑', icon: 'Film', step: 'storyboard' },
  { name: 'ProjectGeneration', label: '生成监控', icon: 'Loading', step: 'anchor' },
  { name: 'ProjectPreview', label: '成片预览', icon: 'VideoPlay', step: 'assembly' },
]

function isStepAccessible(step: string | null): boolean {
  if (!step) return true
  const stepIndex = PIPELINE_STEP_ORDER.indexOf(step as any)
  const currentIndex = PIPELINE_STEP_ORDER.indexOf(projectStore.currentStep as any)
  return stepIndex <= currentIndex || projectStore.isStepCompleted(step)
}

function navigateTo(item: (typeof stepNavItems)[number]) {
  if (item.name === 'ProjectStoryboard') {
    router.push({ name: 'ProjectEpisodes', params: { id: projectId.value } })
  } else {
    router.push({ name: item.name, params: { id: projectId.value } })
  }
}

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(`/api/projects/${projectId.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    projectStore.setProject(data.id, data.name, data.status, data.currentStep || '')
    connect(projectId.value)
  } catch (err: any) {
    if (err.response?.status === 401) {
      router.push('/login')
    }
  }
})

onUnmounted(() => {
  disconnect()
  projectStore.$reset()
})
</script>

<template>
  <el-container class="project-container">
    <!-- 左侧步骤导航 -->
    <el-aside width="240px" class="sidebar">
      <div class="sidebar-top">
        <div class="back-btn" @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回项目列表</span>
        </div>
        <div class="project-info">
          <h3 class="project-title">{{ projectStore.projectName }}</h3>
          <div class="connection-status">
            <span
              class="status-dot"
              :class="connected ? 'online' : 'offline'"
            ></span>
            <span class="status-text">{{ connected ? '已连接' : '未连接' }}</span>
          </div>
        </div>
      </div>

      <nav class="step-nav">
        <div class="nav-label">流水线步骤</div>
        <div
          v-for="(item, index) in stepNavItems"
          :key="item.name"
          class="step-item"
          :class="{
            active: route.name === item.name,
            disabled: !isStepAccessible(item.step),
            completed: item.step && projectStore.isStepCompleted(item.step),
          }"
          @click="isStepAccessible(item.step) && navigateTo(item)"
        >
          <div class="step-index" :class="{
            'completed-index': item.step && projectStore.isStepCompleted(item.step),
            'active-index': route.name === item.name,
          }">
            <el-icon v-if="item.step && projectStore.isStepCompleted(item.step)"><Check /></el-icon>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="step-label">
            <span class="step-name">{{ item.label }}</span>
          </div>
        </div>
      </nav>

      <!-- 进度信息 -->
      <div v-if="projectStore.progress" class="progress-section">
        <div class="progress-label">{{ projectStore.progress.message }}</div>
        <el-progress
          :percentage="
            projectStore.progress.total > 0
              ? Math.round((projectStore.progress.completed / projectStore.progress.total) * 100)
              : 0
          "
          :stroke-width="6"
          :show-text="true"
        />
      </div>

      <!-- 错误信息 -->
      <div v-if="projectStore.error" class="error-section">
        <el-alert
          :title="projectStore.error"
          type="error"
          show-icon
          :closable="true"
          @close="projectStore.setError('')"
        />
      </div>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container>
      <el-header class="content-header">
        <h2 class="content-title">
          {{ stepNavItems.find(s => s.name === route.name)?.label || '项目详情' }}
        </h2>
        <div class="content-actions">
          <el-tag
            :type="projectStore.status === 'completed' ? 'success' : projectStore.status === 'failed' ? 'danger' : 'primary'"
            effect="light"
            size="default"
          >
            {{ projectStore.status }}
          </el-tag>
        </div>
      </el-header>

      <el-main class="content-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.project-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ===== 左侧导航 ===== */
.sidebar {
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-top {
  padding: 0;
  border-bottom: 1px solid #f0f0f0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  cursor: pointer;
  color: #606266;
  font-size: 13px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #409eff;
}

.project-info {
  padding: 0 20px 16px;
}

.project-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  word-break: break-all;
  line-height: 1.4;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #67c23a;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.4);
}

.status-dot.offline {
  background: #c0c4cc;
}

.status-text {
  font-size: 12px;
  color: #909399;
}

/* ===== 步骤导航 ===== */
.step-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-label {
  padding: 0 20px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.step-item:hover:not(.disabled) {
  background: #f5f7fa;
}

.step-item.active {
  background: #ecf5ff;
}

.step-item.disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.step-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: #f0f2f5;
  color: #909399;
  flex-shrink: 0;
  transition: all 0.2s;
}

.step-index.active-index {
  background: #409eff;
  color: #fff;
}

.step-index.completed-index {
  background: #67c23a;
  color: #fff;
}

.step-name {
  font-size: 14px;
  color: #303133;
}

.step-item.active .step-name {
  font-weight: 600;
  color: #409eff;
}

.step-item.disabled .step-name {
  color: #c0c4cc;
}

/* ===== 进度和错误 ===== */
.progress-section {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.progress-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.error-section {
  padding: 8px 16px 16px;
}

/* ===== 右侧内容 ===== */
.content-header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.content-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.content-main {
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}
</style>
