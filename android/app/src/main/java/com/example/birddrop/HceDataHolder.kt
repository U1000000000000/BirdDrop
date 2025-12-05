package com.example.birddrop

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Singleton object to hold and broadcast HCE events using a SharedFlow.
 * This is a modern, thread-safe replacement for LocalBroadcastManager.
 */
object HceDataHolder {

    // A private mutable flow that only this object can emit to.
    private val _hceEvents = MutableSharedFlow<String>()

    // A public, read-only flow that UI components can collect from.
    val hceEvents = _hceEvents.asSharedFlow()

    /**
     * Called by the HceService to push new data.
     * The 'suspend' keyword ensures it's called from a coroutine.
     */
    suspend fun onDataReceived(data: String) {
        _hceEvents.emit(data)
    }
}