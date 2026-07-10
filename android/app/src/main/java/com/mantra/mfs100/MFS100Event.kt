package com.mantra.mfs100

interface MFS100Event {
    fun OnDeviceAttached(vid: Int, pid: Int, hasPermission: Boolean)
    fun OnDeviceDetached()
    fun OnHostCheckFailed(msg: String?)
    fun OnCaptureCompleted(status: Boolean, errorCode: Int, errorMsg: String?, fingerData: FingerData?)
    fun OnPreview(fingerData: FingerData?)
}
