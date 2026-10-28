// src/composables/useSweetAlert.js
import Swal from 'sweetalert2';

/**
 * Wrapper untuk SweetAlert2 agar konsisten di seluruh aplikasi
 */

// Toast notification singkat (auto-close)
export const toast = {
  success: (message, title = 'Berhasil') => {
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

  error: (message, title = 'Gagal') => {
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

  warning: (message, title = 'Peringatan') => {
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

  info: (message, title = 'Info') => {
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

/**
 * Konfirmasi dialog - return Promise<boolean>
 * @param {string} message - Pesan konfirmasi
 * @param {string} title - Judul dialog
 * @param {string} confirmText - Teks tombol konfirmasi
 * @param {string} cancelText - Teks tombol batal
 * @returns {Promise<boolean>} true jika dikonfirmasi, false jika dibatalkan
 */
export const confirm = async (
  message,
  title = 'Konfirmasi',
  confirmText = 'Ya',
  cancelText = 'Batal'
) => {
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

/**
 * Dialog input sederhana
 */
export const prompt = async (message, title = 'Input', inputPlaceholder = '') => {
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

/**
 * Dialog sukses dengan aksi (misal: "Data tersimpan, mau lihat detail?")
 */
export const successWithAction = async (message, title = 'Berhasil', actionText = 'Lihat') => {
  const result = await Swal.fire({
    icon: 'success',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: actionText,
    cancelButtonText: 'Tutup',
    confirmButtonColor: '#16a34a',
    cancelButtonColor: '#6b7280',
    customClass: {
      popup: 'dark:bg-gray-800 dark:text-gray-100',
    },
  });
  return result.isConfirmed;
};

/**
 * Dialog error dengan opsi coba lagi
 */
export const errorWithRetry = async (message, title = 'Gagal', retryText = 'Coba Lagi') => {
  const result = await Swal.fire({
    icon: 'error',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: retryText,
    cancelButtonText: 'Tutup',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    customClass: {
      popup: 'dark:bg-gray-800 dark:text-gray-100',
    },
  });
  return result.isConfirmed;
};

export default {
  toast,
  confirm,
  prompt,
  successWithAction,
  errorWithRetry,
};