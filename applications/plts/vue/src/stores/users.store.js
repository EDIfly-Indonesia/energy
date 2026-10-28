// src/stores/users.store.js
import { defineStore } from "pinia";
import { ref } from "vue";
import usersApi from "../api/modules/users";
import Swal from "../composables/useSweetAlert";

export const useUsersStore = defineStore("users", () => {
  const users = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const pagination = ref({
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  async function fetchUsers(params = {}) {
    loading.value = true;
    try {
      const response = await usersApi.getUsers({
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...params,
      });

      users.value = response.data.data;
      total.value = response.data.meta?.pagination?.total || 0;
      pagination.value.totalPages =
        response.data.meta?.pagination?.totalPages || 0;

      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      Swal.toast.error("Gagal mengambil data users");
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(data) {
    try {
      const response = await usersApi.createUser(data);
      Swal.toast.success("User berhasil dibuat!");
      await fetchUsers();
      return response.data;
    } catch (error) {
      console.error("Error creating user:", error);
      Swal.toast.error(error.response?.data?.message || "Gagal membuat user");
      throw error;
    }
  }

  async function updateUser(id, data) {
    try {
      const response = await usersApi.updateUser(id, data);
      Swal.toast.success("User berhasil diperbarui!");
      await fetchUsers();
      return response.data;
    } catch (error) {
      console.error("Error updating user:", error);
      Swal.toast.error(error.response?.data?.message || "Gagal memperbarui user");
      throw error;
    }
  }

  async function deleteUser(id) {
    try {
      await usersApi.deleteUser(id);
      Swal.toast.success("User berhasil dihapus!");
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      Swal.toast.error(error.response?.data?.message || "Gagal menghapus user");
      throw error;
    }
  }

  function setPage(page) {
    pagination.value.page = page;
    fetchUsers();
  }

  function setLimit(limit) {
    pagination.value.limit = limit;
    pagination.value.page = 1;
    fetchUsers();
  }

  return {
    users,
    total,
    loading,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    setPage,
    setLimit,
  };
});
