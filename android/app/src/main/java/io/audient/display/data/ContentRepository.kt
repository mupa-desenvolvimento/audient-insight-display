package io.audient.display.data

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import io.audient.display.data.model.ContentResponse
import io.audient.display.worker.MediaPrefetchWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class ContentRepository(
    private val context: Context,
    private val api: ContentApi = ContentApi(),
    private val moshi: Moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build(),
) {
    private val adapter = moshi.adapter(ContentResponse::class.java)

    suspend fun load(deviceCode: String): LoadResult = withContext(Dispatchers.IO) {
        val cacheFile = contentCacheFile(context, deviceCode)
        try {
            val (parsed, rawJson) = api.fetchContent(deviceCode)
            cacheFile.parentFile?.mkdirs()
            cacheFile.writeText(rawJson)
            enqueuePrefetch(deviceCode)
            LoadResult.Success(parsed, source = LoadSource.Remote)
        } catch (remoteError: Throwable) {
            val cached = if (cacheFile.exists()) cacheFile.readText() else null
            if (cached.isNullOrBlank()) {
                LoadResult.Error(remoteError)
            } else {
                val parsed = adapter.fromJson(cached)
                if (parsed == null) {
                    LoadResult.Error(remoteError)
                } else {
                    enqueuePrefetch(deviceCode)
                    LoadResult.Success(parsed, source = LoadSource.Cache(remoteError))
                }
            }
        }
    }

    private fun enqueuePrefetch(deviceCode: String) {
        val request = OneTimeWorkRequestBuilder<MediaPrefetchWorker>()
            .setInputData(workDataOf(MediaPrefetchWorker.KEY_DEVICE_CODE to deviceCode))
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "media-prefetch-$deviceCode",
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    companion object {
        fun contentCacheFile(context: Context, deviceCode: String): File {
            return File(File(context.filesDir, "content-cache"), "$deviceCode.json")
        }
    }
}

sealed interface LoadResult {
    data class Success(val content: ContentResponse, val source: LoadSource) : LoadResult
    data class Error(val error: Throwable) : LoadResult
}

sealed interface LoadSource {
    data object Remote : LoadSource
    data class Cache(val remoteError: Throwable) : LoadSource
}

