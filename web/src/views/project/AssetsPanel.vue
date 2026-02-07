<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const projectStore = useProjectStore()
const projectId = computed(() => route.params.id as string)

interface CharacterSheet {
  id: string
  characterId: string
  imageUrl: string
  stateName: string | null
  gridSpec: string
}

interface CharacterImage {
  id: string
  imageType: string
  imageUrl: string
  stateName: string | null
}

interface CharacterWithAssets {
  id: string
  name: string
  description: string
  sheets: CharacterSheet[]
  images: CharacterImage[]
}

const characters = ref<CharacterWithAssets[]>([])
const loading = ref(false)
const confirming = ref(false)

// 裁剪相关状态
const cropDialogVisible = ref(false)
const currentSheet = ref<CharacterSheet | null>(null)
const cropRegion = ref({ x: 0, y: 0, width: 512, height: 512 })
const selectedImageType = ref('front')

const imageTypeOptions = [
  { value: 'front', label: '正面全身' },
  { value: 'side', label: '侧面' },
  { value: 'three_quarter', label: '3/4 视角' },
  { value: 'back', label: '背面' },
  { value: 'expression_happy', label: '表情-喜' },
  { value: 'expression_angry', label: '表情-怒' },
  { value: 'expression_sad', label: '表情-哀' },
  { value: 'expression_surprised', label: '表情-惊' },
  { value: 'expression_neutral', label: '表情-中性' },
]

onMounted(() => {
  fetchCharacterAssets()
})

async function fetchCharacterAssets() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(`/api/projects/${projectId.value}/character-sheets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    characters.value = data
  } catch {
    ElMessage.error('获取角色资产失败')
  } finally {
    loading.value = false
  }
}

function openCropDialog(sheet: CharacterSheet) {
  currentSheet.value = sheet
  cropRegion.value = { x: 0, y: 0, width: 512, height: 512 }
  selectedImageType.value = 'front'
  cropDialogVisible.value = true
}

async function submitCrop() {
  if (!currentSheet.value) return

  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/character-sheets/${currentSheet.value.id}/crop`,
      {
        imageType: selectedImageType.value,
        cropRegion: cropRegion.value,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    ElMessage.success('裁剪保存成功')
    cropDialogVisible.value = false
    fetchCharacterAssets()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '裁剪失败')
  }
}

async function regenerateSheet(sheetId: string) {
  try {
    await ElMessageBox.confirm('重新生成将替换当前设定图及已裁剪的子图，确定继续？', '重新生成', {
      type: 'warning',
    })
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/character-sheets/${sheetId}/regenerate`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    )
    ElMessage.success('已提交重新生成请求')
    fetchCharacterAssets()
  } catch {
    // 用户取消
  }
}

async function deleteImage(imageId: string) {
  try {
    const token = localStorage.getItem('token')
    await axios.delete(`/api/character-images/${imageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    ElMessage.success('已删除')
    fetchCharacterAssets()
  } catch {
    ElMessage.error('删除失败')
  }
}

// 检查所有角色是否都有正面全身图
const allCharactersHaveFront = computed(() => {
  return characters.value.every((c) => c.images.some((img) => img.imageType === 'front'))
})

async function confirmAssets() {
  if (!allCharactersHaveFront.value) {
    ElMessage.warning('每个角色至少需要 1 张"正面全身"类型的裁剪图')
    return
  }

  confirming.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `/api/projects/${projectId.value}/pipeline/confirm-assets`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    )
    ElMessage.success('资产已确认，流水线继续运行')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '确认失败')
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <div class="assets-panel">
    <div class="panel-header">
      <h2>视觉资产</h2>
      <el-button
        v-if="projectStore.projectStatus === 'asset_review'"
        type="success"
        :loading="confirming"
        :disabled="!allCharactersHaveFront"
        @click="confirmAssets"
      >
        <el-icon><CircleCheck /></el-icon>
        确认资产，开始分镜
      </el-button>
    </div>

    <div v-loading="loading">
      <el-empty v-if="!loading && characters.length === 0" description="暂无视觉资产" />

      <!-- 按角色分组展示 -->
      <div v-for="character in characters" :key="character.id" class="character-section">
        <h3 class="character-name">
          {{ character.name }}
          <el-tag
            v-if="character.images.some((img) => img.imageType === 'front')"
            type="success"
            size="small"
          >
            已裁剪正面图
          </el-tag>
          <el-tag v-else type="warning" size="small"> 缺少正面图 </el-tag>
        </h3>
        <p class="character-desc">{{ character.description }}</p>

        <!-- 设定图列表 -->
        <div v-for="sheet in character.sheets" :key="sheet.id" class="sheet-section">
          <div class="sheet-header">
            <span class="sheet-label">
              设定图{{ sheet.stateName ? `（${sheet.stateName}）` : '' }}
            </span>
            <div class="sheet-actions">
              <el-button size="small" @click="openCropDialog(sheet)">
                <el-icon><Crop /></el-icon>
                裁剪
              </el-button>
              <el-button size="small" type="warning" @click="regenerateSheet(sheet.id)">
                <el-icon><Refresh /></el-icon>
                重新生成
              </el-button>
            </div>
          </div>

          <el-image
            :src="sheet.imageUrl"
            fit="contain"
            class="sheet-image"
            :preview-src-list="[sheet.imageUrl]"
          />
        </div>

        <!-- 已裁剪的子图列表 -->
        <div v-if="character.images.length > 0" class="cropped-images">
          <h4>已裁剪图片</h4>
          <div class="image-grid">
            <div v-for="img in character.images" :key="img.id" class="image-item">
              <el-image :src="img.imageUrl" fit="cover" class="cropped-thumb" />
              <div class="image-meta">
                <el-tag size="small">{{
                  imageTypeOptions.find((o) => o.value === img.imageType)?.label || img.imageType
                }}</el-tag>
                <el-button
                  text
                  type="danger"
                  size="small"
                  @click="deleteImage(img.id)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <el-divider />
      </div>
    </div>

    <!-- 裁剪对话框 -->
    <el-dialog v-model="cropDialogVisible" title="裁剪设定图" width="700px">
      <div v-if="currentSheet" class="crop-dialog-content">
        <el-image :src="currentSheet.imageUrl" fit="contain" class="crop-preview" />

        <el-form label-width="100px" class="crop-form">
          <el-form-item label="图片类型">
            <el-select v-model="selectedImageType">
              <el-option
                v-for="opt in imageTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="X 坐标">
            <el-input-number v-model="cropRegion.x" :min="0" :max="1536" />
          </el-form-item>
          <el-form-item label="Y 坐标">
            <el-input-number v-model="cropRegion.y" :min="0" :max="1536" />
          </el-form-item>
          <el-form-item label="宽度">
            <el-input-number v-model="cropRegion.width" :min="64" :max="1536" />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number v-model="cropRegion.height" :min="64" :max="1536" />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="cropDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCrop">裁剪保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.assets-panel h2 {
  margin: 0;
  color: #303133;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.character-section {
  margin-bottom: 16px;
}

.character-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  color: #303133;
  margin: 0 0 8px;
}

.character-desc {
  color: #909399;
  font-size: 14px;
  margin: 0 0 16px;
}

.sheet-section {
  margin-bottom: 16px;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sheet-label {
  font-weight: 600;
  color: #606266;
}

.sheet-actions {
  display: flex;
  gap: 8px;
}

.sheet-image {
  width: 100%;
  max-width: 600px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.cropped-images h4 {
  margin: 16px 0 12px;
  color: #606266;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.image-item {
  text-align: center;
}

.cropped-thumb {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.image-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

.crop-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.crop-preview {
  max-height: 400px;
  border-radius: 8px;
}

.crop-form {
  margin-top: 16px;
}
</style>
