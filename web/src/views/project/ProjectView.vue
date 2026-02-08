<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useWebSocket } from '@/composables/useWebSocket'
import { PIPELINE_STEP_ORDER, PIPELINE_STEP_LABELS } from '@aicomic/shared'
import type { PipelineStep } from '@aicomic/shared'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const { connected, connect, disconnect } = useWebSocket()

const projectId = computed(() => route.params.id as string)

const stepNavItems = [
  { name: 'ProjectOverview', label: '概览', icon: 'Document', step: null },
  { name: 'ProjectEpisodes', label: '分集', icon: 'Collection', step: 'analysis' },
  { name: 'ProjectAssets', label: '视觉资产', icon: 'Picture', step: 'asset' },
  { name: 'ProjectStoryboard', label: '分镜', icon: 'Film', step: 'storyboard' },
  { name: 'ProjectGeneration', label: '生成', icon: 'MagicStick', step: 'anchor' },
  { name: 'ProjectPreview', label: '成片', icon: 'VideoPlay', step: 'assembly' },
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

// ===== 步骤确认相关 =====
const continuing = ref(false)

const isWaitingForConfirm = computed(() =>
  projectStore.projectStatus?.endsWith('_review') ?? false
)

const currentReviewStepName = computed(() => {
  const status = projectStore.projectStatus
  if (!status?.endsWith('_review')) return ''
  const step = status.replace('_review', '') as PipelineStep
  return PIPELINE_STEP_LABELS[step] || step
})

const nextStepName = computed(() => {
  const status = projectStore.projectStatus
  if (!status?.endsWith('_review')) return ''
  const step = status.replace('_review', '') as PipelineStep
  const currentIndex = PIPELINE_STEP_ORDER.indexOf(step)
  const nextIndex = currentIndex + 1
  if (nextIndex >= PIPELINE_STEP_ORDER.length) return '完成'
  return PIPELINE_STEP_LABELS[PIPELINE_STEP_ORDER[nextIndex]] || PIPELINE_STEP_ORDER[nextIndex]
})

const isLastStep = computed(() => {
  const status = projectStore.projectStatus
  if (!status?.endsWith('_review')) return false
  const step = status.replace('_review', '') as PipelineStep
  const currentIndex = PIPELINE_STEP_ORDER.indexOf(step)
  return currentIndex >= PIPELINE_STEP_ORDER.length - 1
})

async function continueStep() {
  continuing.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/projects/${projectId.value}/pipeline/continue`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    )
    ElMessage.success('已确认，继续执行下一步')
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || '操作失败'
    ElMessage.error(msg)
  } finally {
    continuing.value = false
  }
}

function getStatusColor(status: string) {
  if (status?.endsWith('_review')) return '#fdcb6e'
  if (status?.endsWith('_processing')) return '#6c5ce7'
  const map: Record<string, string> = {
    created: '#a0a0b8',
    completed: '#00b894',
    failed: '#d63031',
  }
  return map[status] || '#a0a0b8'
}

function getStatusLabel(status: string) {
  if (!status) return '已创建'
  if (status?.endsWith('_review')) {
    const step = status.replace('_review', '') as PipelineStep
    return `${PIPELINE_STEP_LABELS[step] || step} - 待确认`
  }
  if (status?.endsWith('_processing')) {
    const step = status.replace('_processing', '') as PipelineStep
    return `${PIPELINE_STEP_LABELS[step] || step} - 执行中`
  }
  const map: Record<string, string> = {
    created: '已创建',
    completed: '已完成',
    failed: '失败',
  }
  return map[status] || status
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
  <div class="project-page">
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>

    <!-- 顶部导航 -->
    <header class="topbar">
      <div class="topbar-left">
        <button class="back-btn" @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </button>
        <div class="divider"></div>
        <h1 class="project-name">{{ projectStore.projectName }}</h1>
        <div class="status-dot" :style="{ background: getStatusColor(projectStore.projectStatus) }"></div>
        <span class="status-text" :style="{ color: getStatusColor(projectStore.projectStatus) }">
          {{ getStatusLabel(projectStore.projectStatus) }}
        </span>
      </div>
      <div class="topbar-right">
        <div class="connection-chip" :class="connected ? 'online' : 'offline'">
          <span class="dot"></span>
          {{ connected ? '已连接' : '未连接' }}
        </div>
      </div>
    </header>

    <!-- 步骤导航条 -->
    <nav class="step-bar">
      <div class="step-track">
        <div
          v-for="(item, index) in stepNavItems"
          :key="item.name"
          class="step-tab"
          :class="{
            active: route.name === item.name,
            disabled: !isStepAccessible(item.step),
            completed: item.step && projectStore.isStepCompleted(item.step),
          }"
          @click="isStepAccessible(item.step) && navigateTo(item)"
        >
          <div class="step-num">
            <el-icon v-if="item.step && projectStore.isStepCompleted(item.step)" :size="14"><Check /></el-icon>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="step-label">{{ item.label }}</span>
        </div>
      </div>
    </nav>

    <!-- 进度条 (如果有) -->
    <div v-if="projectStore.progress" class="progress-strip">
      <div class="progress-inner">
        <span class="progress-msg">{{ projectStore.progress.message }}</span>
        <el-progress
          :percentage="projectStore.progress.total > 0 ? Math.round((projectStore.progress.completed / projectStore.progress.total) * 100) : 0"
          :stroke-width="4"
          :show-text="true"
          color="#6c5ce7"
          style="flex:1; max-width: 300px"
        />
      </div>
    </div>

    <!-- 步骤确认条 -->
    <div v-if="isWaitingForConfirm" class="confirm-strip">
      <div class="confirm-inner">
        <div class="confirm-info">
          <el-icon :size="18"><CircleCheck /></el-icon>
          <span class="confirm-msg">
            「{{ currentReviewStepName }}」已完成，请查看结果后继续
          </span>
        </div>
        <button
          v-if="!isLastStep"
          class="btn-continue"
          :disabled="continuing"
          @click="continueStep"
        >
          <span v-if="continuing" class="loading-spinner-sm"></span>
          <el-icon v-else><Right /></el-icon>
          {{ continuing ? '执行中...' : `继续执行「${nextStepName}」` }}
        </button>
        <span v-else class="complete-badge">
          <el-icon><SuccessFilled /></el-icon>
          全部步骤已完成
        </span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="projectStore.error" class="error-strip">
      <el-alert :title="projectStore.error" type="error" show-icon :closable="true" @close="projectStore.setError('')" />
    </div>

    <!-- 内容区 -->
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.project-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: var(--bg-deep);
  position: relative;
  overflow: hidden;
}

.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: rgba(108, 92, 231, 0.08);
  top: -200px;
  right: -100px;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: rgba(0, 206, 201, 0.06);
  bottom: -100px;
  left: -50px;
}

/* 顶栏 */
.topbar {
  position: relative;
  z-index: 10;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(10, 10, 26, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.back-btn:hover {
  color: var(--primary-light);
  border-color: var(--primary);
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border);
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
}

.connection-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.connection-chip.online {
  background: rgba(0, 184, 148, 0.1);
  color: #00b894;
}

.connection-chip.offline {
  background: rgba(160, 160, 184, 0.1);
  color: #a0a0b8;
}

.connection-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* 步骤导航条 */
.step-bar {
  position: relative;
  z-index: 10;
  background: rgba(15, 15, 35, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  padding: 0 24px;
}

.step-track {
  display: flex;
  gap: 4px;
  max-width: 800px;
  margin: 0 auto;
}

.step-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}

.step-tab:hover:not(.disabled) {
  border-bottom-color: rgba(108, 92, 231, 0.3);
}

.step-tab.active {
  border-bottom-color: var(--primary);
}

.step-tab.disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--bg-surface);
  color: var(--text-muted);
}

.step-tab.active .step-num {
  background: var(--primary);
  color: #fff;
}

.step-tab.completed .step-num {
  background: #00b894;
  color: #fff;
}

.step-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.step-tab.active .step-label {
  color: var(--primary-light);
}

/* 进度条和错误 */
.progress-strip {
  background: rgba(108, 92, 231, 0.06);
  border-bottom: 1px solid var(--border);
  padding: 8px 24px;
  flex-shrink: 0;
  z-index: 10;
  position: relative;
}

.progress-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.progress-msg {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.error-strip {
  padding: 8px 24px;
  flex-shrink: 0;
  z-index: 10;
  position: relative;
}

/* 步骤确认条 */
.confirm-strip {
  background: rgba(253, 203, 110, 0.08);
  border-bottom: 1px solid rgba(253, 203, 110, 0.2);
  padding: 10px 24px;
  flex-shrink: 0;
  z-index: 10;
  position: relative;
}

.confirm-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.confirm-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fdcb6e;
}

.confirm-msg {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.btn-continue {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
  white-space: nowrap;
  box-shadow: 0 0 12px rgba(0, 206, 201, 0.2);
}

.btn-continue:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(0, 206, 201, 0.4);
  transform: translateY(-1px);
}

.btn-continue:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.complete-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(0, 184, 148, 0.12);
  color: #00b894;
  font-size: 13px;
  font-weight: 500;
}

/* 内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  position: relative;
  z-index: 1;
}
</style>
