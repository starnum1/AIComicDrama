<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)

interface Episode {
  id: string
  episodeNumber: number
  title: string
  summary: string
  originalText: string
  emotionCurve: string | null
  endingHook: string | null
}

const episodes = ref<Episode[]>([])
const loading = ref(false)
const expandedEpisodes = ref<Set<string>>(new Set())

onMounted(() => {
  fetchEpisodes()
})

async function fetchEpisodes() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(`/api/projects/${projectId.value}/episodes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    episodes.value = data
  } catch (err: any) {
    ElMessage.error('获取分集列表失败')
  } finally {
    loading.value = false
  }
}

function toggleFullText(episodeId: string) {
  if (expandedEpisodes.value.has(episodeId)) {
    expandedEpisodes.value.delete(episodeId)
  } else {
    expandedEpisodes.value.add(episodeId)
  }
}

function isExpanded(episodeId: string) {
  return expandedEpisodes.value.has(episodeId)
}

function goToStoryboard(episodeId: string) {
  router.push({
    name: 'ProjectStoryboard',
    params: { id: projectId.value, episodeId },
  })
}
</script>

<template>
  <div class="episodes-panel">
    <div class="panel-header">
      <h2>分集预览</h2>
      <span v-if="episodes.length > 0" class="episode-count">共 {{ episodes.length }} 集</span>
    </div>

    <div v-loading="loading">
      <el-empty v-if="!loading && episodes.length === 0" description="暂无分集数据，请先在概览页上传小说并启动流水线" />

      <div v-if="episodes.length > 0" class="episodes-list">
        <div
          v-for="ep in episodes"
          :key="ep.id"
          class="episode-card"
        >
          <div class="ep-number">{{ ep.episodeNumber }}</div>
          <div class="ep-content">
            <div class="ep-header">
              <h3>{{ ep.title }}</h3>
              <div class="ep-actions">
                <button
                  class="btn-text-toggle"
                  @click="toggleFullText(ep.id)"
                >
                  {{ isExpanded(ep.id) ? '收起全文' : '查看全文' }}
                  <span class="char-badge">{{ ep.originalText?.length || 0 }} 字</span>
                </button>
                <button class="btn-storyboard" @click="goToStoryboard(ep.id)">
                  查看分镜 →
                </button>
              </div>
            </div>

            <p class="ep-summary">{{ ep.summary }}</p>

            <div class="ep-meta">
              <span v-if="ep.emotionCurve" class="meta-item">
                <span class="meta-label">情感曲线</span>
                {{ ep.emotionCurve }}
              </span>
              <span v-if="ep.endingHook" class="meta-item">
                <span class="meta-label">结尾悬念</span>
                {{ ep.endingHook }}
              </span>
            </div>

            <!-- 展开的全文区域 -->
            <transition name="slide">
              <div v-if="isExpanded(ep.id)" class="full-text-wrapper">
                <div class="full-text-header">
                  <span>第 {{ ep.episodeNumber }} 集 原文内容</span>
                  <span class="full-text-count">{{ ep.originalText?.length || 0 }} 字</span>
                </div>
                <div class="full-text-body">
                  <p
                    v-for="(line, idx) in (ep.originalText || '').split('\n')"
                    :key="idx"
                    class="text-line"
                  >{{ line }}</p>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.episodes-panel {
  max-width: 960px;
  margin: 0 auto;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.panel-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.episode-count {
  padding: 2px 10px;
  border-radius: 12px;
  background: rgba(108, 92, 231, 0.12);
  color: var(--primary-light);
  font-size: 13px;
  font-weight: 500;
}

.episodes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.episode-card {
  display: flex;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: border-color 0.2s;
}

.episode-card:hover {
  border-color: var(--primary);
}

.ep-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.ep-content {
  flex: 1;
  min-width: 0;
}

.ep-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  gap: 12px;
}

.ep-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.ep-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-text-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-text-toggle:hover {
  border-color: var(--primary);
  color: var(--primary-light);
}

.char-badge {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(108, 92, 231, 0.1);
  color: var(--primary-light);
  font-size: 11px;
}

.btn-storyboard {
  padding: 4px 12px;
  background: none;
  border: 1px solid var(--primary);
  border-radius: 6px;
  color: var(--primary-light);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-storyboard:hover {
  background: var(--primary);
  color: #fff;
}

.ep-summary {
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 12px;
  font-size: 14px;
}

.ep-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  font-size: 13px;
  color: var(--text-secondary);
}

.meta-label {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 11px;
  margin-right: 4px;
}

/* 全文展开区域 */
.full-text-wrapper {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.full-text-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.full-text-count {
  font-size: 12px;
  color: var(--text-muted);
}

.full-text-body {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-dark);
}

.text-line {
  margin: 0;
  padding: 3px 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
}

.text-line:empty {
  display: none;
}

/* 展开/收起动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 600px;
  opacity: 1;
}
</style>
