package io.audient.display.ui

import android.app.UiModeManager
import android.content.Context
import android.content.res.Configuration
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import io.audient.display.data.DevicePrefs
import io.audient.display.ui.player.OfflinePlayerScreen
import io.audient.display.ui.setup.DeviceSetupScreen
import io.audient.display.ui.theme.InputMode
import io.audient.display.ui.theme.MupaTheme

@Composable
fun MupaDisplayApp() {
    val context = LocalContext.current
    val navController = rememberNavController()
    val prefs = DevicePrefs(context)

    val deviceCode by prefs.deviceCode.collectAsStateWithLifecycle(initialValue = null)

    val inputMode = if (isTvDevice(context)) InputMode.Tv else InputMode.Touch

    MupaTheme(inputMode = inputMode) {
        NavHost(
            navController = navController,
            startDestination = "bootstrap",
        ) {
            composable("bootstrap") {
                LaunchedEffect(deviceCode) {
                    val destination = if (deviceCode.isNullOrBlank()) "setup" else "player/${deviceCode}"
                    navController.navigate(destination) {
                        popUpTo("bootstrap") { inclusive = true }
                        launchSingleTop = true
                    }
                }

                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            composable("setup") {
                DeviceSetupScreen(
                    onSetupComplete = { code ->
                        navController.navigate("player/$code") {
                            popUpTo("setup") { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                )
            }

            composable(
                route = "player/{deviceCode}",
                arguments = listOf(navArgument("deviceCode") { type = NavType.StringType }),
            ) { entry ->
                val code = entry.arguments?.getString("deviceCode").orEmpty()
                OfflinePlayerScreen(
                    deviceCode = code,
                    onResetDevice = {
                        navController.navigate("setup") {
                            popUpTo("player/{deviceCode}") { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                )
            }
        }
    }
}

private fun isTvDevice(context: Context): Boolean {
    val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager ?: return false
    return uiModeManager.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
}

