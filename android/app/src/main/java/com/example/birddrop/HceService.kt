package com.example.birddrop

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.util.Log
import java.util.Arrays

class HceService : HostApduService() {

        companion object {
            var dataToSend: ByteArray? = null
                set(value) {
                    field = value
                    Log.i("HceService", "Staged data set: " + (value?.toString(Charsets.UTF_8) ?: "null"))
                }

            lateinit var appContext: android.content.Context

            val AID = byteArrayOf(0xF0.toByte(), 0x01, 0x02, 0x03, 0x04, 0x05, 0x06)
            val SELECT_APDU = byteArrayOf(0x00, 0xA4.toByte(), 0x04, 0x00, AID.size.toByte()) + AID + byteArrayOf(0x00)
            val SW_OK = byteArrayOf(0x90.toByte(), 0x00.toByte())
            val SW_DATA_NOT_FOUND = byteArrayOf(0x6A.toByte(), 0x82.toByte())
        }

    override fun onCreate() {
        super.onCreate()
        Log.i("HceService", "HceService onCreate() called.")
        appContext = applicationContext
    }

    // Removed duplicate companion object. Only one companion object should exist.

    override fun onDeactivated(reason: Int) {
        Log.d("HceService", "Deactivated: $reason")
    }

    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        Log.i("HceService", "processCommandApdu called!")
        android.widget.Toast.makeText(this, "HceService: APDU received", android.widget.Toast.LENGTH_SHORT).show()
        if (commandApdu == null) {
            Log.w("HceService", "Received null APDU")
            return SW_DATA_NOT_FOUND
        }
        Log.i("HceService", "Received APDU: " + commandApdu.joinToString(" ") { String.format("%02X", it) })
        if (Arrays.equals(commandApdu, SELECT_APDU)) {
            val stagedData = dataToSend
            Log.i("HceService", "SELECT_APDU matched. Staged data: " + (stagedData?.toString(Charsets.UTF_8) ?: "null"))
            if (stagedData != null) {
                Log.i("HceService", "Responding with staged data.")
                android.widget.Toast.makeText(this, "NFC: Sending session code!", android.widget.Toast.LENGTH_LONG).show()
                dataToSend = null // Consume the data
                return stagedData + SW_OK
            } else {
                Log.w("HceService", "No staged data to send.")
                android.widget.Toast.makeText(this, "NFC: No session code staged!", android.widget.Toast.LENGTH_LONG).show()
            }
        } else {
            Log.w("HceService", "APDU did not match SELECT_APDU. Received: " + commandApdu.joinToString(" ") { String.format("%02X", it) })
            Log.w("HceService", "Expected: " + SELECT_APDU.joinToString(" ") { String.format("%02X", it) })
            android.widget.Toast.makeText(this, "NFC: APDU did not match SELECT_APDU!", android.widget.Toast.LENGTH_LONG).show()
        }
        return SW_DATA_NOT_FOUND
    }
}
