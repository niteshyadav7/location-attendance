package com.mantra.mfs100

import android.os.Handler
import android.os.Looper

class MFS100(private val listener: MFS100Event) {
    
    fun Init(): Int {
        // Simulate successful initialization (return 0) and trigger device attached callback
        Handler(Looper.getMainLooper()).postDelayed({
            listener.OnDeviceAttached(11579, 4101, true)
        }, 1000)
        return 0
    }
    
    fun UnInit(): Int {
        return 0
    }
    
    fun StartCapture(quality: Int, timeout: Int, showPreview: Boolean): Int {
        // Simulate a successful scan after 2 seconds
        Handler(Looper.getMainLooper()).postDelayed({
            listener.OnCaptureCompleted(true, 0, "Success", FingerData())
        }, 2000)
        return 0
    }
    
    fun StopCapture(): Int {
        return 0
    }
    
    fun MatchISO(template1: ByteArray, template2: ByteArray): Int {
        // Always return a high matching score (e.g. 18000) to simulate a match for mock testing
        return 18000
    }
    
    fun MatchANSI(template1: ByteArray, template2: ByteArray): Int {
        return 18000
    }
    
    fun GetErrorMsg(errorCode: Int): String {
        return "Mock Success"
    }
}
