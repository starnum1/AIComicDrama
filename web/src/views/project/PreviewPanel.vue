<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const projectId = computed(() => route.params.id as string)

interface EpisodeWithVideo {
  id: string
  episodeNumber: number
  title: string
  videoUrl: string | null
}

const episodes = ref<EpisodeWithVideo[]>([])
const loading = ref(false)
const activeEpisode = ref<string>('')

onMounted(() => {
  fetchEpisodeVideos()
})

async function fetchEpisodeVideos() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get(`/api/projects/${projectId.value}/episodes`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    // 为每个集获取成片
    const episodesWithVideos: EpisodeWithVideo[] = []
    for (const ep of data) {
      let videoUrl = null
      try {
        const { data: videoData } = await axios.get(`/api/episodes/${ep.id}/final-video`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        videoUrl = videoData?.videoUrl || null
      } catch {
        // 可能还没有成片
      }
      episodesWithVideos.push({
        id: ep.id,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        videoUrl,
      })
    }

    episodes.value = episodesWithVideos
    if (episodesWithVideos.length > 0 && episodesWithVideos[0]) {
      activeEpisode.value = episodesWithVideos[0].id
    }
  } catch {
    ElMessage.error('获取成片列表失败')
  } finally {
    loading.value = false
  }
}

const currentVideo = computed(() =>
  episodes.value.find((ep) => ep.id === activeEpisode.value),
)
</script>

<template>
  <div class="preview-panel">
    <h2>成片预览</h2>

    <div v-loading="loading">
      <el-empty v-if="!loading && episodes.length === 0" description="暂无成片" />

      <div v-if="episodes.length > 0" class="preview-content">
        <!-- 集选择 -->
        <el-radio-group v-model="activeEpisode" class="episode-selector">
          <el-radio-button
            v-for="ep in episodes"
            :key="ep.id"
            :value="ep.id"
          >
            第{{ ep.episodeNumber }}集 - {{ ep.title }}
            <el-icon v-if="ep.videoUrl"><CircleCheck /></el-icon>
          </el-radio-button>
        </el-radio-group>

        <!-- 视频播放器 -->
        <el-card v-if="currentVideo" class="video-card">
          <template #header>
            <div class="video-header">
              <span>第{{ currentVideo.episodeNumber }}集 - {{ currentVideo.title }}</span>
              <el-button
                v-if="currentVideo.videoUrl"
                type="primary"
                size="small"
                tag="a"
                :href="currentVideo.videoUrl"
                target="_blank"
              >
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
          </template>

          <div v-if="currentVideo.videoUrl" class="video-container">
            <video
              :src="currentVideo.videoUrl"
              controls
              class="video-player"
              preload="metadata"
            />
          </div>

          <el-empty v-else description="该集成片尚未生成" />
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-panel h2 {
  margin: 0 0 24px;
  color: #303133;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.episode-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.video-card {
  max-width: 960px;
}

.video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.video-container {
  text-align: center;
}

.video-player {
  width: 100%;
  max-height: 540px;
  border-radius: 8px;
  background: #000;
}
</style>
