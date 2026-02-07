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

function goToStoryboard(episodeId: string) {
  router.push({
    name: 'ProjectStoryboard',
    params: { id: projectId.value, episodeId },
  })
}
</script>

<template>
  <div class="episodes-panel">
    <h2>分集预览</h2>

    <div v-loading="loading">
      <el-empty v-if="!loading && episodes.length === 0" description="暂无分集数据，请先在概览页上传小说并启动流水线" />

      <el-timeline v-if="episodes.length > 0">
        <el-timeline-item
          v-for="ep in episodes"
          :key="ep.id"
          :timestamp="`第 ${ep.episodeNumber} 集`"
          placement="top"
          type="primary"
          :hollow="true"
          size="large"
        >
          <el-card shadow="hover">
            <template #header>
              <div class="ep-header">
                <h3>{{ ep.title }}</h3>
                <el-button size="small" type="primary" text @click="goToStoryboard(ep.id)">
                  查看分镜
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </template>

            <p class="ep-summary">{{ ep.summary }}</p>

            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="情感曲线" v-if="ep.emotionCurve">
                {{ ep.emotionCurve }}
              </el-descriptions-item>
              <el-descriptions-item label="结尾悬念" v-if="ep.endingHook">
                {{ ep.endingHook }}
              </el-descriptions-item>
              <el-descriptions-item label="原文字数">
                {{ ep.originalText?.length || 0 }} 字
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<style scoped>
.episodes-panel h2 {
  margin: 0 0 24px;
  color: #303133;
}

.ep-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ep-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.ep-summary {
  color: #606266;
  line-height: 1.6;
  margin: 0 0 16px;
}
</style>
