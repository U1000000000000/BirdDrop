package com.example.birddrop

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.tech.IsoDep
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.example.birddrop.ui.theme.BirdDropTheme
import java.util.Arrays

enum class NfcMode { READER, SENDER }

class MainActivity : ComponentActivity() {
    
    internal var webViewInstance: WebView? = null
    
    internal var filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>? = null
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        permissions.entries.forEach {
            Log.d("PERMISSIONS", "${it.key} = ${it.value}")
        }
    }
    
    internal val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val uris = if (data?.clipData != null) {
                // Multiple files selected
                val clipData = data.clipData!!
                Array(clipData.itemCount) { i ->
                    clipData.getItemAt(i).uri
                }
            } else if (data?.data != null) {
                // Single file selected
                arrayOf(data.data!!)
            } else {
                null
            }
            filePathCallback?.onReceiveValue(uris)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }
    
    private fun handleDeepLink(intent: Intent?) {
        val action = intent?.action
        val data = intent?.data
        
        if (action == Intent.ACTION_VIEW && data != null) {
            Log.d("DEEP_LINK", "Deep link received: $data")
            
            // Extract the path from the URL
            val path = data.path ?: "/"
            val query = data.query
            
            // Build the full URL to navigate to
            val urlToLoad = if (query != null) {
                "$path?$query"
            } else {
                path
            }
            
            Log.d("DEEP_LINK", "Navigating to: $urlToLoad")
            
            // Navigate to the URL in WebView
            webViewInstance?.post {
                webViewInstance?.evaluateJavascript("""
                    window.location.href = '$urlToLoad';
                """.trimIndent(), null)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        // Optimize WebView performance - enable Chrome flags
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(false)
        }
        
        // Enable modern WebView rendering
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val processName = android.webkit.WebView.getCurrentWebViewPackage()?.packageName
                Log.d("WEBVIEW", "WebView package: $processName")
            }
        } catch (e: Exception) {
            Log.e("WEBVIEW", "Error checking WebView package", e)
        }
        
        // Request permissions including notification for Android 13+
        val permissionsToRequest = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        
        requestPermissionLauncher.launch(permissionsToRequest.toTypedArray())
        
        // Handle deep link if app was launched from a link
        handleDeepLink(intent)
        
        setContent {
            BirdDropTheme {
                WebViewScreen(savedInstanceState = savedInstanceState)
            }
        }
    }
    
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webViewInstance?.saveState(outState)
    }
    
    override fun onPause() {
        super.onPause()
        // Keep WebView active if transfer service is running
        if (!TransferService.isRunning) {
            webViewInstance?.onPause()
        }
    }
    
    override fun onResume() {
        super.onResume()
        webViewInstance?.onResume()
        
        // Handle deep links from intent
        handleDeepLink(intent)
        
        // Check if we should navigate to share page from notification
        intent?.getBooleanExtra("openSharePage", false)?.let { shouldOpen ->
            if (shouldOpen) {
                // Navigate to share page
                webViewInstance?.evaluateJavascript("""
                    if (window.location.pathname !== '/share') {
                        window.location.href = '/share';
                    }
                """.trimIndent(), null)
                // Clear the extra so it doesn't trigger again
                intent?.removeExtra("openSharePage")
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        
        // Handle deep links from new intent
        handleDeepLink(intent)
        
        // Check if we should navigate to share page from notification
        intent?.getBooleanExtra("openSharePage", false)?.let { shouldOpen ->
            if (shouldOpen) {
                // Navigate to share page
                webViewInstance?.evaluateJavascript("""
                    if (window.location.pathname !== '/share') {
                        window.location.href = '/share';
                    }
                """.trimIndent(), null)
            }
        }
    }
}

@Composable
fun WebViewScreen(savedInstanceState: Bundle? = null) {
    val context = LocalContext.current
    var canGoBack by remember { mutableStateOf(false) }
    var currentUrl by remember { mutableStateOf("") }
    var nfcMode by remember { mutableStateOf(NfcMode.READER) }

    val webView = remember {
        WebView(context).apply {
            // Store reference for lifecycle management
            (context as? MainActivity)?.webViewInstance = this
            
            // Enable GPU rasterization and optimize rendering
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
            }
            
            // Optimize touch handling
            isNestedScrollingEnabled = false
            setOnTouchListener(null)
            
            // Reduce overdraw
            setWillNotDraw(false)
            
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            
            // Enable geolocation
            settings.setGeolocationEnabled(true)
            
            // Cache and loading optimizations
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            
            // Performance optimizations
            settings.setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH)
            
            // Enable hardware acceleration at WebView level
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
            }
            
            // Disable unnecessary features for performance
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.setSupportZoom(false)
            settings.saveFormData = false
            
            // Optimize scrolling
            isScrollbarFadingEnabled = true
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = android.view.View.OVER_SCROLL_NEVER
            
            // Image and resource loading optimizations
            settings.loadsImagesAutomatically = true
            settings.blockNetworkImage = false
            
            // Viewport and layout optimizations
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.layoutAlgorithm = android.webkit.WebSettings.LayoutAlgorithm.NORMAL
            
            // Enable aggressive resource caching
            settings.databaseEnabled = true
            settings.domStorageEnabled = true
            
            // Disable safe browsing for performance (only for internal app)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                settings.safeBrowsingEnabled = false
            }
            
            // File access
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            
            // Set solid background color for performance
            setBackgroundColor(android.graphics.Color.parseColor("#32012F"))
            
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                    // Keep navigation within WebView for better performance
                    return false
                }
                
                override fun onPageFinished(view: WebView, url: String?) {
                    super.onPageFinished(view, url)
                    currentUrl = url ?: ""
                    canGoBack = view.canGoBack()
                    
                    // Use solid color for optimal performance
                    view.evaluateJavascript("""
                        (function() {
                            window.isAndroidWebView = true;
                            var style = document.createElement('style');
                            style.innerHTML = 'body{background:#32012F!important}body::before,body::after{display:none!important}*{will-change:auto!important}video{background:black!important}video::-webkit-media-controls-play-button{display:none!important}';
                            document.head.appendChild(style);
                            
                            function handleVideo(v){v.setAttribute('poster','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');v.style.background='black';}
                            document.querySelectorAll('video').forEach(handleVideo);
                            
                            var obs=new MutationObserver(function(muts){
                                var t;return function(m){clearTimeout(t);t=setTimeout(function(){m.forEach(function(mu){mu.addedNodes.forEach(function(n){if(n.tagName==='VIDEO')handleVideo(n);else if(n.querySelectorAll)n.querySelectorAll('video').forEach(handleVideo);});});},150);}
                            }());
                            obs.observe(document.body,{childList:true,subtree:true});
                        })();
                    """.trimIndent(), null)
                }
            }
            webChromeClient = object : android.webkit.WebChromeClient() {
                // Handle geolocation permission requests
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: android.webkit.GeolocationPermissions.Callback?
                ) {
                    callback?.invoke(origin, true, false)
                }
                
                // Handle camera/microphone permission requests
                override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                    request?.grant(request.resources)
                }
                
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallbackNew: android.webkit.ValueCallback<Array<android.net.Uri>>?,
                    fileChooserParams: android.webkit.WebChromeClient.FileChooserParams?
                ): Boolean {
                    // Cancel any previous callback
                    (context as? MainActivity)?.filePathCallback?.onReceiveValue(null)
                    (context as? MainActivity)?.filePathCallback = filePathCallbackNew
                    
                    val intent = fileChooserParams?.createIntent()
                    intent?.type = "*/*" // Allow all file types
                    intent?.putExtra(android.content.Intent.EXTRA_ALLOW_MULTIPLE, true) // Enable multiple selection
                    
                    try {
                        (context as? MainActivity)?.fileChooserLauncher?.launch(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e("FILE_CHOOSER", "Error launching file chooser", e)
                        (context as? MainActivity)?.filePathCallback?.onReceiveValue(null)
                        (context as? MainActivity)?.filePathCallback = null
                        return false
                    }
                }
            }
            addJavascriptInterface(WebAppInterface(context.applicationContext) { mode, data ->
                nfcMode = mode
                HceService.dataToSend = data?.toByteArray(Charsets.UTF_8)
            }, "Android")
            
            // Restore state if available, otherwise load URL
            if (savedInstanceState != null) {
                Log.d("WEBVIEW_STATE", "Restoring WebView state from savedInstanceState")
                restoreState(savedInstanceState)
            } else {
                Log.d("WEBVIEW_STATE", "No saved state, loading initial URL")
                loadUrl("https://bird-drop.vercel.app")
            }
        }
    }

    // Keep WebView active - don't pause when service is running
    DisposableEffect(Unit) {
        webView.onResume()
        onDispose {
            // Only pause if transfer service is not running
            if (!TransferService.isRunning) {
                webView.onPause()
            }
        }
    }

    NfcController(context = context, nfcMode = nfcMode) { sessionCode ->
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, "NFC Read Successful: $sessionCode", Toast.LENGTH_LONG).show()
            webView.evaluateJavascript("window.onNfcReceived && window.onNfcReceived('$sessionCode');", null)
        }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            SwipeRefreshLayout(ctx).apply {
                // Set progress view offset to move spinner down (start, end offset in pixels)
                setProgressViewOffset(false, 150, 400)
                
                // Increase distance to trigger refresh - makes it less sensitive
                setDistanceToTriggerSync(200)
                
                // Set colors to match app theme - emerald/purple gradient palette
                setColorSchemeColors(
                    0xFF10B981.toInt(), // Emerald 500
                    0xFFD27BFF.toInt(), // Purple from gradient
                    0xFF06B6D4.toInt(), // Cyan 500
                    0xFFF7C9A8.toInt()  // Peach from gradient
                )
                // Set background color with transparency
                setProgressBackgroundColorSchemeColor(0x40FFFFFF.toInt())
                setOnRefreshListener {
                    webView.reload()
                    Handler(Looper.getMainLooper()).postDelayed({
                        isRefreshing = false
                    }, 1000)
                }
                addView(webView, ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))
            }
        }
    )

    BackHandler(enabled = true) {
        // Check if modal is open first
        webView.evaluateJavascript("window.__modal_open || false", { modalOpen ->
            val isModalOpen = modalOpen?.trim('"') == "true"
            
            if (isModalOpen) {
                // Close modal by setting previewFile to null
                Log.d("BACK_HANDLER", "Modal is open, closing it")
                webView.evaluateJavascript(
                    """(function() {
                        const event = new CustomEvent('closeModal');
                        window.dispatchEvent(event);
                    })();""", null
                )
                return@evaluateJavascript
            }
            
            // Check current route using JavaScript
            webView.evaluateJavascript("window.location.pathname", { pathname ->
                val path = pathname?.trim('"') ?: ""
                Log.d("BACK_HANDLER", "Current pathname: $path")
                
                when {
                    path == "/" -> {
                        // On home page, exit app
                        Log.d("BACK_HANDLER", "On home page, exiting app")
                        (context as? Activity)?.finish()
                    }
                    path.contains("share") || path.contains("about") || 
                    path.contains("downloads") || path.contains("download-app") -> {
                        // On any inner page, use browser back navigation
                        Log.d("BACK_HANDLER", "On $path page, navigating back")
                        webView.evaluateJavascript("window.history.back();", null)
                    }
                    canGoBack -> {
                        // Has browser history, go back
                        Log.d("BACK_HANDLER", "Has history, going back")
                        webView.goBack()
                    }
                    else -> {
                        // Exit app
                        Log.d("BACK_HANDLER", "No history, exiting app")
                        (context as? Activity)?.finish()
                    }
                }
            })
        })
    }
}

@Composable
fun NfcController(context: Context, nfcMode: NfcMode, onSessionCodeRead: (String) -> Unit) {
    val nfcAdapter = remember { NfcAdapter.getDefaultAdapter(context) }
    val lifecycleOwner = LocalLifecycleOwner.current
    Log.d("NFC_DEBUG", "NfcController recomposing. Current mode: $nfcMode")

    DisposableEffect(nfcMode, lifecycleOwner) {
        val pm = context.packageManager
        val componentName = ComponentName(context, HceService::class.java)
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                Log.d("NFC_DEBUG", "ON_RESUME: Configuring NFC for mode: $nfcMode")
                if (nfcMode == NfcMode.SENDER) {
                    nfcAdapter?.disableReaderMode(context as Activity)
                    // Explicitly enable HceService
                    pm.setComponentEnabledSetting(componentName,
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                        PackageManager.DONT_KILL_APP)
                    Log.i("NFC_DEBUG", "SENDER mode enabled. HCE service should be active.")
                } else {
                    // Explicitly disable HceService
                    pm.setComponentEnabledSetting(componentName,
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP)
                    val readerCallback = NfcAdapter.ReaderCallback { tag ->
                        Log.i("NFC_DEBUG", "READER: Tag discovered!")
                        val isoDep = IsoDep.get(tag)
                        isoDep?.use { iso ->
                            try {
                                iso.connect()
                                Log.i("NFC_DEBUG", "READER: Sending SELECT_APDU: " + HceService.SELECT_APDU.joinToString(" ") { String.format("%02X", it) })
                                val result = iso.transceive(HceService.SELECT_APDU)
                                val payload = result.copyOfRange(0, result.size - 2)
                                if (Arrays.equals(result.copyOfRange(result.size - 2, result.size), HceService.SW_OK)) {
                                    val sessionCode = String(payload, Charsets.UTF_8)
                                    Log.i("NFC_DEBUG", "READER: Success! Session code read: $sessionCode")
                                    onSessionCodeRead(sessionCode)
                                } else {
                                    Log.w("NFC_DEBUG", "READER: Tag responded with non-OK status.")
                                }
                            } catch (e: Exception) {
                                Log.e("NFC_DEBUG", "READER: Error reading tag", e)
                            }
                        }
                    }
                    nfcAdapter?.enableReaderMode(context as Activity, readerCallback, NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null)
                    Log.i("NFC_DEBUG", "READER mode enabled.")
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            Log.d("NFC_DEBUG", "onDispose: Disabling reader mode and HCE service.")
            nfcAdapter?.disableReaderMode(context as Activity)
            pm.setComponentEnabledSetting(componentName,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP)
        }
    }
}

class WebAppInterface(private val context: Context, private val onModeChange: (NfcMode, String?) -> Unit) {
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // Use a single thread executor to process downloads sequentially
    private val downloadExecutor = java.util.concurrent.Executors.newSingleThreadExecutor()

    @JavascriptInterface
    fun setSenderMode(data: String) {
        Log.i("NFC_DEBUG", "JS_BRIDGE: setSenderMode called with data: $data")
        mainHandler.post {
            Toast.makeText(context, "Switched to Sender Mode.", Toast.LENGTH_SHORT).show()
            Toast.makeText(context, "HCE Service enabled, data staged: $data", Toast.LENGTH_LONG).show()
            onModeChange(NfcMode.SENDER, data)
        }
    }

    @JavascriptInterface
    fun setReaderMode() {
        Log.i("NFC_DEBUG", "JS_BRIDGE: setReaderMode called.")
        mainHandler.post {
            Toast.makeText(context, "Switched to Reader Mode.", Toast.LENGTH_SHORT).show()
            onModeChange(NfcMode.READER, null)
        }
    }
    
    @JavascriptInterface
    fun startTransferService() {
        Log.i("TRANSFER_SERVICE", "Starting foreground service for background transfer")
        mainHandler.post {
            // Check if battery optimization is needed and request it with explanation
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
                if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
                    // Show dialog explaining why we need this permission
                    val activity = context as? Activity
                    activity?.let {
                        val builder = android.app.AlertDialog.Builder(it)
                        builder.setTitle("Keep Transfer Active")
                        builder.setMessage("To continue file transfer in the background, BirdDrop needs permission to run while you use other apps.\n\nThis permission will only be used during active file transfers.")
                        builder.setPositiveButton("Allow") { _, _ ->
                            val intent = Intent()
                            intent.action = android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                            intent.data = android.net.Uri.parse("package:${context.packageName}")
                            try {
                                activity.startActivity(intent)
                            } catch (e: Exception) {
                                Log.e("BATTERY", "Failed to request battery optimization exemption", e)
                            }
                            // Start service anyway
                            startTransferServiceActual(showNotification = true)
                        }
                        builder.setNegativeButton("Skip") { _, _ ->
                            startTransferServiceActual(showNotification = true)
                        }
                        builder.setCancelable(false)
                        builder.show()
                    } ?: startTransferServiceActual(showNotification = true)
                } else {
                    startTransferServiceActual(showNotification = true)
                }
            } else {
                startTransferServiceActual(showNotification = true)
            }
        }
    }
    
    @JavascriptInterface
    fun startTransferServiceSilent() {
        Log.i("TRANSFER_SERVICE", "Starting service silently (no notification)")
        mainHandler.post {
            startTransferServiceActual(showNotification = false)
        }
    }
    
    private fun startTransferServiceActual(showNotification: Boolean = true) {
        try {
            val intent = Intent(context, TransferService::class.java).apply {
                action = if (showNotification) TransferService.ACTION_START else TransferService.ACTION_START_SILENT
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            Log.i("TRANSFER_SERVICE", "Service start command sent successfully (notification: $showNotification)")
        } catch (e: Exception) {
            Log.e("TRANSFER_SERVICE", "Failed to start service", e)
        }
    }
    
    @JavascriptInterface
    fun stopTransferService() {
        Log.i("TRANSFER_SERVICE", "Stopping foreground service")
        mainHandler.post {
            try {
                val intent = Intent(context, TransferService::class.java).apply {
                    action = TransferService.ACTION_STOP
                }
                context.stopService(intent)
            } catch (e: Exception) {
                Log.e("TRANSFER_SERVICE", "Failed to stop service", e)
            }
        }
    }
    
    @JavascriptInterface
    fun completeTransferService() {
        Log.i("TRANSFER_SERVICE", "Marking transfer as complete")
        mainHandler.post {
            try {
                val intent = Intent(context, TransferService::class.java).apply {
                    action = TransferService.ACTION_COMPLETE
                }
                context.startService(intent)
            } catch (e: Exception) {
                Log.e("TRANSFER_SERVICE", "Failed to update service", e)
            }
        }
    }
    
    // Map to store active downloads by ID
    private val activeDownloads = java.util.concurrent.ConcurrentHashMap<String, java.io.OutputStream>()
    
    @JavascriptInterface
    fun initDownload(downloadId: String, fileName: String, mimeType: String): Boolean {
        Log.i("DOWNLOAD", "Initializing chunked download: $fileName (ID: $downloadId)")
        
        return try {
            val outputStream = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ - Use MediaStore (scoped storage)
                val resolver = context.contentResolver
                val contentValues = android.content.ContentValues().apply {
                    put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, 
                        "${android.os.Environment.DIRECTORY_DOWNLOADS}/BirdDrop")
                }
                
                val uri = resolver.insert(
                    android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    contentValues
                )
                
                uri?.let { resolver.openOutputStream(it) }
            } else {
                // Android 9 and below - Use traditional file system
                val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(
                    android.os.Environment.DIRECTORY_DOWNLOADS
                )
                val birdDropDir = java.io.File(downloadsDir, "BirdDrop")
                if (!birdDropDir.exists()) {
                    birdDropDir.mkdirs()
                }
                
                val file = java.io.File(birdDropDir, fileName)
                java.io.FileOutputStream(file)
            }
            
            if (outputStream != null) {
                // Wrap in BufferedOutputStream for better performance (64KB buffer)
                val bufferedStream = java.io.BufferedOutputStream(outputStream, 65536)
                activeDownloads[downloadId] = bufferedStream
                Log.i("DOWNLOAD", "Download stream created for: $fileName")
                true
            } else {
                Log.e("DOWNLOAD", "Failed to create output stream for: $fileName")
                false
            }
        } catch (e: Exception) {
            Log.e("DOWNLOAD", "Error initializing download: $fileName", e)
            mainHandler.post {
                Toast.makeText(context, "Failed to start download: $fileName", Toast.LENGTH_SHORT).show()
            }
            false
        }
    }
    
    @JavascriptInterface
    fun appendChunk(downloadId: String, base64Chunk: String): Boolean {
        return try {
            val outputStream = activeDownloads[downloadId]
            if (outputStream == null) {
                Log.e("DOWNLOAD", "No active download found for ID: $downloadId")
                return false
            }
            
            // Use NO_WRAP flag for faster decoding (no newlines in base64)
            val decodedChunk = android.util.Base64.decode(base64Chunk, android.util.Base64.NO_WRAP)
            outputStream.write(decodedChunk)
            // Don't flush on every chunk - let buffering work
            true
        } catch (e: OutOfMemoryError) {
            Log.e("DOWNLOAD", "Out of memory appending chunk for ID: $downloadId", e)
            // Clean up on OOM
            try {
                activeDownloads.remove(downloadId)?.close()
            } catch (ignored: Exception) {}
            System.gc()
            false
        } catch (e: Exception) {
            Log.e("DOWNLOAD", "Error appending chunk for ID: $downloadId", e)
            false
        }
    }
    
    @JavascriptInterface
    fun finalizeDownload(downloadId: String, fileName: String, mimeType: String): Boolean {
        Log.i("DOWNLOAD", "Finalizing download: $fileName (ID: $downloadId)")
        
        return try {
            val outputStream = activeDownloads.remove(downloadId)
            if (outputStream == null) {
                Log.e("DOWNLOAD", "No active download found for ID: $downloadId")
                return false
            }
            
            outputStream.flush()
            outputStream.close()
            
            // Notify media scanner for Android 9 and below
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(
                    android.os.Environment.DIRECTORY_DOWNLOADS
                )
                val birdDropDir = java.io.File(downloadsDir, "BirdDrop")
                val file = java.io.File(birdDropDir, fileName)
                
                android.media.MediaScannerConnection.scanFile(
                    context,
                    arrayOf(file.absolutePath),
                    arrayOf(mimeType),
                    null
                )
            }
            
            Log.i("DOWNLOAD", "File saved successfully: $fileName")
            mainHandler.post {
                Toast.makeText(context, "Downloaded: $fileName", Toast.LENGTH_SHORT).show()
            }
            
            System.gc()
            true
        } catch (e: Exception) {
            Log.e("DOWNLOAD", "Error finalizing download: $fileName", e)
            mainHandler.post {
                Toast.makeText(context, "Download failed: $fileName", Toast.LENGTH_SHORT).show()
            }
            false
        }
    }
    
    @JavascriptInterface
    fun cancelDownload(downloadId: String) {
        try {
            activeDownloads.remove(downloadId)?.close()
            Log.i("DOWNLOAD", "Cancelled download ID: $downloadId")
        } catch (e: Exception) {
            Log.e("DOWNLOAD", "Error cancelling download ID: $downloadId", e)
        }
    }
    
    @JavascriptInterface
    fun downloadFile(base64Data: String, fileName: String, mimeType: String) {
        Log.i("DOWNLOAD", "Queueing download: $fileName (size: ${base64Data.length} chars)")
        
        // Check file size - base64 is ~33% larger than original
        val estimatedSizeMB = (base64Data.length * 0.75 / 1024 / 1024).toInt()
        
        if (estimatedSizeMB > 100) {
            Log.w("DOWNLOAD", "Large file detected: ${estimatedSizeMB}MB - this may cause memory issues")
            mainHandler.post {
                Toast.makeText(context, "Downloading large file (${estimatedSizeMB}MB)...", Toast.LENGTH_LONG).show()
            }
        }
        
        // Use single thread executor to process downloads one at a time
        // This prevents memory pressure from parallel base64 decoding
        downloadExecutor.execute {
            var outputStream: java.io.OutputStream? = null
            try {
                // For large files, decode and write in chunks to avoid OOM
                val CHUNK_SIZE = 1024 * 1024 // 1MB chunks for decoding
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // Android 10+ - Use MediaStore (scoped storage)
                    val resolver = context.contentResolver
                    val contentValues = android.content.ContentValues().apply {
                        put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType)
                        put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, 
                            "${android.os.Environment.DIRECTORY_DOWNLOADS}/BirdDrop")
                    }
                    
                    val uri = resolver.insert(
                        android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        contentValues
                    )
                    
                    if (uri == null) {
                        mainHandler.post {
                            Toast.makeText(context, "Download failed: $fileName", Toast.LENGTH_SHORT).show()
                        }
                        Log.e("DOWNLOAD", "Failed to create file URI")
                        return@execute
                    }
                    
                    outputStream = resolver.openOutputStream(uri)
                } else {
                    // Android 9 and below - Use traditional file system
                    val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(
                        android.os.Environment.DIRECTORY_DOWNLOADS
                    )
                    val birdDropDir = java.io.File(downloadsDir, "BirdDrop")
                    if (!birdDropDir.exists()) {
                        birdDropDir.mkdirs()
                    }
                    
                    val file = java.io.File(birdDropDir, fileName)
                    outputStream = java.io.FileOutputStream(file)
                    
                    // Notify media scanner after we're done
                    android.media.MediaScannerConnection.scanFile(
                        context,
                        arrayOf(file.absolutePath),
                        arrayOf(mimeType),
                        null
                    )
                }
                
                if (outputStream == null) {
                    throw Exception("Failed to create output stream")
                }
                
                // Decode and write in chunks to avoid holding entire file in memory
                var offset = 0
                val dataLength = base64Data.length
                
                while (offset < dataLength) {
                    val endOffset = minOf(offset + CHUNK_SIZE, dataLength)
                    val chunk = base64Data.substring(offset, endOffset)
                    
                    try {
                        val decodedChunk = android.util.Base64.decode(chunk, android.util.Base64.DEFAULT)
                        outputStream.write(decodedChunk)
                        offset = endOffset
                    } catch (e: OutOfMemoryError) {
                        Log.e("DOWNLOAD", "Out of memory decoding chunk at offset $offset for file: $fileName")
                        throw e
                    }
                }
                
                outputStream.flush()
                outputStream.close()
                outputStream = null
                
                Log.i("DOWNLOAD", "File saved successfully: $fileName")
                mainHandler.post {
                    Toast.makeText(context, "Downloaded: $fileName", Toast.LENGTH_SHORT).show()
                }
                
                // Suggest GC after large file
                System.gc()
            } catch (e: OutOfMemoryError) {
                Log.e("DOWNLOAD", "Out of memory downloading file: $fileName", e)
                mainHandler.post {
                    Toast.makeText(context, "File too large: $fileName", Toast.LENGTH_SHORT).show()
                }
                // Clean up partial file on error
                try {
                    outputStream?.close()
                } catch (ignored: Exception) {}
                System.gc()
            } catch (e: Exception) {
                Log.e("DOWNLOAD", "Download failed: $fileName", e)
                mainHandler.post {
                    Toast.makeText(context, "Download failed: $fileName", Toast.LENGTH_SHORT).show()
                }
                // Clean up
                try {
                    outputStream?.close()
                } catch (ignored: Exception) {}
                System.gc()
            }
        }
    }
    
    @JavascriptInterface
    fun getDownloadedFiles(): String {
        Log.i("DOWNLOADS", "Getting list of downloaded files")
        return try {
            val files = mutableListOf<Map<String, Any>>()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ - Query MediaStore
                val projection = arrayOf(
                    android.provider.MediaStore.MediaColumns._ID,
                    android.provider.MediaStore.MediaColumns.DISPLAY_NAME,
                    android.provider.MediaStore.MediaColumns.SIZE,
                    android.provider.MediaStore.MediaColumns.DATE_MODIFIED,
                    android.provider.MediaStore.MediaColumns.MIME_TYPE,
                    android.provider.MediaStore.MediaColumns.RELATIVE_PATH
                )
                
                val selection = "${android.provider.MediaStore.MediaColumns.RELATIVE_PATH} LIKE ?"
                val selectionArgs = arrayOf("%BirdDrop%")
                val sortOrder = "${android.provider.MediaStore.MediaColumns.DATE_MODIFIED} DESC"
                
                context.contentResolver.query(
                    android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    selectionArgs,
                    sortOrder
                )?.use { cursor ->
                    val idColumn = cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns._ID)
                    val nameColumn = cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns.DISPLAY_NAME)
                    val sizeColumn = cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns.SIZE)
                    val dateColumn = cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns.DATE_MODIFIED)
                    val mimeColumn = cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns.MIME_TYPE)
                    
                    while (cursor.moveToNext()) {
                        val id = cursor.getLong(idColumn)
                        val name = cursor.getString(nameColumn)
                        val size = cursor.getLong(sizeColumn)
                        val dateModified = cursor.getLong(dateColumn) * 1000 // Convert to milliseconds
                        val mimeType = cursor.getString(mimeColumn) ?: "application/octet-stream"
                        
                        val uri = android.content.ContentUris.withAppendedId(
                            android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                            id
                        )
                        
                        // Skip thumbnail generation to prevent crashes on large lists
                        // Thumbnails cause heavy memory usage and can crash the app
                        
                        files.add(mapOf(
                            "name" to name,
                            "size" to size,
                            "lastModified" to dateModified,
                            "path" to uri.toString(),
                            "mimeType" to mimeType,
                            "thumbnail" to ""
                        ))
                    }
                }
            } else {
                // Android 9 and below - Read from file system
                val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(
                    android.os.Environment.DIRECTORY_DOWNLOADS
                )
                val birdDropDir = java.io.File(downloadsDir, "BirdDrop")
                
                if (birdDropDir.exists() && birdDropDir.isDirectory) {
                    birdDropDir.listFiles()?.sortedByDescending { it.lastModified() }?.forEach { file ->
                        val mimeType = android.webkit.MimeTypeMap.getSingleton()
                            .getMimeTypeFromExtension(file.extension) ?: "application/octet-stream"
                        
                        // Skip thumbnail generation to prevent crashes
                        
                        files.add(mapOf(
                            "name" to file.name,
                            "size" to file.length(),
                            "lastModified" to file.lastModified(),
                            "path" to file.absolutePath,
                            "mimeType" to mimeType,
                            "thumbnail" to ""
                        ))
                    }
                }
            }
            
            // Convert to JSON
            val json = org.json.JSONArray(files).toString()
            Log.i("DOWNLOADS", "Returning ${files.size} files")
            json
        } catch (e: Exception) {
            Log.e("DOWNLOADS", "Failed to get downloaded files", e)
            "[]"
        }
    }
    
    @JavascriptInterface
    fun openFile(filePath: String) {
        Log.i("DOWNLOADS", "Opening file: $filePath")
        mainHandler.post {
            try {
                val uri = if (filePath.startsWith("content://")) {
                    android.net.Uri.parse(filePath)
                } else {
                    // For file paths, use FileProvider
                    androidx.core.content.FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        java.io.File(filePath)
                    )
                }
                
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, context.contentResolver.getType(uri))
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
                }
                
                try {
                    context.startActivity(intent)
                } catch (e: android.content.ActivityNotFoundException) {
                    Toast.makeText(context, "No app found to open this file", Toast.LENGTH_SHORT).show()
                    Log.w("DOWNLOADS", "No app to open file", e)
                }
            } catch (e: Exception) {
                Log.e("DOWNLOADS", "Failed to open file", e)
                Toast.makeText(context, "Failed to open file", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    @JavascriptInterface
    fun shareFile(filePath: String) {
        Log.i("DOWNLOADS", "Sharing file: $filePath")
        mainHandler.post {
            try {
                val uri = if (filePath.startsWith("content://")) {
                    android.net.Uri.parse(filePath)
                } else {
                    androidx.core.content.FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        java.io.File(filePath)
                    )
                }
                
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = context.contentResolver.getType(uri)
                    putExtra(Intent.EXTRA_STREAM, uri)
                    flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
                }
                
                val chooser = Intent.createChooser(intent, "Share via").apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                
                context.startActivity(chooser)
            } catch (e: Exception) {
                Log.e("DOWNLOADS", "Failed to share file", e)
                Toast.makeText(context, "Failed to share file", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    @JavascriptInterface
    fun deleteFile(filePath: String): Boolean {
        Log.i("DOWNLOADS", "Moving file to trash: $filePath")
        return try {
            val moved = if (filePath.startsWith("content://")) {
                // Android 10+ - Move to trash via MediaStore
                val uri = android.net.Uri.parse(filePath)
                val values = android.content.ContentValues()
                values.put(android.provider.MediaStore.MediaColumns.IS_TRASHED, 1)
                context.contentResolver.update(uri, values, null, null) > 0
            } else {
                // Android 9- - Delete file directly (no trash support)
                java.io.File(filePath).delete()
            }
            
            if (moved) {
                mainHandler.post {
                    Toast.makeText(context, "File moved to trash", Toast.LENGTH_SHORT).show()
                }
                Log.i("DOWNLOADS", "File moved to trash successfully")
            } else {
                Log.w("DOWNLOADS", "Failed to move file to trash")
            }
            moved
        } catch (e: Exception) {
            Log.e("DOWNLOADS", "Error moving file to trash", e)
            mainHandler.post {
                Toast.makeText(context, "Failed to delete file", Toast.LENGTH_SHORT).show()
            }
            false
        }
    }
    
    @JavascriptInterface
    fun clearAllFiles(): Boolean {
        Log.i("DOWNLOADS", "Clearing all files")
        return try {
            var deletedCount = 0
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ - Delete via MediaStore
                val projection = arrayOf(
                    android.provider.MediaStore.MediaColumns._ID,
                    android.provider.MediaStore.MediaColumns.RELATIVE_PATH
                )
                
                val selection = "${android.provider.MediaStore.MediaColumns.RELATIVE_PATH} LIKE ?"
                val selectionArgs = arrayOf("%BirdDrop%")
                
                context.contentResolver.query(
                    android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    selectionArgs,
                    null
                )?.use { cursor ->
                    val idColumn = cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns._ID)
                    
                    while (cursor.moveToNext()) {
                        val id = cursor.getLong(idColumn)
                        val uri = android.content.ContentUris.withAppendedId(
                            android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                            id
                        )
                        if (context.contentResolver.delete(uri, null, null) > 0) {
                            deletedCount++
                        }
                    }
                }
            } else {
                // Android 9- - Delete directory
                val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(
                    android.os.Environment.DIRECTORY_DOWNLOADS
                )
                val birdDropDir = java.io.File(downloadsDir, "BirdDrop")
                
                if (birdDropDir.exists() && birdDropDir.isDirectory) {
                    birdDropDir.listFiles()?.forEach { file ->
                        if (file.delete()) {
                            deletedCount++
                        }
                    }
                }
            }
            
            mainHandler.post {
                Toast.makeText(context, "Deleted $deletedCount files", Toast.LENGTH_SHORT).show()
            }
            Log.i("DOWNLOADS", "Cleared $deletedCount files")
            true
        } catch (e: Exception) {
            Log.e("DOWNLOADS", "Error clearing files", e)
            mainHandler.post {
                Toast.makeText(context, "Failed to clear files", Toast.LENGTH_SHORT).show()
            }
            false
        }
    }
}
