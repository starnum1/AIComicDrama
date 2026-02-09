<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const projectId = computed(() => route.params.id as string)
const episodeId = computed(() => route.params.episodeId as string)

interface Shot {
  id: string
  shotNumber: number
  duration: number
  shotType: string
  cameraMovement: string
  imagePrompt: string
  videoMotion: string
  sceneVariant: string
  dialogue: any[] | null
  narration: any | null
  sfx: string[]
  transitionIn: string
  transitionOut: string
  continuityStrength: string
  scene: { name: string }
  characters: { character: { name: string }; characterState: string | null }[]
  images: { imageType: string; imageUrl: string }[]
}

const shots = ref<Shot[]>([])
const loading = ref(false)

onMounted(() => {
  if (episodeId.value) {
    fetchShots()
  }
})

async function fetchShots() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(`/api/episodes/${episodeId.value}/shots`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    shots.value = data
  } catch {
    ElMessage.error('获取分镜列表失败')
  } finally {
    loading.value = false
  }
}

function getShotTypeLabel(type: string) {
  const map: Record<string, string> = {
    wide: '全景',
    medium: '中景',
    close_up: '近景',
    extreme_close_up: '极特写',
    over_shoulder: '过肩',
    low_angle: '仰拍',
    high_angle: '俯拍',
    pov: '主观',
  }
  return map[type] || type
}

function getContinuityColor(strength: string) {
  switch (strength) {
    case 'strong':
      return '#67c23a'
    case 'medium':
      return '#e6a23c'
    case 'weak':
      return '#909399'
    default:
      return '#909399'
  }
}
</script>

<template>
  <div class="storyboard-panel">
    <h2>分镜编辑</h2>

    <div v-loading="loading">
      <el-empty v-if="!loading && shots.length === 0" description="暂无分镜数据" />

      <div class="shot-list">
        <el-card v-for="shot in shots" :key="shot.id" class="shot-card" shadow="hover">
          <template #header>
            <div class="shot-header">
              <div class="shot-title">
                <span class="shot-number">#{{ shot.shotNumber }}</span>
                <el-tag size="small">{{ getShotTypeLabel(shot.shotType) }}</el-tag>
                <el-tag size="small" type="info">{{ shot.duration }}s</el-tag>
                <el-tag
                  size="small"
                  :color="getContinuityColor(shot.continuityStrength)"
                  effect="dark"
                  style="border: none"
                >
                  {{ shot.continuityStrength }}
                </el-tag>
              </div>
              <span class="shot-scene">{{ shot.scene?.name }}</span>
            </div>
          </template>

          <div class="shot-body">
            <!-- 锚点图片预览 -->
            <div v-if="shot.images && shot.images.length > 0" class="shot-images">
              <el-image
                v-for="img in shot.images"
                :key="img.imageType"
                :src="img.imageUrl"
                fit="cover"
                class="shot-thumb"
                :preview-src-list="shot.images.map((i) => i.imageUrl)"
                :preview-teleported="true"
                :hide-on-click-modal="true"
                :z-index="3000"
              />
            </div>

            <!-- 画面描述 -->
            <div class="shot-field">
              <label>画面描述</label>
              <p>{{ shot.imagePrompt }}</p>
            </div>

            <!-- 运动描述 -->
            <div class="shot-field">
              <label>运动描述</label>
              <p>{{ shot.cameraMovement }} | {{ shot.videoMotion }}</p>
            </div>

            <!-- 角色 -->
            <div v-if="shot.characters?.length" class="shot-field">
              <label>角色</label>
              <div class="character-tags">
                <el-tag
                  v-for="sc in shot.characters"
                  :key="sc.character.name"
                  size="small"
                  effect="plain"
                >
                  {{ sc.character.name }}{{ sc.characterState ? `（${sc.characterState}）` : '' }}
                </el-tag>
              </div>
            </div>

            <!-- 对白 -->
            <div v-if="shot.dialogue?.length" class="shot-field">
              <label>对白</label>
              <div v-for="(d, i) in shot.dialogue" :key="i" class="dialogue-line">
                <strong>{{ d.speaker }}</strong>（{{ d.emotion }}）：{{ d.text }}
              </div>
            </div>

            <!-- 旁白 -->
            <div v-if="shot.narration" class="shot-field">
              <label>旁白</label>
              <p class="narration">{{ shot.narration.text }}（{{ shot.narration.emotion }}）</p>
            </div>

            <!-- 转场 -->
            <div class="shot-transitions">
              <el-tag size="small" type="info">入：{{ shot.transitionIn }}</el-tag>
              <el-tag size="small" type="info">出：{{ shot.transitionOut }}</el-tag>
              <el-tag v-for="sfx in shot.sfx" :key="sfx" size="small" effect="plain">
                {{ sfx }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.storyboard-panel h2 {
  margin: 0 0 24px;
  color: #303133;
}

.shot-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shot-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shot-number {
  font-weight: 700;
  font-size: 16px;
  color: #303133;
}

.shot-scene {
  color: #909399;
  font-size: 13px;
}

.shot-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shot-images {
  display: flex;
  gap: 8px;
}

.shot-thumb {
  width: 160px;
  height: 90px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.shot-field label {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  margin-bottom: 4px;
  display: block;
}

.shot-field p {
  margin: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}

.character-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dialogue-line {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.narration {
  font-style: italic;
}

.shot-transitions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
