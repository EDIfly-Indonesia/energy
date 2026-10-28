// src/hooks/useSweetAlert.ts
import Swal from 'sweetalert2';

export const toast = {
  success: (message: string, title = 'Berhasil') => {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      background: '#ffffff',
      color: '#166534',
      customClass: {
        popup: 'dark:bg-gray-800 dark:text-green-300',
      },
    });
  },

  error: (message: string, title = 'Gagal') => {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      background: '#ffffff',
      color: '#991b1b',
      customClass: {
        popup: 'dark:bg-gray-800 dark:text-red-300',
      },
    });
  },

  warning: (message: string, title = 'Peringatan') => {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      background: '#ffffff',
      color: '#92400e',
      customClass: {
        popup: 'dark:bg-gray-800 dark:text-yellow-300',
      },
    });
  },

  info: (message: string, title = 'Info') => {
    return Swal.fire({
      icon: 'info',
      title,
      text: message,
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      background: '#ffffff',
      color: '#1e40af',
      customClass: {
        popup: 'dark:bg-gray-800 dark:text-blue-300',
      },
    });
  },
};

export const confirm = async (
  message: string,
  title = 'Konfirmasi',
  confirmText = 'Ya',
  cancelText = 'Batal'
): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'dark:bg-gray-800 dark:text-gray-100',
      confirmButton: 'dark:bg-red-600 dark:hover:bg-red-700',
      cancelButton: 'dark:bg-gray-600 dark:hover:bg-gray-700',
    },
  });
  return result.isConfirmed;
};

export const prompt = async (message: string, title = 'Input', inputPlaceholder = ''): Promise<string | null> => {
  const result = await Swal.fire({
    title,
    text: message,
    input: 'text',
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonText: 'OK',
    cancelButtonText: 'Batal',
    customClass: {
      popup: 'dark:bg-gray-800 dark:text-gray-100',
    },
  });
  return result.value || null;
};

export default { toast, confirm, prompt };