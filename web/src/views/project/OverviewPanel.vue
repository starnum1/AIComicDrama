<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const projectStore = useProjectStore()
const projectId = computed(() => route.params.id as string)

const novelText = ref('')
const uploading = ref(false)
const starting = ref(false)
const novelUploaded = ref(false)

// 加载时检查是否已有小说
onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(`/api/projects/${projectId.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (data.novel) {
      novelUploaded.value = true
    }
  } catch {
    // ignore
  }
})

// 是否处于失败状态
const isFailed = computed(() => projectStore.projectStatus === 'failed')

// 允许开始生成的条件：小说已上传 且 项目状态允许启动
const canStart = computed(() => {
  const status = projectStore.projectStatus
  const allowedStatuses = ['', 'created', 'failed']
  return novelUploaded.value && (!status || allowedStatuses.includes(status))
})

async function uploadNovel() {
  if (!novelText.value.trim()) {
    ElMessage.warning('请输入小说文本')
    return
  }

  uploading.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/projects/${projectId.value}/novel`,
      { text: novelText.value },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    novelUploaded.value = true
    ElMessage.success(`小说上传成功（${novelText.value.length} 字）`)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function startPipeline() {
  starting.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/projects/${projectId.value}/pipeline/start`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    )
    ElMessage.success('流水线已启动，正在分析小说...')
    projectStore.setCurrentStep('analysis')
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || '启动失败'
    ElMessage.error(msg)
    console.error('Pipeline start failed:', err)
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div class="overview-panel">
    <!-- 欢迎区 -->
    <div class="welcome-section">
      <h1 class="page-title">项目概览</h1>
      <p class="page-desc">上传小说文本，AI 将自动分析角色、场景并生成动漫短剧</p>
    </div>

    <!-- 项目状态卡片 -->
    <div class="status-grid">
      <div class="info-card">
        <div class="info-icon purple"><el-icon :size="20"><Document /></el-icon></div>
        <div class="info-detail">
          <span class="info-label">项目名称</span>
          <span class="info-value">{{ projectStore.projectName || '-' }}</span>
        </div>
      </div>
      <div class="info-card">
        <div class="info-icon cyan"><el-icon :size="20"><Operation /></el-icon></div>
        <div class="info-detail">
          <span class="info-label">当前状态</span>
          <span class="info-value">{{ projectStore.projectStatus || '已创建' }}</span>
        </div>
      </div>
      <div class="info-card">
        <div class="info-icon pink"><el-icon :size="20"><VideoPlay /></el-icon></div>
        <div class="info-detail">
          <span class="info-label">当前步骤</span>
          <span class="info-value">{{ projectStore.currentStep || '未开始' }}</span>
        </div>
      </div>
    </div>

    <!-- 上传小说 -->
    <div class="upload-section">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><EditPen /></el-icon>
          上传小说文本
        </h2>
        <span v-if="novelUploaded" class="uploaded-badge">
          <el-icon><CircleCheck /></el-icon>
          已上传
        </span>
      </div>

      <div class="textarea-wrapper">
        <el-input
          v-model="novelText"
          type="textarea"
          :rows="14"
          placeholder="请粘贴小说文本内容（建议 5,000 - 30,000 字）..."
          :disabled="novelUploaded"
          resize="vertical"
        />
        <div class="char-count">
          {{ novelText.length.toLocaleString() }} 字
        </div>
      </div>

      <div class="actions">
        <button
          v-if="!novelUploaded"
          class="btn-primary"
          :disabled="!novelText.trim() || uploading"
          @click="uploadNovel"
        >
          <span v-if="uploading" class="loading-spinner"></span>
          <el-icon v-else><Upload /></el-icon>
          {{ uploading ? '上传中...' : '上传小说' }}
        </button>

        <button
          v-if="canStart"
          class="btn-start"
          :disabled="starting"
          @click="startPipeline"
        >
          <span v-if="starting" class="loading-spinner"></span>
          <el-icon v-else><VideoPlay /></el-icon>
          {{ starting ? '启动中...' : isFailed ? '重新生成' : '开始生成' }}
        </button>
      </div>
    </div>

    <!-- 流程说明 -->
    <div class="steps-overview">
      <h3 class="section-subtitle">生成流程</h3>
      <div class="step-flow">
        <div class="flow-item">
          <div class="flow-num">1</div>
          <div class="flow-info">
            <div class="flow-name">全文分析</div>
            <div class="flow-desc">提取角色、场景、分集</div>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><ArrowRight /></el-icon></div>
        <div class="flow-item">
          <div class="flow-num">2</div>
          <div class="flow-info">
            <div class="flow-name">视觉资产</div>
            <div class="flow-desc">角色设定图 + 场景锚图</div>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><ArrowRight /></el-icon></div>
        <div class="flow-item">
          <div class="flow-num">3</div>
          <div class="flow-info">
            <div class="flow-name">分镜脚本</div>
            <div class="flow-desc">逐集生成镜头设计</div>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><ArrowRight /></el-icon></div>
        <div class="flow-item">
          <div class="flow-num">4</div>
          <div class="flow-info">
            <div class="flow-name">视频生成</div>
            <div class="flow-desc">锚点图 + AI 视频片段</div>
          </div>
        </div>
        <div class="flow-arrow"><el-icon><ArrowRight /></el-icon></div>
        <div class="flow-item">
          <div class="flow-num">5</div>
          <div class="flow-info">
            <div class="flow-name">成片输出</div>
            <div class="flow-desc">拼接 + 字幕 → 完整短剧</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-panel {
  max-width: 960px;
  margin: 0 auto;
}

/* 欢迎区 */
.welcome-section {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.page-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* 状态卡片 */
.status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.info-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-icon.purple {
  background: rgba(108, 92, 231, 0.12);
  color: var(--primary-light);
}

.info-icon.cyan {
  background: rgba(0, 206, 201, 0.12);
  color: var(--accent);
}

.info-icon.pink {
  background: rgba(253, 121, 168, 0.12);
  color: var(--accent-pink);
}

.info-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.info-value {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 上传区 */
.upload-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.uploaded-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(0, 184, 148, 0.12);
  color: #00b894;
  font-size: 13px;
  font-weight: 500;
}

.textarea-wrapper {
  position: relative;
}

.textarea-wrapper :deep(.el-textarea__inner) {
  background: var(--bg-surface) !important;
  border: 1px solid var(--border-light) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--text-primary) !important;
  font-size: 14px;
  line-height: 1.8;
}

.textarea-wrapper :deep(.el-textarea__inner):focus {
  border-color: var(--primary) !important;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

/* 按钮 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: var(--shadow-glow);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-start {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
  box-shadow: 0 0 15px rgba(0, 206, 201, 0.25);
}

.btn-start:hover:not(:disabled) {
  box-shadow: 0 0 30px rgba(0, 206, 201, 0.4);
  transform: translateY(-2px);
}

.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 流程说明 */
.steps-overview {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.section-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
}

.step-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.flow-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.flow-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(108, 92, 231, 0.15);
  color: var(--primary-light);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.flow-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.flow-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.flow-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
  font-size: 14px;
}
</style>
