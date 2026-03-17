package io.audient.display.ui.setup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import io.audient.display.data.DevicePrefs
import kotlinx.coroutines.launch

@Composable
fun DeviceSetupScreen(
    onSetupComplete: (String) -> Unit,
) {
    val context = LocalContext.current
    val prefs = remember(context) { DevicePrefs(context) }
    val scope = rememberCoroutineScope()

    var code by remember { mutableStateOf(TextFieldValue("")) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Configurar dispositivo",
            style = MaterialTheme.typography.headlineMedium,
        )

        OutlinedTextField(
            value = code,
            onValueChange = { code = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Device code") },
            singleLine = true,
        )

        Button(
            onClick = {
                val normalized = code.text.trim()
                if (normalized.isEmpty()) return@Button
                scope.launch {
                    prefs.setDeviceCode(normalized)
                    onSetupComplete(normalized)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = code.text.trim().isNotEmpty(),
        ) {
            Text("Iniciar Player")
        }
    }
}

