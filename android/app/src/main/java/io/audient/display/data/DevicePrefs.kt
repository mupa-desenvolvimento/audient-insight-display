package io.audient.display.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "mupa_prefs")

class DevicePrefs(private val context: Context) {
    private val deviceCodeKey = stringPreferencesKey("mupa_device_code")

    val deviceCode: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[deviceCodeKey]?.trim()?.ifEmpty { null }
    }

    suspend fun setDeviceCode(code: String) {
        val normalized = code.trim()
        context.dataStore.edit { prefs ->
            prefs[deviceCodeKey] = normalized
        }
    }

    suspend fun clearDeviceCode() {
        context.dataStore.edit { prefs ->
            prefs.remove(deviceCodeKey)
        }
    }
}

