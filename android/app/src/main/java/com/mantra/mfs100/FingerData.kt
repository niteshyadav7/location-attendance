package com.mantra.mfs100

class FingerData {
    fun ISOTemplate(): ByteArray {
        // Return a mock template (512 bytes)
        return ByteArray(512) { i -> (i % 256).toByte() }
    }
    
    fun ANSITemplate(): ByteArray {
        return ByteArray(512) { i -> (i % 128).toByte() }
    }
    
    fun FingerImage(): ByteArray {
        // Return a small mock image byte array
        return ByteArray(100)
    }
    
    fun Quality(): Int {
        return 85
    }
}
