import React, { useEffect, useId, useRef, useState } from 'react'
import { Alert, AlertIcon, Box, Spinner, Text } from '@chakra-ui/react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const safeCall = async (work) => {
  try {
    const result = work?.()
    if (result && typeof result.then === 'function') await result
  } catch {
    /* El lector puede estar detenido o limpiado por el navegador. */
  }
}

export default function QrCameraScanner({ active, onScan }) {
  const id = `qr-reader-${useId().replace(/:/g, '')}`
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    if (!active) return undefined
    let mounted = true
    let delivered = false
    const reader = new Html5Qrcode(id)
    setStarting(true)
    setError('')

    Promise.resolve(reader.start(
      { facingMode: 'environment' },
      {
        fps: 12,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
          width: Math.floor(Math.min(viewfinderWidth * 0.92, 520)),
          height: Math.floor(Math.min(viewfinderHeight * 0.38, 180)),
        }),
        aspectRatio: 1.777778,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.ITF,
        ],
      },
      async (decodedText) => {
        if (delivered || !mounted) return
        delivered = true
        await safeCall(() => reader.stop())
        if (mounted) onScanRef.current(decodedText)
      },
      () => {},
    )).catch((cameraError) => {
      if (mounted) setError(cameraError?.message || 'No se pudo acceder a la cámara.')
    }).finally(() => { if (mounted) setStarting(false) })

    return () => {
      mounted = false
      if (reader.isScanning) {
        safeCall(() => reader.stop()).finally(() => safeCall(() => reader.clear()))
      } else {
        safeCall(() => reader.clear())
      }
    }
  }, [active, id])

  return <Box>
    {starting && <Box textAlign="center" py={4}><Spinner color="teal.500" /><Text mt={2}>Iniciando cámara...</Text></Box>}
    {error && <Alert status="error" borderRadius="lg"><AlertIcon />{error} Revisa los permisos del navegador.</Alert>}
    <Box id={id} overflow="hidden" borderRadius="xl" sx={{ video: { borderRadius: '12px' } }} />
  </Box>
}
