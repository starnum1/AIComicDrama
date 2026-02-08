<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const projectStore = useProjectStore()
const projectId = computed(() => route.params.id as string)

// ===== 数据类型 =====
interface CharacterSheet { id: string; imageUrl: string; stateName: string | null }
interface CharacterData {
  id: string; name: string; description: string; visualPrompt: string
  sheets: CharacterSheet[]
}
interface SceneImage { id: string; variant: string; imageUrl: string }
interface SceneData {
  id: string; name: string; description: string; visualPrompt: string
  variants: Record<string, string> | null
  images: SceneImage[]
}
interface AiProviderOption { id: string; name: string; model: string }

// ===== 状态 =====
const characters = ref<CharacterData[]>([])
const scenes = ref<SceneData[]>([])
const imageProviders = ref<AiProviderOption[]>([])
const selectedProviderId = ref<string>('')
const loading = ref(false)
const generatingAll = ref(false)
const generatingIds = ref<Set<string>>(new Set()) // 正在生成的角色/场景 ID

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

onMounted(async () => {
  await Promise.all([fetchAssets(), fetchImageProviders()])
})

async function fetchAssets() {
  loading.value = true
  try {
    const { data } = await axios.get(`/api/projects/${projectId.value}/assets`, { headers: authHeaders() })
    characters.value = data.characters
    scenes.value = data.scenes
  } catch { ElMessage.error('获取资产失败') }
  finally { loading.value = false }
}

async function fetchImageProviders() {
  try {
    const { data } = await axios.get('/api/ai-providers', { headers: authHeaders() })
    imageProviders.value = data.filter((p: any) => p.providerType === 'image_gen')
    if (imageProviders.value.length > 0 && !selectedProviderId.value) {
      const defaultProvider = data.find((p: any) => p.providerType === 'image_gen' && p.isDefault)
      selectedProviderId.value = defaultProvider?.id || imageProviders.value[0].id
    }
  } catch { /* ignore */ }
}

// ===== 生成角色定妆照 =====
async function generateCharacterImage(characterId: string) {
  generatingIds.value.add(characterId)
  try {
    await axios.post(
      `/api/projects/${projectId.value}/generate-character-image/${characterId}`,
      { imageProviderId: selectedProviderId.value || undefined },
      { headers: authHeaders() },
    )
    ElMessage.success('定妆照生成成功')
    await fetchAssets()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '生成失败')
  } finally {
    generatingIds.value.delete(characterId)
  }
}

// ===== 生成场景锚图 =====
async function generateSceneImage(sceneId: string, variant: string = 'default') {
  const key = `${sceneId}-${variant}`
  generatingIds.value.add(key)
  try {
    await axios.post(
      `/api/projects/${projectId.value}/generate-scene-image/${sceneId}`,
      { variant, imageProviderId: selectedProviderId.value || undefined },
      { headers: authHeaders() },
    )
    ElMessage.success('场景锚图生成成功')
    await fetchAssets()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '生成失败')
  } finally {
    generatingIds.value.delete(key)
  }
}

// ===== 一键生成全部 =====
async function generateAll() {
  generatingAll.value = true
  try {
    const { data } = await axios.post(
      `/api/projects/${projectId.value}/generate-all-assets`,
      { imageProviderId: selectedProviderId.value || undefined },
      { headers: authHeaders() },
    )
    if (data.generated > 0) {
      ElMessage.success(`已生成 ${data.generated} 个资产`)
    } else {
      ElMessage.info('所有资产已就绪，无需生成')
    }
    await fetchAssets()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '批量生成失败')
  } finally {
    generatingAll.value = false
  }
}

// ===== 删除 =====
async function deleteSheet(sheetId: string) {
  try {
    await axios.delete(`/api/character-sheets/${sheetId}`, { headers: authHeaders() })
    ElMessage.success('已删除')
    await fetchAssets()
  } catch { ElMessage.error('删除失败') }
}

async function deleteSceneImg(imageId: string) {
  try {
    await axios.delete(`/api/scene-images/${imageId}`, { headers: authHeaders() })
    ElMessage.success('已删除')
    await fetchAssets()
  } catch { ElMessage.error('删除失败') }
}

// ===== 确认 =====
const allAssetsReady = computed(() => {
  const charsOk = characters.value.every(c => c.sheets.length > 0)
  const scenesOk = scenes.value.every(s => s.images.some(img => img.variant === 'default'))
  return charsOk && scenesOk && characters.value.length > 0
})

const confirming = ref(false)
async function confirmAssets() {
  confirming.value = true
  try {
    await axios.post(`/api/projects/${projectId.value}/pipeline/continue`, {}, { headers: authHeaders() })
    ElMessage.success('已确认，继续执行分集规划')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '确认失败')
  } finally { confirming.value = false }
}

function getSceneVariantKeys(scene: SceneData): string[] {
  const keys = ['default']
  if (scene.variants) {
    keys.push(...Object.keys(scene.variants))
  }
  return keys
}

function getSceneImageForVariant(scene: SceneData, variant: string): SceneImage | undefined {
  return scene.images.find(img => img.variant === variant)
}
</script>

<template>
  <div class="assets-panel">
    <!-- 顶部工具栏 -->
    <div class="panel-toolbar">
      <h2>视觉资产</h2>
      <div class="toolbar-actions">
        <div class="provider-select" v-if="imageProviders.length > 0">
          <label>图片模型：</label>
          <select v-model="selectedProviderId" class="select-input">
            <option v-for="p in imageProviders" :key="p.id" :value="p.id">
              {{ p.name }} ({{ p.model }})
            </option>
          </select>
        </div>
        <div v-else class="no-provider-tip">
          <router-link to="/settings/ai-providers">请先配置图片生成服务 →</router-link>
        </div>
        <button
          class="btn-generate-all"
          :disabled="generatingAll || imageProviders.length === 0"
          @click="generateAll"
        >
          <span v-if="generatingAll" class="spinner"></span>
          {{ generatingAll ? '生成中...' : '一键生成全部' }}
        </button>
        <button
          v-if="projectStore.projectStatus === 'asset_review'"
          class="btn-confirm"
          :disabled="!allAssetsReady || confirming"
          @click="confirmAssets"
        >
          {{ confirming ? '确认中...' : '确认并继续' }}
        </button>
      </div>
    </div>

    <div v-loading="loading" class="assets-content">
      <el-empty v-if="!loading && characters.length === 0 && scenes.length === 0" description="暂无视觉资产，请先启动流水线" />

      <!-- ===== 角色区 ===== -->
      <section v-if="characters.length > 0" class="asset-section">
        <h3 class="section-title">角色 <span class="count-badge">{{ characters.length }}</span></h3>

        <div class="asset-cards">
          <div v-for="char in characters" :key="char.id" class="asset-card">
            <div class="card-info">
              <div class="card-name">
                {{ char.name }}
                <span v-if="char.sheets.length > 0" class="status-tag done">已生成</span>
                <span v-else class="status-tag pending">待生成</span>
              </div>
              <p class="card-desc">{{ char.description }}</p>
              <details class="prompt-details">
                <summary>查看 Prompt</summary>
                <code class="prompt-code">{{ char.visualPrompt }}</code>
              </details>
            </div>

            <!-- 定妆照图片 -->
            <div class="card-images">
              <div v-if="char.sheets.length > 0" class="image-list">
                <div v-for="sheet in char.sheets" :key="sheet.id" class="image-item">
                  <el-image :src="sheet.imageUrl" fit="contain" class="asset-thumb"
                    :preview-src-list="[sheet.imageUrl]" />
                  <div class="image-actions">
                    <button class="btn-icon btn-regen" title="重新生成"
                      :disabled="generatingIds.has(char.id)"
                      @click="generateCharacterImage(char.id)">↻</button>
                    <button class="btn-icon btn-del" title="删除" @click="deleteSheet(sheet.id)">✕</button>
                  </div>
                </div>
              </div>
              <div v-else class="no-image">
                <button
                  class="btn-generate"
                  :disabled="generatingIds.has(char.id) || imageProviders.length === 0"
                  @click="generateCharacterImage(char.id)"
                >
                  <span v-if="generatingIds.has(char.id)" class="spinner"></span>
                  {{ generatingIds.has(char.id) ? '生成中...' : '生成定妆照' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== 场景区 ===== -->
      <section v-if="scenes.length > 0" class="asset-section">
        <h3 class="section-title">场景 <span class="count-badge">{{ scenes.length }}</span></h3>

        <div class="asset-cards">
          <div v-for="scene in scenes" :key="scene.id" class="asset-card">
            <div class="card-info">
              <div class="card-name">
                {{ scene.name }}
                <span v-if="getSceneImageForVariant(scene, 'default')" class="status-tag done">已生成</span>
                <span v-else class="status-tag pending">待生成</span>
              </div>
              <p class="card-desc">{{ scene.description }}</p>
              <details class="prompt-details">
                <summary>查看 Prompt</summary>
                <code class="prompt-code">{{ scene.visualPrompt }}</code>
              </details>
            </div>

            <!-- 场景变体图片 -->
            <div class="card-images">
              <div class="variant-list">
                <div v-for="variant in getSceneVariantKeys(scene)" :key="variant" class="variant-item">
                  <span class="variant-label">{{ variant === 'default' ? '默认' : variant }}</span>
                  <div v-if="getSceneImageForVariant(scene, variant)" class="variant-image-wrap">
                    <el-image
                      :src="getSceneImageForVariant(scene, variant)!.imageUrl"
                      fit="cover"
                      class="scene-thumb"
                      :preview-src-list="[getSceneImageForVariant(scene, variant)!.imageUrl]"
                    />
                    <div class="image-actions">
                      <button class="btn-icon btn-regen" title="重新生成"
                        :disabled="generatingIds.has(`${scene.id}-${variant}`)"
                        @click="generateSceneImage(scene.id, variant)">↻</button>
                      <button class="btn-icon btn-del" title="删除"
                        @click="deleteSceneImg(getSceneImageForVariant(scene, variant)!.id)">✕</button>
                    </div>
                  </div>
                  <button v-else
                    class="btn-generate-sm"
                    :disabled="generatingIds.has(`${scene.id}-${variant}`) || imageProviders.length === 0"
                    @click="generateSceneImage(scene.id, variant)"
                  >
                    <span v-if="generatingIds.has(`${scene.id}-${variant}`)" class="spinner-sm"></span>
                    {{ generatingIds.has(`${scene.id}-${variant}`) ? '...' : '+' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.assets-panel {
  max-width: 960px;
  margin: 0 auto;
}

/* 工具栏 */
.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.panel-toolbar h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.provider-select {
  display: flex;
  align-items: center;
  gap: 6px;
}

.provider-select label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.select-input {
  padding: 6px 10px;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.select-input:focus { border-color: var(--primary); }
.select-input option { background: var(--bg-dark); color: var(--text-primary); }

.no-provider-tip { font-size: 13px; }
.no-provider-tip a { color: var(--primary-light); text-decoration: none; }

.btn-generate-all {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; background: var(--gradient-primary); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all 0.2s;
}
.btn-generate-all:hover:not(:disabled) { box-shadow: var(--shadow-glow); transform: translateY(-1px); }
.btn-generate-all:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-confirm {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; background: linear-gradient(135deg, #00b894, #00cec9); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all 0.2s;
}
.btn-confirm:hover:not(:disabled) { box-shadow: 0 0 16px rgba(0,206,201,0.3); }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* 内容区 */
.asset-section { margin-bottom: 32px; }

.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 17px; font-weight: 600; color: var(--text-primary);
  margin: 0 0 16px;
}

.count-badge {
  padding: 1px 8px; border-radius: 10px;
  background: rgba(108,92,231,0.12); color: var(--primary-light);
  font-size: 12px; font-weight: 500;
}

.asset-cards { display: flex; flex-direction: column; gap: 12px; }

.asset-card {
  display: flex; gap: 20px;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 20px;
  transition: border-color 0.2s;
}
.asset-card:hover { border-color: rgba(108,92,231,0.3); }

.card-info { flex: 1; min-width: 0; }

.card-name {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 600; color: var(--text-primary);
  margin-bottom: 6px;
}

.status-tag {
  padding: 1px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
}
.status-tag.done { background: rgba(0,184,148,0.12); color: #00b894; }
.status-tag.pending { background: rgba(253,203,110,0.12); color: #fdcb6e; }

.card-desc {
  font-size: 13px; color: var(--text-secondary); line-height: 1.6;
  margin: 0 0 8px;
}

.prompt-details { margin-top: 4px; }
.prompt-details summary {
  font-size: 12px; color: var(--text-muted); cursor: pointer;
  user-select: none;
}
.prompt-details summary:hover { color: var(--primary-light); }

.prompt-code {
  display: block; margin-top: 6px; padding: 8px 10px;
  background: var(--bg-dark); border: 1px solid var(--border);
  border-radius: 6px; font-size: 11px; line-height: 1.5;
  color: var(--text-secondary); word-break: break-all;
  max-height: 120px; overflow-y: auto;
}

/* 图片区域 */
.card-images {
  flex-shrink: 0; display: flex; align-items: flex-start;
}

.image-list { display: flex; flex-wrap: wrap; gap: 8px; }

.image-item { position: relative; }

.asset-thumb {
  width: 280px; height: 160px; border-radius: 8px;
  border: 1px solid var(--border); cursor: pointer;
}

.scene-thumb {
  width: 200px; height: 112px; border-radius: 6px;
  border: 1px solid var(--border); cursor: pointer;
}

.image-actions {
  position: absolute; top: 4px; right: 4px;
  display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;
}
.image-item:hover .image-actions,
.variant-image-wrap:hover .image-actions { opacity: 1; }

.variant-image-wrap { position: relative; }

.btn-icon {
  width: 24px; height: 24px; border-radius: 4px;
  border: none; font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.btn-icon.btn-regen { background: rgba(108,92,231,0.8); color: #fff; }
.btn-icon.btn-regen:hover { background: var(--primary); }
.btn-icon.btn-del { background: rgba(214,48,49,0.8); color: #fff; }
.btn-icon.btn-del:hover { background: #d63031; }
.btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }

.no-image {
  display: flex; align-items: center; justify-content: center;
  width: 280px; height: 160px;
  background: var(--bg-surface); border: 2px dashed var(--border);
  border-radius: 8px;
}

.btn-generate {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; background: var(--bg-dark);
  border: 1px solid var(--primary); border-radius: 6px;
  color: var(--primary-light); font-size: 13px;
  cursor: pointer; font-family: inherit; transition: all 0.2s;
}
.btn-generate:hover:not(:disabled) { background: var(--primary); color: #fff; }
.btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }

/* 场景变体 */
.variant-list { display: flex; flex-wrap: wrap; gap: 10px; }

.variant-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }

.variant-label {
  font-size: 11px; color: var(--text-muted); font-weight: 500;
}

.btn-generate-sm {
  width: 200px; height: 112px;
  background: var(--bg-surface); border: 2px dashed var(--border);
  border-radius: 6px; color: var(--text-muted); font-size: 24px;
  cursor: pointer; transition: all 0.2s; display: flex;
  align-items: center; justify-content: center; font-family: inherit;
}
.btn-generate-sm:hover:not(:disabled) { border-color: var(--primary); color: var(--primary-light); }
.btn-generate-sm:disabled { opacity: 0.5; cursor: not-allowed; }

/* 加载动画 */
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
.spinner-sm {
  width: 12px; height: 12px;
  border: 2px solid rgba(160,160,184,0.3); border-top-color: var(--primary-light);
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
