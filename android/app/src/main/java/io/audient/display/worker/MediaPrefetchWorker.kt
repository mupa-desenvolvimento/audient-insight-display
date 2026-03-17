package io.audient.display.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import io.audient.display.data.ContentRepository
import io.audient.display.data.model.ContentResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.security.MessageDigest

class MediaPrefetchWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    private val client = OkHttpClient()
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val adapter = moshi.adapter(ContentResponse::class.java)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val deviceCode = inputData.getString(KEY_DEVICE_CODE)?.trim().orEmpty()
        if (deviceCode.isEmpty()) return@withContext Result.failure()

        val cacheFile = ContentRepository.contentCacheFile(applicationContext, deviceCode)
        if (!cacheFile.exists()) return@withContext Result.success()

        val content = adapter.fromJson(cacheFile.readText()) ?: return@withContext Result.success()

        val urls = buildList {
            content.overrideMedia?.fileUrl?.let { add(it) }
            content.playlists.forEach { playlist ->
                playlist.items.forEach { it.media.fileUrl?.let(::add) }
                playlist.channels.forEach { channel ->
                    channel.items.forEach { it.media.fileUrl?.let(::add) }
                }
            }
        }.distinct()

        val mediaDir = File(applicationContext.filesDir, "media-cache").apply { mkdirs() }
        val activeFiles = urls.mapNotNull { url ->
            val f = cachedFileForUrl(mediaDir, url)
            if (f != null) f.name else null
        }.toSet()

        for (url in urls) {
            val dest = cachedFileForUrl(mediaDir, url) ?: continue
            if (dest.exists() && dest.length() > 0) continue
            val tmp = File(mediaDir, "${dest.name}.tmp")
            try {
                downloadToFile(url, tmp)
                if (tmp.exists() && tmp.length() > 0) {
                    tmp.renameTo(dest)
                } else {
                    tmp.delete()
                }
            } catch (e: Throwable) {
                tmp.delete()
                return@withContext Result.retry()
            }
        }

        mediaDir.listFiles()
            ?.filter { it.isFile }
            ?.filter { it.name !in activeFiles }
            ?.forEach { it.delete() }

        Result.success()
    }

    private fun downloadToFile(url: String, dest: File) {
        val request = Request.Builder().get().url(url).build()
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            response.close()
            throw IllegalStateException("HTTP ${response.code}")
        }
        val body = response.body ?: run {
            response.close()
            throw IllegalStateException("Resposta vazia")
        }

        dest.outputStream().use { out ->
            body.byteStream().use { input ->
                input.copyTo(out)
            }
        }
        response.close()
    }

    private fun cachedFileForUrl(mediaDir: File, url: String): File? {
        val lastSegment = url.substringAfterLast('/').substringBefore('?').trim()
        if (lastSegment.isEmpty()) return null

        val safeSegment = lastSegment.replace(Regex("""[^\w.\-]"""), "_")
        val hash8 = sha256(url).take(8)
        return File(mediaDir, "${hash8}_$safeSegment")
    }

    private fun sha256(value: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val bytes = md.digest(value.toByteArray(Charsets.UTF_8))
        val sb = StringBuilder(bytes.size * 2)
        for (b in bytes) sb.append("%02x".format(b))
        return sb.toString()
    }

    companion object {
        const val KEY_DEVICE_CODE = "device_code"
    }
}

