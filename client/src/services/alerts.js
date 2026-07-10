import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const colors = { success: '#137f70', error: '#d64545', warning: '#d69e2e', info: '#3182ce' }

export const notify = ({ title, description, status = 'info', duration = 3200 }) => Swal.fire({
  toast: true,
  position: 'top-end',
  icon: status,
  title,
  text: description || undefined,
  showConfirmButton: false,
  timer: duration,
  timerProgressBar: true,
  customClass: { popup: 'rrhh-toast' },
})

// Mantiene la firma usada anteriormente por Chakra y centraliza todos los mensajes.
export const useToast = () => notify

export const confirmAction = async ({ title, text, confirmText = 'Confirmar', icon = 'question' }) => {
  const result = await Swal.fire({
    title, text, icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: colors.success,
    cancelButtonColor: '#718096',
    reverseButtons: true,
    focusCancel: true,
    customClass: { popup: 'rrhh-alert' },
  })
  return result.isConfirmed
}

export const requestReason = async ({ title, label = 'Motivo', confirmText = 'Continuar' }) => {
  const result = await Swal.fire({
    title,
    input: 'textarea',
    inputLabel: label,
    inputPlaceholder: 'Escribe el detalle aquí...',
    inputAttributes: { 'aria-label': label },
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: colors.success,
    inputValidator: (value) => !String(value || '').trim() ? 'Este dato es obligatorio' : undefined,
    customClass: { popup: 'rrhh-alert' },
  })
  return result.isConfirmed ? String(result.value).trim() : null
}
