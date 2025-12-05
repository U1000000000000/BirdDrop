package com.example.birddrop

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class TransferService : Service() {
    
    private var wakeLock: PowerManager.WakeLock? = null
    private var isForeground = false
    
    companion object {
        private const val CHANNEL_ID = "transfer_channel"
        private const val NOTIFICATION_ID = 1
        private const val COMPLETION_NOTIFICATION_ID = 2
        const val ACTION_START = "com.example.birddrop.START_TRANSFER"
        const val ACTION_START_SILENT = "com.example.birddrop.START_TRANSFER_SILENT"
        const val ACTION_STOP = "com.example.birddrop.STOP_TRANSFER"
        const val ACTION_COMPLETE = "com.example.birddrop.COMPLETE_TRANSFER"
        
        var isRunning = false
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d("TransferService", "onCreate called")
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("TransferService", "onStartCommand called with action: ${intent?.action}")
        when (intent?.action) {
            ACTION_START -> {
                isRunning = true
                Log.d("TransferService", "Starting foreground service with notification")
                
                // Start foreground service immediately with notification
                try {
                    if (!isForeground) {
                        val notification = createNotification()
                        startForeground(NOTIFICATION_ID, notification)
                        isForeground = true
                        Log.d("TransferService", "Foreground service started successfully")
                    } else {
                        // Already in foreground, just update notification
                        val notification = createNotification()
                        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        notificationManager.notify(NOTIFICATION_ID, notification)
                        Log.d("TransferService", "Updated notification for existing foreground service")
                    }
                    
                    // Acquire wake lock if not already held
                    if (wakeLock == null || !wakeLock!!.isHeld) {
                        acquireWakeLock()
                    }
                } catch (e: Exception) {
                    Log.e("TransferService", "Failed to start foreground", e)
                    stopSelf()
                }
            }
            ACTION_START_SILENT -> {
                isRunning = true
                Log.d("TransferService", "Starting service silently (no notification yet)")
                
                // Just acquire wake lock, don't show notification
                try {
                    acquireWakeLock()
                    Log.d("TransferService", "Silent service started with wake lock")
                } catch (e: Exception) {
                    Log.e("TransferService", "Failed to start silent service", e)
                    stopSelf()
                }
            }
            ACTION_STOP -> {
                Log.d("TransferService", "Stopping service")
                stopSelf()
            }
            ACTION_COMPLETE -> {
                Log.d("TransferService", "Transfer complete, showing completion notification")
                
                // Release wake lock
                try {
                    wakeLock?.release()
                    wakeLock = null
                } catch (e: Exception) {
                    Log.e("TransferService", "Error releasing wake lock", e)
                }
                
                isRunning = false
                
                // Stop foreground service if it was in foreground mode
                try {
                    if (isForeground) {
                        stopForeground(true) // true = remove notification
                        isForeground = false
                        Log.d("TransferService", "Stopped foreground service")
                    }
                } catch (e: Exception) {
                    Log.e("TransferService", "Error stopping foreground", e)
                }
                
                // Show a separate completion notification
                try {
                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.notify(COMPLETION_NOTIFICATION_ID, createCompletionNotification())
                    Log.d("TransferService", "Completion notification shown")
                    
                    // Stop service after showing completion notification (don't auto-dismiss)
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        stopSelf()
                    }, 1000)
                } catch (e: Exception) {
                    Log.e("TransferService", "Error showing completion notification", e)
                    stopSelf()
                }
            }
        }
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d("TransferService", "onDestroy called")
        isRunning = false
        isForeground = false
        try {
            wakeLock?.release()
            wakeLock = null
            Log.d("TransferService", "Wake lock released in onDestroy")
        } catch (e: Exception) {
            Log.e("TransferService", "Error releasing wake lock in onDestroy", e)
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun acquireWakeLock() {
        try {
            if (wakeLock != null && wakeLock!!.isHeld) {
                Log.d("TransferService", "Wake lock already held, skipping acquisition")
                return
            }
            
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "BirdDrop::TransferWakeLock"
            )
            // Keep awake for up to 2 hours
            wakeLock?.acquire(2*60*60*1000L)
            Log.d("TransferService", "Wake lock acquired")
        } catch (e: Exception) {
            Log.e("TransferService", "Error acquiring wake lock", e)
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "File Transfer",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Keeps file transfer active in background"
                setShowBadge(true)
                // Make channel non-dismissible during transfer
                setSound(null, null)
                enableVibration(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("BirdDrop Transfer Active")
        .setContentText("Sending or receiving files - stay connected")
        .setSmallIcon(R.drawable.ic_notification)
        .setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .setAutoCancel(false)
        .setContentIntent(
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("openSharePage", true)
                },
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        )
        .build()
    
    private fun createCompletionNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("Transfer Complete")
        .setContentText("All files transferred successfully")
        .setSmallIcon(R.drawable.ic_notification)
        .setOngoing(false)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .setContentIntent(
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("openSharePage", true)
                },
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        )
        .build()
}
