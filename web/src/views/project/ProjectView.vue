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
  if (!step) return true // 概览始终可访问
  const stepIndex = PIPELINE_STEP_ORDER.indexOf(step as any)
  const currentIndex = PIPELINE_STEP_ORDER.indexOf(projectStore.currentStep as any)
  return stepIndex <= currentIndex || projectStore.isStepCompleted(step)
}

function navigateTo(item: (typeof stepNavItems)[number]) {
  if (item.name === 'ProjectStoryboard') {
    // 分镜需要 episodeId，默认跳转到第一集（这里先跳到 episodes）
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
  <div class="project-layout">
    <!-- 左侧步骤导航 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <el-button text @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h3 class="project-title">{{ projectStore.projectName }}</h3>
        <el-tag
          v-if="connected"
          type="success"
          size="small"
          effect="dark"
          round
        >
          已连接
        </el-tag>
        <el-tag v-else type="danger" size="small" effect="dark" round>
          未连接
        </el-tag>
      </div>

      <nav class="step-nav">
        <div
          v-for="item in stepNavItems"
          :key="item.name"
          class="step-item"
          :class="{
            active: route.name === item.name,
            disabled: !isStepAccessible(item.step),
            completed: item.step && projectStore.isStepCompleted(item.step),
          }"
          @click="isStepAccessible(item.step) && navigateTo(item)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
          <el-icon v-if="item.step && projectStore.isStepCompleted(item.step)" class="check-icon">
            <CircleCheck />
          </el-icon>
        </div>
      </nav>

      <!-- 进度信息 -->
      <div v-if="projectStore.progress" class="progress-info">
        <p class="progress-msg">{{ projectStore.progress.message }}</p>
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
      <el-alert
        v-if="projectStore.error"
        :title="projectStore.error"
        type="error"
        show-icon
        :closable="true"
        class="error-alert"
        @close="projectStore.setError('')"
      />
    </aside>

    <!-- 右侧内容区 -->
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.project-layout {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.project-title {
  margin: 12px 0 8px;
  font-size: 16px;
  color: #303133;
  word-break: break-all;
}

.step-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
  transition: all 0.2s;
  position: relative;
}

.step-item:hover:not(.disabled) {
  background: #f5f7fa;
  color: #409eff;
}

.step-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}

.step-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #409eff;
}

.step-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.step-item.completed {
  color: #67c23a;
}

.check-icon {
  margin-left: auto;
  color: #67c23a;
}

.progress-info {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
}

.progress-msg {
  font-size: 12px;
  color: #909399;
  margin: 0 0 8px;
}

.error-alert {
  margin: 8px 16px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
