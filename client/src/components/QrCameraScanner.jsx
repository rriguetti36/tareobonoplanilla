import React, { useEffect, useId, useRef, useState } from 'react'
import { Alert, AlertIcon, Box, Spinner, Text } from '@chakra-ui/react'
import { Html5Qrcode } from 'html5-qrcode'

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

    reader.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
      async (decodedText) => {
        if (delivered || !mounted) return
        delivered = true
        try { await reader.stop() } catch { /* La cámara puede haberse detenido. */ }
        if (mounted) onScanRef.current(decodedText)
      },
      () => {},
    ).catch((cameraError) => {
      if (mounted) setError(cameraError?.message || 'No se pudo acceder a la cámara.')
    }).finally(() => { if (mounted) setStarting(false) })

    return () => {
      mounted = false
      if (reader.isScanning) reader.stop().catch(() => {}).finally(() => reader.clear().catch(() => {}))
      else reader.clear().catch(() => {})
    }
  }, [active, id])

  return <Box>
    {starting && <Box textAlign="center" py={4}><Spinner color="teal.500" /><Text mt={2}>Iniciando cámara...</Text></Box>}
    {error && <Alert status="error" borderRadius="lg"><AlertIcon />{error} Revisa los permisos del navegador.</Alert>}
    <Box id={id} overflow="hidden" borderRadius="xl" sx={{ video: { borderRadius: '12px' } }} />
  </Box>
}
