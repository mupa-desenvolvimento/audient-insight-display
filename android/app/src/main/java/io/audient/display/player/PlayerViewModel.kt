package io.audient.display.player

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import io.audient.display.data.ContentRepository
import io.audient.display.data.DevicePrefs
import io.audient.display.data.LoadResult
import io.audient.display.data.LoadSource
import io.audient.display.data.model.ChannelDto
import io.audient.display.data.model.ContentResponse
import io.audient.display.data.model.PlaylistDto
import io.audient.display.data.model.PlaylistItemDto
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

class PlayerViewModel(
    app: Application,
    private val deviceCode: String,
) : AndroidViewModel(app) {
    private val repo = ContentRepository(app.applicationContext)
    private val prefs = DevicePrefs(app.applicationContext)

    private val _ui = MutableStateFlow(UiState(deviceCode = deviceCode))
    val ui: StateFlow<UiState> = _ui.asStateFlow()

    private val videoEndedEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private var rotationJob: Job? = null

    val deviceCodeFlow: StateFlow<String?> = prefs.deviceCode.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(stopTimeoutMillis = 5_000),
        initialValue = null,
    )

    init {
        refresh()
    }

    fun refresh() {
        rotationJob?.cancel()
        viewModelScope.launch {
            _ui.value = _ui.value.copy(isLoading = true, errorMessage = null)
            when (val result = repo.load(deviceCode)) {
                is LoadResult.Error -> {
                    _ui.value = _ui.value.copy(
                        isLoading = false,
                        errorMessage = result.error.message ?: "Falha ao carregar conteúdo",
                    )
                }

                is LoadResult.Success -> {
                    val computed = computePlayback(result.content)
                    _ui.value = _ui.value.copy(
                        isLoading = false,
                        errorMessage = null,
                        content = result.content,
                        loadSource = result.source,
                        isBlocked = result.content.device.isBlocked,
                        blockedMessage = result.content.device.blockedMessage,
                        activePlaylist = computed.activePlaylist,
                        activeChannel = computed.activeChannel,
                        items = computed.items,
                        currentIndex = 0,
                    ).withDerivedItems()
                    startRotation()
                }
            }
        }
    }

    fun onVideoEnded() {
        videoEndedEvents.tryEmit(Unit)
    }

    fun next() {
        val items = _ui.value.items
        if (items.isEmpty()) return
        val nextIndex = (_ui.value.currentIndex + 1) % items.size
        _ui.value = _ui.value.copy(currentIndex = nextIndex).withDerivedItems()
    }

    fun clearDeviceCode() {
        viewModelScope.launch {
            prefs.clearDeviceCode()
        }
    }

    private fun startRotation() {
        rotationJob?.cancel()
        rotationJob = viewModelScope.launch {
            while (true) {
                val state = _ui.value
                if (state.isBlocked) {
                    delay(1_000)
                    continue
                }

                val current = state.currentItem
                if (current == null) {
                    delay(1_000)
                    continue
                }

                val type = current.media.type
                val overrideSeconds = current.durationOverride?.takeIf { it > 0 }
                val defaultSeconds = (current.media.duration ?: 10).coerceAtLeast(1)
                val seconds = overrideSeconds ?: defaultSeconds

                if (type == "video" && overrideSeconds == null) {
                    videoEndedEvents.first()
                    next()
                } else {
                    delay(seconds * 1_000L)
                    next()
                }
            }
        }
    }

    private fun computePlayback(content: ContentResponse): ComputedPlayback {
        val playlists = content.playlists
        val activePlaylist = getActivePlaylist(playlists)
        if (activePlaylist == null) return ComputedPlayback(null, null, emptyList())

        if (activePlaylist.hasChannels && activePlaylist.channels.isNotEmpty()) {
            val channel = getActiveChannel(activePlaylist)
            val items = channel?.items.orEmpty().sortedWith(compareBy<PlaylistItemDto>({ it.position }, { it.id }))
            return ComputedPlayback(activePlaylist, channel, items)
        }

        val items = activePlaylist.items.sortedWith(compareBy<PlaylistItemDto>({ it.position }, { it.id }))
        return ComputedPlayback(activePlaylist, null, items)
    }

    private fun getActivePlaylist(playlists: List<PlaylistDto>): PlaylistDto? {
        val now = ZonedDateTime.now(ZoneId.systemDefault())
        return playlists
            .asSequence()
            .filter { isPlaylistActiveNow(it, now) }
            .sortedByDescending { it.priority }
            .firstOrNull()
    }

    private fun getActiveChannel(playlist: PlaylistDto): ChannelDto? {
        val now = ZonedDateTime.now(ZoneId.systemDefault())
        val activeChannels = playlist.channels
            .asSequence()
            .filter { isChannelActiveNow(it, now) }
            .toList()

        val normal = activeChannels.filter { !it.isFallback }.sortedBy { it.position }
        if (normal.isNotEmpty()) return normal.first()

        val fallback = activeChannels.filter { it.isFallback }.sortedBy { it.position }
        return fallback.firstOrNull()
    }

    private fun isPlaylistActiveNow(playlist: PlaylistDto, now: ZonedDateTime): Boolean {
        if (!playlist.isActive) return false
        return isTimeWindowActive(
            startDate = playlist.startDate,
            endDate = playlist.endDate,
            daysOfWeek = playlist.daysOfWeek,
            startTime = playlist.startTime,
            endTime = playlist.endTime,
            now = now,
        )
    }

    private fun isChannelActiveNow(channel: ChannelDto, now: ZonedDateTime): Boolean {
        if (!channel.isActive) return false
        if (channel.isFallback) return true
        return isTimeWindowActive(
            startDate = channel.startDate,
            endDate = channel.endDate,
            daysOfWeek = channel.daysOfWeek,
            startTime = channel.startTime,
            endTime = channel.endTime,
            now = now,
        )
    }

    private fun isTimeWindowActive(
        startDate: String?,
        endDate: String?,
        daysOfWeek: List<Int>?,
        startTime: String?,
        endTime: String?,
        now: ZonedDateTime,
    ): Boolean {
        val nowDate = now.toLocalDate()
        val nowTime = now.toLocalTime()
        val day = now.dayOfWeek.value % 7

        if (!daysOfWeek.isNullOrEmpty() && day !in daysOfWeek) return false

        if (!startDate.isNullOrBlank()) {
            val sd = runCatching { LocalDate.parse(startDate) }.getOrNull()
            if (sd != null && nowDate.isBefore(sd)) return false
        }

        if (!endDate.isNullOrBlank()) {
            val ed = runCatching { LocalDate.parse(endDate) }.getOrNull()
            if (ed != null && nowDate.isAfter(ed)) return false
        }

        val st = parseTimeOrNull(startTime)
        if (st != null && nowTime.isBefore(st)) return false

        val et = parseTimeOrNull(endTime)
        if (et != null && nowTime.isAfter(et)) return false

        return true
    }

    private fun parseTimeOrNull(value: String?): LocalTime? {
        val v = value?.trim().orEmpty()
        if (v.isEmpty()) return null
        val normalized = if (v.length == 5) "$v:00" else v
        return runCatching { LocalTime.parse(normalized, DateTimeFormatter.ISO_LOCAL_TIME) }.getOrNull()
    }

    private fun UiState.withDerivedItems(): UiState {
        val items = items
        val current = items.getOrNull(currentIndex)
        val next = if (items.isEmpty()) null else items[(currentIndex + 1) % items.size]
        return copy(
            currentItem = current,
            nextItem = next,
        )
    }

    data class UiState(
        val deviceCode: String,
        val isLoading: Boolean = true,
        val errorMessage: String? = null,
        val loadSource: LoadSource? = null,
        val content: ContentResponse? = null,
        val isBlocked: Boolean = false,
        val blockedMessage: String? = null,
        val activePlaylist: PlaylistDto? = null,
        val activeChannel: ChannelDto? = null,
        val items: List<PlaylistItemDto> = emptyList(),
        val currentIndex: Int = 0,
        val currentItem: PlaylistItemDto? = null,
        val nextItem: PlaylistItemDto? = null,
    )

    private data class ComputedPlayback(
        val activePlaylist: PlaylistDto?,
        val activeChannel: ChannelDto?,
        val items: List<PlaylistItemDto>,
    )

    class Factory(
        private val app: Application,
        private val deviceCode: String,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return PlayerViewModel(app, deviceCode) as T
        }
    }
}
