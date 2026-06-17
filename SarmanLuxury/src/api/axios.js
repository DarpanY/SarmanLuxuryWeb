import axios from "axios"
import toast from "react-hot-toast"

const API = axios.create({
  baseURL: "https://sarmanluxury-api.onrender.com/api"
})

// Auto-logout on expired/invalid token
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem("token")

      localStorage.removeItem("user")
      localStorage.removeItem("token")

      // Only redirect if the user actually had a session that expired —
      // otherwise this fires for guests on every protected endpoint and
      // bounces them to /login with no explanation.
      if (hadToken && window.location.pathname !== "/login") {
        toast.error("Your session has expired. Please log in again.")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default API