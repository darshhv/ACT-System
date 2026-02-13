import axios from 'axios'

const API = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1',
  timeout: 10000,
})

export const getDashboardSummary = () => API.get('/dashboard/summary')
export const getActiveCustody = () => API.get('/dashboard/active-custody')

export const getAssets = (params = {}) => API.get('/assets', { params })
export const getAssetByQR = (qr) => API.get(`/assets/qr/${qr}`)
export const getKits = () => API.get('/kits')

export const getWorkers = () => API.get('/workers')
export const getWorkerByQR = (qr) => API.get(`/workers/qr/${qr}`)

export const checkout = (data) => API.post('/custody/checkout', data)
export const returnItem = (data) => API.post('/custody/return', data)
export const scanEvent = (data) => API.post('/custody/scan', data)
export const getCustodyHistory = (params = {}) => API.get('/custody/history', { params })

export const getAlerts = (params = {}) => API.get('/alerts', { params })
export const acknowledgeAlert = (id, workerId) =>
  API.post(`/alerts/${id}/acknowledge`, { worker_id: workerId })
export const resolveAlert = (id, workerId, note) =>
  API.post(`/alerts/${id}/resolve`, { worker_id: workerId, resolution_note: note })

export const getCalibrationDue = (days = 30) => API.get('/calibration/due', { params: { days } })
export const updateCalibration = (assetId, data) =>
  API.post(`/assets/${assetId}/calibration`, data)

export const getCategories = () => API.get('/categories')
export const getAuditLog = (params = {}) => API.get('/audit', { params })

export default API
