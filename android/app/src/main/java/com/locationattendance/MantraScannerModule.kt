package com.locationattendance

import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mantra.mfs100.FingerData
import com.mantra.mfs100.MFS100
import com.mantra.mfs100.MFS100Event

class MantraScannerModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext), MFS100Event {

    private var mfs100: MFS100? = null
    private var capturePromise: Promise? = null
    private var initPromise: Promise? = null

    override fun getName(): String {
        return "MantraScanner"
    }

    // Helper to send events to JS (for connection status changes or preview)
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun initializeScanner(promise: Promise) {
        try {
            if (mfs100 == null) {
                // Initialize MFS100 (41 or correct version is handled by SDK)
                mfs100 = MFS100(this)
            }
            initPromise = promise
            val ret = mfs100?.Init() ?: -1
            if (ret != 0) {
                val errorMsg = mfs100?.GetErrorMsg(ret) ?: "Unknown error"
                promise.reject("INIT_ERROR", "Failed to initialize: $errorMsg (code: $ret)")
                initPromise = null
            } else {
                promise.resolve("SUCCESS")
                initPromise = null
            }
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message, e)
            initPromise = null
        }
    }

    @ReactMethod
    fun uninitializeScanner(promise: Promise) {
        try {
            val ret = mfs100?.UnInit() ?: 0
            mfs100 = null
            promise.resolve(ret)
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message, e)
        }
    }

    @ReactMethod
    fun startCapture(minQuality: Int, timeoutMs: Int, promise: Promise) {
        if (mfs100 == null) {
            promise.reject("NOT_INITIALIZED", "Scanner is not initialized. Call initializeScanner first.")
            return
        }
        if (capturePromise != null) {
            promise.reject("ALREADY_CAPTURING", "A capture session is already in progress.")
            return
        }
        capturePromise = promise
        try {
            val ret = mfs100?.StartCapture(minQuality, timeoutMs, true) ?: -1
            if (ret != 0) {
                val errorMsg = mfs100?.GetErrorMsg(ret) ?: "Unknown error"
                capturePromise = null
                promise.reject("CAPTURE_START_FAILED", "Failed to start capture: $errorMsg (code: $ret)")
            }
        } catch (e: Exception) {
            capturePromise = null
            promise.reject("EXCEPTION", e.message, e)
        }
    }

    @ReactMethod
    fun stopCapture(promise: Promise) {
        try {
            val ret = mfs100?.StopCapture() ?: 0
            capturePromise = null
            promise.resolve(ret)
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message, e)
        }
    }

    @ReactMethod
    fun matchFingerprints(template1Base64: String, template2Base64: String, promise: Promise) {
        if (mfs100 == null) {
            mfs100 = MFS100(this)
        }
        try {
            val t1 = Base64.decode(template1Base64, Base64.DEFAULT)
            val t2 = Base64.decode(template2Base64, Base64.DEFAULT)
            val score = mfs100?.MatchISO(t1, t2) ?: -1
            promise.resolve(score)
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message, e)
        }
    }

    @ReactMethod
    fun matchUser(currentTemplateBase64: String, userList: ReadableArray, promise: Promise) {
        if (mfs100 == null) {
            mfs100 = MFS100(this)
        }
        try {
            val currentBytes = Base64.decode(currentTemplateBase64, Base64.DEFAULT)
            var matchedUser: WritableMap? = null
            var highestScore = 0
            val matchThreshold = 14000 // Mantra default matching threshold for MatchISO

            for (i in 0 until userList.size()) {
                val userMap = userList.getMap(i) ?: continue
                val storedTemplateBase64 = userMap.getString("fingerprintTemplate")
                if (storedTemplateBase64.isNullOrEmpty()) continue

                val storedBytes = Base64.decode(storedTemplateBase64, Base64.DEFAULT)
                val score = mfs100?.MatchISO(currentBytes, storedBytes) ?: -1

                if (score >= matchThreshold && score > highestScore) {
                    highestScore = score
                    matchedUser = Arguments.createMap().apply {
                        putString("uid", userMap.getString("uid"))
                        putString("name", userMap.getString("name"))
                        putInt("matchScore", score)
                    }
                }
            }

            if (matchedUser != null) {
                promise.resolve(matchedUser)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message, e)
        }
    }

    // --- MFS100Event Callback Implementations ---

    override fun OnDeviceAttached(vid: Int, pid: Int, hasPermission: Boolean) {
        val params = Arguments.createMap().apply {
            putInt("vid", vid)
            putInt("pid", pid)
            putBoolean("hasPermission", hasPermission)
        }
        sendEvent("onDeviceAttached", params)
    }

    override fun OnDeviceDetached() {
        sendEvent("onDeviceDetached", null)
    }

    override fun OnHostCheckFailed(msg: String?) {
        val params = Arguments.createMap().apply {
            putString("message", msg)
        }
        sendEvent("onHostCheckFailed", params)
    }

    override fun OnCaptureCompleted(status: Boolean, errorCode: Int, errorMsg: String?, fingerData: FingerData?) {
        val promise = capturePromise
        capturePromise = null

        if (promise == null) return

        if (status && fingerData != null) {
            val result = Arguments.createMap().apply {
                val isoTemplate = Base64.encodeToString(fingerData.ISOTemplate(), Base64.NO_WRAP)
                val ansiTemplate = Base64.encodeToString(fingerData.ANSITemplate(), Base64.NO_WRAP)
                val imageBase64 = Base64.encodeToString(fingerData.FingerImage(), Base64.NO_WRAP)
                
                putString("isoTemplate", isoTemplate)
                putString("ansiTemplate", ansiTemplate)
                putString("fingerprintImage", imageBase64)
                putInt("quality", fingerData.Quality())
            }
            promise.resolve(result)
        } else {
            promise.reject("CAPTURE_FAILED", "$errorMsg (code: $errorCode)")
        }
    }

    override fun OnPreview(fingerData: FingerData?) {
        if (fingerData != null) {
            val params = Arguments.createMap().apply {
                putInt("quality", fingerData.Quality())
            }
            sendEvent("onPreview", params)
        }
    }
}
