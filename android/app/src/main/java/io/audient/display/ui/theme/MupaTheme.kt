package io.audient.display.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    background = Color(0xFFF8FAFC),
    surface = Color(0xFFFFFFFF),
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A),
)

private val DarkColors = darkColorScheme(
    background = Color(0xFF0B1220),
    surface = Color(0xFF0F172A),
    onBackground = Color(0xFFE2E8F0),
    onSurface = Color(0xFFE2E8F0),
)

enum class InputMode { Touch, Tv }

internal val LocalInputMode = staticCompositionLocalOf { InputMode.Touch }

@Composable
fun MupaTheme(
    inputMode: InputMode = InputMode.Touch,
    content: @Composable () -> Unit,
) {
    val isDark = false
    CompositionLocalProvider(LocalInputMode provides inputMode) {
        MaterialTheme(
            colorScheme = if (isDark) DarkColors else LightColors,
            content = content,
        )
    }
}
