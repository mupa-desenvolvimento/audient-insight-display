@file:androidx.media3.common.util.UnstableApi

package io.audient.display.ui.player

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import io.audient.display.data.model.PlaylistItemDto

@Composable
fun MediaRenderer(
    item: PlaylistItemDto,
    resolvedUri: Uri?,
    exoPlayer: ExoPlayer?,
    onVideoEnded: () -> Unit,
) {
    val type = item.media.type
    when (type) {
        "video" -> VideoSurface(
            uri = resolvedUri,
            exoPlayer = exoPlayer,
            onEnded = onVideoEnded,
        )

        "image" -> ImageSurface(uri = resolvedUri)

        else -> PlaceholderSurface(
            title = type,
            subtitle = item.media.name ?: "",
        )
    }
}

@Composable
private fun ImageSurface(uri: Uri?) {
    AsyncImage(
        model = uri ?: "",
        contentDescription = null,
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Crop,
    )
}

@Composable
private fun VideoSurface(
    uri: Uri?,
    exoPlayer: ExoPlayer?,
    onEnded: () -> Unit,
) {
    if (uri == null || exoPlayer == null) {
        PlaceholderSurface(title = "video", subtitle = "Sem URL")
        return
    }

    val onEndedState by rememberUpdatedState(onEnded)
    val listener = remember {
        object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) onEndedState()
            }
        }
    }

    DisposableEffect(exoPlayer) {
        exoPlayer.addListener(listener)
        onDispose { exoPlayer.removeListener(listener) }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            PlayerView(context).apply {
                useController = false
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                player = exoPlayer
            }
        },
        update = { view ->
            val player = view.player as? ExoPlayer ?: exoPlayer
            if (view.player !== player) view.player = player

            val current = player.currentMediaItem?.localConfiguration?.uri
            if (current != uri) {
                player.setMediaItem(MediaItem.fromUri(uri))
                player.prepare()
                player.playWhenReady = true
            }
        },
    )
}

@Composable
private fun PlaceholderSurface(
    title: String,
    subtitle: String,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = buildString {
                append(title.uppercase())
                if (subtitle.isNotBlank()) {
                    append("\n")
                    append(subtitle)
                }
            },
            style = MaterialTheme.typography.headlineMedium.copy(fontSize = 24.sp),
            color = Color.White,
            textAlign = TextAlign.Center,
        )
    }
}
