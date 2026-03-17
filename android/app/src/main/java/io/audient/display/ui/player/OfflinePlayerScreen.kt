package io.audient.display.ui.player

import android.app.Application
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.exoplayer.ExoPlayer
import io.audient.display.player.MediaResolver
import io.audient.display.player.PlayerViewModel

@Composable
fun OfflinePlayerScreen(
    deviceCode: String,
    onResetDevice: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as Application
    val vm: PlayerViewModel = viewModel(factory = remember(deviceCode) { PlayerViewModel.Factory(app, deviceCode) })
    val ui by vm.ui.collectAsStateWithLifecycle()

    val exoA = remember { ExoPlayer.Builder(context).build() }
    val exoB = remember { ExoPlayer.Builder(context).build() }

    DisposableEffect(Unit) {
        onDispose {
            exoA.release()
            exoB.release()
        }
    }

    val currentItem = ui.currentItem
    val nextItem = ui.nextItem

    val currentUri = remember(currentItem?.media?.fileUrl) {
        MediaResolver.resolveUri(context, currentItem?.media?.fileUrl)
    }
    val nextUri = remember(nextItem?.media?.fileUrl) {
        MediaResolver.resolveUri(context, nextItem?.media?.fileUrl)
    }

    val activePlayer = if ((ui.currentIndex % 2) == 0) exoA else exoB
    val preloadPlayer = if ((ui.currentIndex % 2) == 0) exoB else exoA

    LaunchedEffect(currentItem?.media?.type) {
        if (currentItem?.media?.type != "video") {
            exoA.pause()
            exoB.pause()
        }
    }

    LaunchedEffect(nextItem?.media?.type, nextUri) {
        if (nextItem?.media?.type == "video" && nextUri != null) {
            preloadPlayer.setMediaItem(androidx.media3.common.MediaItem.fromUri(nextUri))
            preloadPlayer.prepare()
            preloadPlayer.playWhenReady = false
        }
    }

    when {
        ui.isLoading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }

        ui.isBlocked -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = ui.blockedMessage ?: "Dispositivo bloqueado",
                    style = MaterialTheme.typography.headlineMedium,
                )
                Button(
                    modifier = Modifier.padding(top = 16.dp),
                    onClick = {
                        vm.clearDeviceCode()
                        onResetDevice()
                    },
                ) {
                    Text("Trocar dispositivo")
                }
            }
        }

        ui.errorMessage != null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(ui.errorMessage ?: "Erro", style = MaterialTheme.typography.titleMedium)
                Button(
                    modifier = Modifier.padding(top = 16.dp),
                    onClick = vm::refresh,
                ) {
                    Text("Tentar novamente")
                }
                Button(
                    modifier = Modifier.padding(top = 12.dp),
                    onClick = {
                        vm.clearDeviceCode()
                        onResetDevice()
                    },
                ) {
                    Text("Trocar dispositivo")
                }
            }
        }

        currentItem == null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Sem conteúdo ativo", style = MaterialTheme.typography.headlineMedium)
                Button(
                    modifier = Modifier.padding(top = 16.dp),
                    onClick = {
                        vm.clearDeviceCode()
                        onResetDevice()
                    },
                ) {
                    Text("Trocar dispositivo")
                }
            }
        }

        else -> Box(modifier = Modifier.fillMaxSize()) {
            MediaRenderer(
                item = currentItem,
                resolvedUri = currentUri,
                exoPlayer = if (currentItem.media.type == "video") activePlayer else null,
                onVideoEnded = vm::onVideoEnded,
            )
        }
    }
}
