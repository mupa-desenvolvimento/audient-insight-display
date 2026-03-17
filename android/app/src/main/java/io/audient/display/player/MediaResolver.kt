package io.audient.display.player

import android.content.Context
import android.net.Uri
import java.io.File
import java.security.MessageDigest

object MediaResolver {
    fun resolveUri(context: Context, remoteUrl: String?): Uri? {
        val url = remoteUrl?.trim().orEmpty()
        if (url.isEmpty()) return null

        val mediaDir = File(context.filesDir, "media-cache")
        val file = cachedFileForUrl(mediaDir, url)
        if (file != null && file.exists() && file.length() > 0) {
            return Uri.fromFile(file)
        }
        return Uri.parse(url)
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
}

