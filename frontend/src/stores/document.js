import { defineStore } from 'pinia'
import { documentApi } from '@/api'

export const useDocumentStore = defineStore('document', {
  state: () => ({
    documents: [],
    loading: false,
    totalCount: 0
  }),
  actions: {
    async fetchList() {
      this.loading = true
      try {
        const res = await documentApi.list()
        if (res && res.data) {
          this.documents = res.data
          this.totalCount = res.data.length
        }
      } finally {
        this.loading = false
      }
    },
    async upload(encryptedBlob, encryptedName) {
      const file = new File([encryptedBlob], encryptedName || 'encrypted.enc')
      const res = await documentApi.upload(file, encryptedName)
      if (res && res.data) {
        await this.fetchList()
        return res.data.fileId
      }
      return null
    },
    async download(fileId) {
      const res = await documentApi.download(fileId)
      return res
    },
    async remove(fileId) {
      const res = await documentApi.delete(fileId)
      if (res) {
        await this.fetchList()
        return true
      }
      return false
    }
  }
})
