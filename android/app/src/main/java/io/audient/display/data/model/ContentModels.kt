package io.audient.display.data.model

import com.squareup.moshi.Json

data class ContentResponse(
    @Json(name = "version") val version: Int?,
    @Json(name = "generated_at") val generatedAt: String?,
    @Json(name = "device") val device: DeviceDto,
    @Json(name = "override_media") val overrideMedia: OverrideMediaDto?,
    @Json(name = "playlists") val playlists: List<PlaylistDto> = emptyList(),
)

data class DeviceDto(
    @Json(name = "id") val id: String,
    @Json(name = "device_code") val deviceCode: String,
    @Json(name = "name") val name: String?,
    @Json(name = "store_id") val storeId: String?,
    @Json(name = "company_id") val companyId: String?,
    @Json(name = "company_slug") val companySlug: String?,
    @Json(name = "store_code") val storeCode: String?,
    @Json(name = "camera_enabled") val cameraEnabled: Boolean = false,
    @Json(name = "is_blocked") val isBlocked: Boolean = false,
    @Json(name = "blocked_message") val blockedMessage: String?,
    @Json(name = "last_sync_requested_at") val lastSyncRequestedAt: String?,
)

data class OverrideMediaDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String?,
    @Json(name = "type") val type: String,
    @Json(name = "file_url") val fileUrl: String?,
    @Json(name = "duration") val duration: Int?,
    @Json(name = "expires_at") val expiresAt: String?,
    @Json(name = "metadata") val metadata: Map<String, Any?>? = null,
)

data class PlaylistDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "description") val description: String?,
    @Json(name = "is_active") val isActive: Boolean = true,
    @Json(name = "has_channels") val hasChannels: Boolean = false,
    @Json(name = "start_date") val startDate: String?,
    @Json(name = "end_date") val endDate: String?,
    @Json(name = "days_of_week") val daysOfWeek: List<Int>?,
    @Json(name = "start_time") val startTime: String?,
    @Json(name = "end_time") val endTime: String?,
    @Json(name = "priority") val priority: Int = 0,
    @Json(name = "content_scale") val contentScale: String?,
    @Json(name = "items") val items: List<PlaylistItemDto> = emptyList(),
    @Json(name = "channels") val channels: List<ChannelDto> = emptyList(),
)

data class ChannelDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "is_active") val isActive: Boolean = true,
    @Json(name = "is_fallback") val isFallback: Boolean = false,
    @Json(name = "position") val position: Int = 0,
    @Json(name = "start_date") val startDate: String?,
    @Json(name = "end_date") val endDate: String?,
    @Json(name = "start_time") val startTime: String?,
    @Json(name = "end_time") val endTime: String?,
    @Json(name = "days_of_week") val daysOfWeek: List<Int>?,
    @Json(name = "items") val items: List<PlaylistItemDto> = emptyList(),
)

data class PlaylistItemDto(
    @Json(name = "id") val id: String,
    @Json(name = "media_id") val mediaId: String,
    @Json(name = "position") val position: Int = 0,
    @Json(name = "duration_override") val durationOverride: Int?,
    @Json(name = "start_date") val startDate: String?,
    @Json(name = "end_date") val endDate: String?,
    @Json(name = "start_time") val startTime: String?,
    @Json(name = "end_time") val endTime: String?,
    @Json(name = "days_of_week") val daysOfWeek: List<Int>?,
    @Json(name = "media") val media: MediaDto,
)

data class MediaDto(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String?,
    @Json(name = "type") val type: String,
    @Json(name = "file_url") val fileUrl: String?,
    @Json(name = "duration") val duration: Int?,
    @Json(name = "metadata") val metadata: Map<String, Any?>? = null,
)

