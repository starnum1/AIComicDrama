<script setup lang="ts">
import { ref, computed } from 'vue'
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
    ElMessage.success('流水线已启动')
    projectStore.setCurrentStep('analysis')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '启动失败')
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div class="overview-panel">
    <h2>项目概览</h2>

    <!-- 项目状态 -->
    <el-card class="status-card">
      <template #header>
        <span>项目状态</span>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="项目名称">{{ projectStore.projectName }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">{{ projectStore.projectStatus || '已创建' }}</el-descriptions-item>
        <el-descriptions-item label="当前步骤">{{ projectStore.currentStep || '未开始' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 上传小说 -->
    <el-card class="upload-card">
      <template #header>
        <span>上传小说文本</span>
      </template>

      <el-input
        v-model="novelText"
        type="textarea"
        :rows="12"
        placeholder="请粘贴小说文本内容（建议 5000-30000 字）..."
        :disabled="novelUploaded"
      />

      <div class="char-count">
        字数：{{ novelText.length }}
      </div>

      <div class="actions">
        <el-button
          v-if="!novelUploaded"
          type="primary"
          :loading="uploading"
          :disabled="!novelText.trim()"
          @click="uploadNovel"
        >
          <el-icon><Upload /></el-icon>
          上传小说
        </el-button>

        <el-button
          v-if="novelUploaded && projectStore.projectStatus === 'created'"
          type="success"
          :loading="starting"
          @click="startPipeline"
        >
          <el-icon><VideoPlay /></el-icon>
          开始生成
        </el-button>

        <el-tag v-if="novelUploaded" type="success" class="uploaded-tag">
          <el-icon><CircleCheck /></el-icon>
          小说已上传
        </el-tag>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.overview-panel h2 {
  margin: 0 0 24px;
  color: #303133;
}

.status-card {
  margin-bottom: 20px;
}

.upload-card {
  margin-bottom: 20px;
}

.char-count {
  margin-top: 8px;
  color: #909399;
  font-size: 13px;
  text-align: right;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.uploaded-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
