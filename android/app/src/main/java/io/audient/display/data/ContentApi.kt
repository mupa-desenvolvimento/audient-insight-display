package io.audient.display.data

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import io.audient.display.data.model.ContentResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException

class ContentApi(
    private val client: OkHttpClient = OkHttpClient(),
    private val moshi: Moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build(),
) {
    private val adapter = moshi.adapter(ContentResponse::class.java)

    suspend fun fetchContent(deviceCode: String): Pair<ContentResponse, String> = withContext(Dispatchers.IO) {
        val baseUrl = "https://bgcnvyoseexfmrynqbfb.supabase.co/functions/v1/device-api/content".toHttpUrl()
        val url = baseUrl.newBuilder()
            .addQueryParameter("device_code", deviceCode)
            .build()

        val request = Request.Builder()
            .get()
            .url(url)
            .build()

        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            response.close()
            throw IOException("HTTP ${response.code}")
        }

        val body = response.body?.string()
        response.close()

        val rawJson = body ?: throw IOException("Resposta vazia")
        val parsed = adapter.fromJson(rawJson) ?: throw IOException("JSON inválido")
        parsed to rawJson
    }
}

