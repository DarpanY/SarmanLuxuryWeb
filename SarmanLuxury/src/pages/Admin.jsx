import "./styles/Admin.css"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/axios"
import { useAuth } from "../context/AuthContext"
import toast from "react-hot-toast"

/* ─── ROLE CONSTANTS ─── */

const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN:      "admin",
  STAFF:      "staff",
  USER:       "user"
}

function canDo(role, action) {
  const perms = {
    viewDashboard:    [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    viewOrders:       [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    updateOrderStatus:[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    viewUsers:        [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    changeUserRole:   [ROLES.SUPERADMIN, ROLES.ADMIN],
    deleteUser:       [ROLES.SUPERADMIN, ROLES.ADMIN],
    viewMessages:     [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    deleteMessage:    [ROLES.SUPERADMIN, ROLES.ADMIN],
    viewAbandoned:    [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF],
    addProduct:       [ROLES.SUPERADMIN],
    editProduct:      [ROLES.SUPERADMIN, ROLES.ADMIN],
    deleteProduct:    [ROLES.SUPERADMIN],
    manageCoupons:    [ROLES.SUPERADMIN],
  }
  return perms[action]?.includes(role) ?? false
}


/* ══════════════════════════════
   PURE CSS CHART COMPONENTS
   (no external dependencies)
══════════════════════════════ */

function CssBarChart({ data=[], valueKey, labelKey, color="#c8a45d", formatValue, formatLabel }) {
  if (!data.length) return <p className="no-data" style={{padding:"20px 0"}}>No data yet.</p>
  const max = Math.max(...data.map(d => d[valueKey] || 0)) || 1
  return (
    <div className="css-bar-chart">
      <div className="css-bars">
        {data.map((d, i) => {
          const pct = ((d[valueKey] || 0) / max) * 100
          return (
            <div className="css-bar-col" key={i}>
              <div className="css-bar-tooltip">
                {formatValue ? formatValue(d[valueKey]) : d[valueKey]}
              </div>
              <div className="css-bar-track">
                <div
                  className="css-bar-fill"
                  style={{ height: pct+"%", background: color }}
                />
              </div>
              <span className="css-bar-label">
                {formatLabel ? formatLabel(d[labelKey]) : d[labelKey]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CssHBarChart({ data=[], valueKey, labelKey, color="#c8a45d", formatValue }) {
  if (!data.length) return <p className="no-data" style={{padding:"20px 0"}}>No data yet.</p>
  const max = Math.max(...data.map(d => d[valueKey] || 0)) || 1
  return (
    <div className="css-hbar-chart">
      {data.map((d, i) => {
        const pct = ((d[valueKey] || 0) / max) * 100
        return (
          <div className="css-hbar-row" key={i}>
            <span className="css-hbar-label">{d[labelKey]}</span>
            <div className="css-hbar-track">
              <div
                className="css-hbar-fill"
                style={{ width: pct+"%", background: color }}
              />
            </div>
            <span className="css-hbar-value">
              {formatValue ? formatValue(d[valueKey]) : d[valueKey]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CssDonutList({ data=[], valueKey, labelKey, colors=[], formatValue }) {
  if (!data.length) return <p className="no-data" style={{padding:"20px 0"}}>No data yet.</p>
  const total = data.reduce((a, d) => a + (d[valueKey] || 0), 0) || 1
  return (
    <div className="css-donut-list">
      {data.map((d, i) => {
        const pct = Math.round(((d[valueKey] || 0) / total) * 100)
        const clr = colors[i % colors.length]
        return (
          <div className="css-donut-row" key={i}>
            <span className="css-donut-dot" style={{ background: clr }} />
            <span className="css-donut-label">{d[labelKey]}</span>
            <div className="css-donut-bar-track">
              <div
                className="css-donut-bar-fill"
                style={{ width: pct+"%", background: clr }}
              />
            </div>
            <span className="css-donut-pct">{pct}%</span>
            <span className="css-donut-val">
              {formatValue ? formatValue(d[valueKey]) : d[valueKey]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Admin() {

  const { token, user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState("dashboard")
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [messages, setMessages] = useState([])
  const [abandoned, setAbandoned] = useState([])
  const [openMessage, setOpenMessage] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  /* ── COUPON STATE ── */
  const [coupons,       setCoupons]       = useState([])
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponForm,    setCouponForm]    = useState({
    code:"", discountType:"percentage", discountValue:"",
    minOrderAmount:"", maxDiscount:"", usageLimit:"", expiresAt:""
  })
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [couponFormOpen, setCouponFormOpen] = useState(false)

  const role = user?.role

  const H = {
    headers:{ Authorization:`Bearer ${token}` }
  }

  /* ── FETCH ANALYTICS ── */

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const { data } = await API.get("/admin/analytics", H)
      setAnalytics(data)
    } catch {
      toast.error("Failed to load analytics")
    } finally {
      setAnalyticsLoading(false)
    }
  }

  /* ── FETCH COUPONS ── */

  const fetchCoupons = async () => {
    try {
      setCouponLoading(true)
      const { data } = await API.get("/coupons", H)
      setCoupons(data)
    } catch {
      toast.error("Failed to load coupons")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleCouponSubmit = async () => {

    if (!couponForm.code || !couponForm.discountValue) {
      toast.error("Code and Discount Value are required")
      return
    }

    try {

      const payload = {
        ...couponForm,
        discountValue:  Number(couponForm.discountValue),
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        maxDiscount:    couponForm.maxDiscount    ? Number(couponForm.maxDiscount)    : null,
        usageLimit:     couponForm.usageLimit     ? Number(couponForm.usageLimit)     : null,
        expiresAt:      couponForm.expiresAt      || null,
      }

      if (editingCoupon) {
        await API.put(`/coupons/${editingCoupon._id}`, payload, H)
        toast.success("Coupon updated")
      } else {
        await API.post("/coupons", payload, H)
        toast.success("Coupon created")
      }

      setCouponForm({ code:"", discountType:"percentage", discountValue:"", minOrderAmount:"", maxDiscount:"", usageLimit:"", expiresAt:"" })
      setEditingCoupon(null)
      setCouponFormOpen(false)
      fetchCoupons()

    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save coupon")
    }

  }

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Delete this coupon?")) return
    try {
      await API.delete(`/coupons/${id}`, H)
      toast.success("Coupon deleted")
      fetchCoupons()
    } catch {
      toast.error("Failed to delete coupon")
    }
  }

  const handleToggleCoupon = async (coupon) => {
    try {
      await API.put(`/coupons/${coupon._id}`, { isActive: !coupon.isActive }, H)
      toast.success(coupon.isActive ? "Coupon deactivated" : "Coupon activated")
      fetchCoupons()
    } catch {
      toast.error("Failed to update coupon")
    }
  }

  const startEditCoupon = (coupon) => {
    setEditingCoupon(coupon)
    setCouponForm({
      code:           coupon.code,
      discountType:   coupon.discountType,
      discountValue:  coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || "",
      maxDiscount:    coupon.maxDiscount    || "",
      usageLimit:     coupon.usageLimit     || "",
      expiresAt:      coupon.expiresAt ? coupon.expiresAt.slice(0,10) : ""
    })
    setCouponFormOpen(true)
  }

  /* ── FETCH ── */

  const fetchDashboard = async () => {
    try {
      const { data } = await API.get("/admin/dashboard", H)
      setStats(data)
    } catch {
      toast.error("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await API.get("/admin/users", H)
      setUsers(data)
    } catch { toast.error("Failed to load users") }
  }

  const fetchOrders = async () => {
    try {
      const { data } = await API.get("/admin/orders", H)
      setOrders(data)
    } catch { toast.error("Failed to load orders") }
  }

  const fetchMessages = async () => {
    try {
      const { data } = await API.get("/admin/messages", H)
      setMessages(data)
    } catch { toast.error("Failed to load messages") }
  }

  const fetchAbandoned = async () => {
    try {
      const { data } = await API.get("/admin/abandoned-carts", H)
      setAbandoned(data)
    } catch { toast.error("Failed to load abandoned carts") }
  }

  useEffect(() => { fetchDashboard() }, [])

  useEffect(() => {
    if (activeTab === "users")     fetchUsers()
    if (activeTab === "orders")    fetchOrders()
    if (activeTab === "messages")  fetchMessages()
    if (activeTab === "abandoned") fetchAbandoned()
    if (activeTab === "analytics") fetchAnalytics()
    if (activeTab === "coupons")   fetchCoupons()
  }, [activeTab])

  /* ── ACTIONS ── */

  const updateStatus = async (orderId, status) => {
    try {
      await API.put(`/admin/orders/${orderId}/status`, { orderStatus:status }, H)
      toast.success("Status updated")
      fetchOrders()
    } catch { toast.error("Failed to update status") }
  }

  const updateRole = async (userId, role) => {
    try {
      await API.put(`/admin/users/${userId}/role`, { role }, H)
      toast.success("Role updated")
      fetchUsers()
    } catch { toast.error("Failed to update role") }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return
    try {
      await API.delete(`/admin/users/${userId}`, H)
      toast.success("User deleted")
      fetchUsers()
    } catch { toast.error("Failed to delete user") }
  }

  const markRead = async (msg) => {
    if (!msg.isRead) {
      try {
        await API.put(`/admin/messages/${msg._id}/read`, {}, H)
        fetchMessages()
        fetchDashboard()
      } catch {}
    }
    setOpenMessage(msg)
  }

  const deleteMessage = async (id) => {
    if (!window.confirm("Delete this message?")) return
    try {
      await API.delete(`/admin/messages/${id}`, H)
      toast.success("Message deleted")
      if (openMessage?._id === id) setOpenMessage(null)
      fetchMessages()
    } catch { toast.error("Failed to delete message") }
  }

  /* ── TABS CONFIG (role-gated) ── */

  const allTabs = [
    { id:"dashboard", label:"DASHBOARD",       roles:[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { id:"products",  label:"PRODUCTS",         roles:[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { id:"orders",    label:"ORDERS",           roles:[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { id:"abandoned", label:"ABANDONED CARTS",  roles:[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { id:"messages",  label:"MESSAGES",         roles:[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { id:"users",     label:"USERS",            roles:[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { id:"coupons",   label:"COUPONS",          roles:[ROLES.SUPERADMIN] },
    { id:"analytics", label:"ANALYTICS",        roles:[ROLES.SUPERADMIN] },
  ]

  const visibleTabs =
    allTabs.filter((t) => t.roles.includes(role))

  /* ── UNREAD COUNT ── */

  const unread =
    messages.filter((m) => !m.isRead).length ||
    stats?.unreadMessages || 0

  return (
    <section className="admin-page">

      {/* SIDEBAR */}

      <div className="admin-sidebar">

        <h2>SARMAN ADMIN</h2>

        <ul>
          {visibleTabs.map((tab) => (
            <li
              key={tab.id}
              className={activeTab === tab.id ? "active-tab" : ""}
              onClick={() => {
                if (tab.id === "products") {
                  navigate("/admin-products")
                } else {
                  setActiveTab(tab.id)
                }
              }}
            >
              {tab.label}
              {tab.id === "messages" && unread > 0 && (
                <span className="unread-dot">{unread}</span>
              )}
              {tab.id === "abandoned" && stats?.abandonedCarts > 0 && (
                <span className="unread-dot">{stats.abandonedCarts}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="admin-user-info">
          <p className="admin-role-badge">{role?.toUpperCase()}</p>
          <p className="admin-username">{user?.name}</p>
        </div>

      </div>

      {/* CONTENT */}

      <div className="admin-content">

        {/* ════ DASHBOARD ════ */}

        {activeTab === "dashboard" && (
          <>
            <div className="admin-title">
              <span>SARMAN LUXURY</span>
              <h1>DASHBOARD</h1>
            </div>

            {loading ? (
              <div className="admin-spinner">Loading...</div>
            ) : (
              <>
                <div className="admin-stats">

                  <div className="admin-card">
                    <h3>TOTAL USERS</h3>
                    <h2>{stats?.totalUsers || 0}</h2>
                  </div>

                  <div className="admin-card">
                    <h3>TOTAL PRODUCTS</h3>
                    <h2>{stats?.totalProducts || 0}</h2>
                  </div>

                  <div className="admin-card">
                    <h3>TOTAL ORDERS</h3>
                    <h2>{stats?.totalOrders || 0}</h2>
                  </div>

                  <div className="admin-card">
                    <h3>TOTAL REVENUE</h3>
                    <h2>₹{stats?.totalRevenue?.toLocaleString() || 0}</h2>
                  </div>

                  <div className="admin-card admin-card-alert">
                    <h3>UNREAD MESSAGES</h3>
                    <h2>{stats?.unreadMessages || 0}</h2>
                  </div>

                  <div className="admin-card admin-card-warn">
                    <h3>ABANDONED CARTS</h3>
                    <h2>{stats?.abandonedCarts || 0}</h2>
                  </div>

                </div>

                <div className="recent-orders">
                  <h2>RECENT ORDERS</h2>

                  {!stats?.recentOrders?.length ? (
                    <p className="no-data">No orders yet.</p>
                  ) : (
                    <>
                      <div className="orders-table-header">
                        <span>CUSTOMER</span>
                        <span>AMOUNT</span>
                        <span>STATUS</span>
                        <span>DATE</span>
                      </div>
                      <div className="orders-table">
                        {stats.recentOrders.map((order) => (
                          <div className="order-row" key={order._id}>
                            <div>{order.user?.name || "—"}</div>
                            <div>₹{order.totalPrice?.toLocaleString()}</div>
                            <div>
                              <span className={`status-badge status-${order.orderStatus?.toLowerCase()}`}>
                                {order.orderStatus}
                              </span>
                            </div>
                            <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ════ ORDERS ════ */}

        {activeTab === "orders" && (
          <>
            <div className="admin-title">
              <span>SARMAN LUXURY</span>
              <h1>ALL ORDERS</h1>
            </div>

            {!orders.length ? (
              <p className="no-data">No orders found.</p>
            ) : (
              <div className="admin-orders-list">
                {orders.map((order) => (
                  <div className="admin-order-card" key={order._id}>

                    <div className="admin-order-header">
                      <div>
                        <p className="order-customer">{order.user?.name || "—"}</p>
                        <p className="order-email">{order.user?.email || "—"}</p>
                        {order.shippingAddress?.phone && (
                          <p className="order-email">📞 {order.shippingAddress.phone}</p>
                        )}
                        <p className="order-date">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="order-meta">
                        <p className="order-total">₹{order.totalPrice?.toLocaleString()}</p>
                        <p className="order-payment">{order.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="admin-order-items">
                      {order.orderItems?.map((item, i) => (
                        <div className="admin-order-item" key={i}>
                          <img src={item.product?.images?.[0] || ""} alt={item.product?.name} />
                          <span>{item.product?.name}</span>
                          <span>× {item.quantity}</span>
                          <span>₹{item.product?.price?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="admin-order-footer">
                      <span className={`status-badge status-${order.orderStatus?.toLowerCase()}`}>
                        {order.orderStatus}
                      </span>

                      {canDo(role, "updateOrderStatus") && (
                        <select
                          className="status-select"
                          value={order.orderStatus}
                          onChange={(e) => updateStatus(order._id, e.target.value)}
                        >
                          {["Processing","Shipped","Delivered","Cancelled"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════ ABANDONED CARTS ════ */}

        {activeTab === "abandoned" && (
          <>
            <div className="admin-title">
              <span>SARMAN LUXURY</span>
              <h1>ABANDONED CARTS</h1>
            </div>

            <p className="section-desc">
              Customers who have items in their cart but haven't placed an order in the last 24 hours.
            </p>

            {!abandoned.length ? (
              <p className="no-data">No abandoned carts found. 🎉</p>
            ) : (
              <div className="abandoned-list">
                {abandoned.map((cart) => (
                  <div className="abandoned-card" key={cart._id}>

                    <div className="abandoned-header">
                      <div>
                        <p className="abandoned-name">{cart.user?.name || "Unknown"}</p>
                        <p className="abandoned-email">{cart.user?.email || "—"}</p>
                      </div>
                      <div className="abandoned-meta">
                        <p className="abandoned-count">
                          {cart.items?.length} item{cart.items?.length !== 1 ? "s" : ""}
                        </p>
                        <p className="abandoned-total">
                          ₹{cart.items?.reduce(
                            (acc, item) =>
                              acc + (item.product?.price || 0) * item.quantity,
                            0
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="abandoned-items">
                      {cart.items?.map((item, i) => (
                        <div className="abandoned-item" key={i}>
                          <img
                            src={item.product?.images?.[0] || ""}
                            alt={item.product?.name}
                          />
                          <div>
                            <p>{item.product?.name}</p>
                            <p className="abandoned-item-price">
                              ₹{item.product?.price?.toLocaleString()} × {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════ CONTACT MESSAGES ════ */}

        {activeTab === "messages" && (
          <>
            <div className="admin-title">
              <span>SARMAN LUXURY</span>
              <h1>CONTACT MESSAGES</h1>
            </div>

            {!messages.length ? (
              <p className="no-data">No messages yet.</p>
            ) : (
              <div className="messages-layout">

                {/* LIST */}

                <div className="messages-list">
                  {messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`message-row ${openMessage?._id === msg._id ? "active" : ""} ${!msg.isRead ? "unread" : ""}`}
                      onClick={() => markRead(msg)}
                    >
                      <div className="message-row-top">
                        <span className="msg-name">{msg.name}</span>
                        <span className="msg-date">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="msg-subject">{msg.subject}</p>
                      <p className="msg-preview">
                        {msg.message.slice(0, 60)}...
                      </p>
                      {!msg.isRead && <span className="unread-indicator" />}
                    </div>
                  ))}
                </div>

                {/* DETAIL */}

                <div className="message-detail">
                  {!openMessage ? (
                    <div className="message-empty">
                      <p>Select a message to read</p>
                    </div>
                  ) : (
                    <>
                      <div className="message-detail-header">
                        <div>
                          <h3>{openMessage.subject}</h3>
                          <p className="msg-from">
                            {openMessage.name} &lt;{openMessage.email}&gt;
                          </p>
                          <p className="msg-time">
                            {new Date(openMessage.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {canDo(role, "deleteMessage") && (
                          <button
                            className="delete-msg-btn"
                            onClick={() => deleteMessage(openMessage._id)}
                          >
                            DELETE
                          </button>
                        )}
                      </div>

                      <div className="message-body">
                        {openMessage.message}
                      </div>

                      <a
                        className="reply-link"
                        href={`mailto:${openMessage.email}?subject=Re: ${openMessage.subject}`}
                      >
                        REPLY VIA EMAIL →
                      </a>
                    </>
                  )}
                </div>

              </div>
            )}
          </>
        )}

        {/* ════ USERS ════ */}

        {activeTab === "users" && (
          <>
            <div className="admin-title">
              <span>SARMAN LUXURY</span>
              <h1>MANAGE USERS</h1>
            </div>

            {!users.length ? (
              <p className="no-data">No users found.</p>
            ) : (
              <div className="admin-users-list">
                {users.filter((u) => u.role !== "superadmin").map((u) => (
                  <div className="admin-user-row" key={u._id}>

                    <div className="user-info">
                      <p className="user-name">{u.name}</p>
                      <p className="user-email">{u.email}</p>
                      <p className="user-date">
                        Joined {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="user-actions">

                      {canDo(role, "changeUserRole") ? (
                        <select
                          className="role-select"
                          value={u.role}
                          onChange={(e) => updateRole(u._id, e.target.value)}
                          disabled={u.role === ROLES.SUPERADMIN}
                        >
                          {["user","staff","admin","superadmin"].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="role-badge-static">{u.role}</span>
                      )}

                      {canDo(role, "deleteUser") && (
                        <button
                          className="delete-user-btn"
                          onClick={() => deleteUser(u._id)}
                          disabled={u.role === ROLES.SUPERADMIN}
                        >
                          DELETE
                        </button>
                      )}

                    </div>

                  </div>
                ))}
              </div>
            )}
          </>
        )}


        {/* ════ ANALYTICS ════ */}

        {activeTab === "coupons" && canDo(role,"manageCoupons") && (
          <>
            <div className="admin-title">
              <span>SARMAN LUXURY</span>
              <h1>COUPONS</h1>
            </div>

            {/* CREATE BUTTON */}
            <div className="coupon-admin-topbar">
              <button
                className="coupon-admin-new-btn"
                onClick={() => {
                  setEditingCoupon(null)
                  setCouponForm({ code:"", discountType:"percentage", discountValue:"", minOrderAmount:"", maxDiscount:"", usageLimit:"", expiresAt:"" })
                  setCouponFormOpen(true)
                }}
              >
                + NEW COUPON
              </button>
            </div>

            {/* FORM MODAL */}
            {couponFormOpen && (
              <div className="coupon-modal-overlay" onClick={(e) => { if (e.target.classList.contains("coupon-modal-overlay")) setCouponFormOpen(false) }}>
                <div className="coupon-modal">

                  <h2 className="coupon-modal-title">
                    {editingCoupon ? "EDIT COUPON" : "NEW COUPON"}
                  </h2>

                  <div className="coupon-modal-grid">

                    <div className="coupon-field coupon-field-full">
                      <label>COUPON CODE *</label>
                      <input
                        type="text"
                        placeholder="e.g. SARMAN20"
                        value={couponForm.code}
                        onChange={(e) => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                      />
                    </div>

                    <div className="coupon-field">
                      <label>DISCOUNT TYPE *</label>
                      <select
                        value={couponForm.discountType}
                        onChange={(e) => setCouponForm({...couponForm, discountType: e.target.value})}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat (₹)</option>
                      </select>
                    </div>

                    <div className="coupon-field">
                      <label>
                        DISCOUNT VALUE *
                        {couponForm.discountType === "percentage" ? " (%)" : " (₹)"}
                      </label>
                      <input
                        type="number"
                        placeholder={couponForm.discountType === "percentage" ? "e.g. 20" : "e.g. 200"}
                        value={couponForm.discountValue}
                        onChange={(e) => setCouponForm({...couponForm, discountValue: e.target.value})}
                      />
                    </div>

                    <div className="coupon-field">
                      <label>MIN ORDER AMOUNT (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1000"
                        value={couponForm.minOrderAmount}
                        onChange={(e) => setCouponForm({...couponForm, minOrderAmount: e.target.value})}
                      />
                    </div>

                    {couponForm.discountType === "percentage" && (
                      <div className="coupon-field">
                        <label>MAX DISCOUNT CAP (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={couponForm.maxDiscount}
                          onChange={(e) => setCouponForm({...couponForm, maxDiscount: e.target.value})}
                        />
                      </div>
                    )}

                    <div className="coupon-field">
                      <label>USAGE LIMIT</label>
                      <input
                        type="number"
                        placeholder="Leave blank = unlimited"
                        value={couponForm.usageLimit}
                        onChange={(e) => setCouponForm({...couponForm, usageLimit: e.target.value})}
                      />
                    </div>

                    <div className="coupon-field">
                      <label>EXPIRY DATE</label>
                      <input
                        type="date"
                        value={couponForm.expiresAt}
                        onChange={(e) => setCouponForm({...couponForm, expiresAt: e.target.value})}
                      />
                    </div>

                  </div>

                  <div className="coupon-modal-actions">
                    <button className="coupon-save-btn" onClick={handleCouponSubmit}>
                      {editingCoupon ? "UPDATE COUPON" : "CREATE COUPON"}
                    </button>
                    <button className="coupon-cancel-btn" onClick={() => setCouponFormOpen(false)}>
                      CANCEL
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* COUPONS TABLE */}
            {couponLoading ? (
              <div className="admin-spinner">Loading coupons...</div>
            ) : coupons.length === 0 ? (
              <p className="no-data">No coupons yet. Create one above.</p>
            ) : (
              <div className="coupon-table-wrap">
                <table className="coupon-table">
                  <thead>
                    <tr>
                      <th>CODE</th>
                      <th>TYPE</th>
                      <th>VALUE</th>
                      <th>MIN ORDER</th>
                      <th>MAX CAP</th>
                      <th>USED / LIMIT</th>
                      <th>EXPIRES</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => {

                      const isExpired = c.expiresAt && new Date() > new Date(c.expiresAt)
                      const usedOut   = c.usageLimit && c.usedCount >= c.usageLimit

                      return (
                        <tr key={c._id}>

                          <td>
                            <span className="coupon-code-cell">{c.code}</span>
                          </td>

                          <td>
                            <span className={`coupon-type-badge coupon-type-${c.discountType}`}>
                              {c.discountType === "percentage" ? "%" : "₹"} FLAT
                            </span>
                          </td>

                          <td className="coupon-value-cell">
                            {c.discountType === "percentage"
                              ? `${c.discountValue}%`
                              : `₹${c.discountValue}`
                            }
                          </td>

                          <td>{c.minOrderAmount ? `₹${c.minOrderAmount}` : "—"}</td>

                          <td>{c.maxDiscount ? `₹${c.maxDiscount}` : "—"}</td>

                          <td>
                            <div className="coupon-usage-bar">
                              <span>{c.usedCount} / {c.usageLimit ?? "∞"}</span>
                              {c.usageLimit && (
                                <div className="coupon-usage-track">
                                  <div
                                    className="coupon-usage-fill"
                                    style={{ width: Math.min(100, (c.usedCount / c.usageLimit) * 100) + "%" }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>

                          <td>
                            {c.expiresAt
                              ? <span style={{ color: isExpired ? "#f87171" : "#aaa" }}>
                                  {new Date(c.expiresAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                                  {isExpired && " (Expired)"}
                                </span>
                              : <span style={{color:"#555"}}>No expiry</span>
                            }
                          </td>

                          <td>
                            <button
                              className={`coupon-status-toggle ${c.isActive && !isExpired && !usedOut ? "active" : "inactive"}`}
                              onClick={() => handleToggleCoupon(c)}
                              title="Toggle active/inactive"
                            >
                              {c.isActive && !isExpired && !usedOut ? "ACTIVE" : "INACTIVE"}
                            </button>
                          </td>

                          <td>
                            <div className="coupon-action-btns">
                              <button className="coupon-edit-btn"   onClick={() => startEditCoupon(c)}>EDIT</button>
                              <button className="coupon-delete-btn" onClick={() => handleDeleteCoupon(c._id)}>DELETE</button>
                            </div>
                          </td>

                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === "analytics" && (
          <>
            <div className="admin-title">
              <span>SARMAN LUXURY</span>
              <h1>ANALYTICS</h1>
            </div>

            {analyticsLoading || !analytics ? (
              <div className="admin-spinner">Loading analytics...</div>
            ) : (
              <div className="analytics-wrap">

                {/* ── KPI CARDS ── */}

                <div className="analytics-kpis">

                  <div className="kpi-card">
                    <p>TOTAL REVENUE</p>
                    <h2>₹{analytics.revenue.total?.toLocaleString()}</h2>
                    <span>All time</span>
                  </div>

                  <div className="kpi-card">
                    <p>TODAY</p>
                    <h2>₹{analytics.revenue.today?.toLocaleString()}</h2>
                    <span>Revenue today</span>
                  </div>

                  <div className="kpi-card">
                    <p>LAST 7 DAYS</p>
                    <h2>₹{analytics.revenue.last7?.toLocaleString()}</h2>
                    <span>Revenue</span>
                  </div>

                  <div className="kpi-card">
                    <p>LAST 30 DAYS</p>
                    <h2>₹{analytics.revenue.last30?.toLocaleString()}</h2>
                    <span>Revenue</span>
                  </div>

                  <div className="kpi-card">
                    <p>AVG ORDER VALUE</p>
                    <h2>₹{Math.round(analytics.orders.avgValue)?.toLocaleString()}</h2>
                    <span>Per order</span>
                  </div>

                  <div className="kpi-card">
                    <p>NEW USERS (30D)</p>
                    <h2>{analytics.users.last30}</h2>
                    <span>+{analytics.users.today} today</span>
                  </div>

                </div>

                {/* ── REVENUE LAST 30 DAYS — CSS BARS ── */}

                <div className="analytics-chart-box analytics-wide">
                  <h3>REVENUE — LAST 30 DAYS</h3>
                  <CssBarChart
                    data={analytics.orders.byDay}
                    valueKey="revenue"
                    labelKey="_id"
                    color="#c8a45d"
                    formatValue={(v) => "₹"+v.toLocaleString()}
                    formatLabel={(v) => v.slice(5)}
                  />
                </div>

                {/* ── MONTHLY REVENUE — CSS BARS ── */}

                <div className="analytics-chart-box analytics-wide">
                  <h3>MONTHLY REVENUE — LAST 12 MONTHS</h3>
                  <CssBarChart
                    data={analytics.orders.byMonth}
                    valueKey="revenue"
                    labelKey="_id"
                    color="#c8a45d"
                    formatValue={(v) => "₹"+v.toLocaleString()}
                  />
                </div>

                {/* ── BREAKDOWN ROW ── */}

                <div className="analytics-row">

                  {/* ORDER STATUS */}

                  <div className="analytics-chart-box">
                    <h3>ORDERS BY STATUS</h3>
                    <CssDonutList
                      data={analytics.orders.byStatus}
                      valueKey="count"
                      labelKey="_id"
                      colors={["#c8a45d","#4a8ee0","#3dc460","#e05050"]}
                    />
                  </div>

                  {/* SALES BY CATEGORY */}

                  <div className="analytics-chart-box">
                    <h3>SALES BY CATEGORY</h3>
                    <CssDonutList
                      data={analytics.products.byCategory}
                      valueKey="revenue"
                      labelKey="_id"
                      colors={["#c8a45d","#4a8ee0","#3dc460","#e05050","#e07830","#9b59b6"]}
                      formatValue={(v) => "₹"+v.toLocaleString()}
                    />
                  </div>

                  {/* PAYMENT METHODS */}

                  <div className="analytics-chart-box">
                    <h3>PAYMENT METHODS</h3>
                    <CssDonutList
                      data={analytics.payments}
                      valueKey="count"
                      labelKey="_id"
                      colors={["#c8a45d","#3dc460","#4a8ee0"]}
                    />
                  </div>

                </div>

                {/* ── USER GROWTH ── */}

                <div className="analytics-chart-box analytics-wide">
                  <h3>NEW USERS — LAST 30 DAYS</h3>
                  <CssBarChart
                    data={analytics.users.byDay}
                    valueKey="count"
                    labelKey="_id"
                    color="#4a8ee0"
                    formatLabel={(v) => v.slice(5)}
                  />
                </div>

                {/* ── BOTTOM ROW ── */}

                <div className="analytics-row">

                  {/* TOP PRODUCTS */}

                  <div className="analytics-chart-box analytics-list-box">
                    <h3>TOP 5 PRODUCTS</h3>
                    <div className="analytics-list">
                      {analytics.products.top.map((p, i) => (
                        <div className="analytics-list-row" key={i}>
                          <span className="analytics-rank">#{i+1}</span>
                          <img src={p.image} alt={p.name} className="analytics-product-img" />
                          <div className="analytics-list-info">
                            <p>{p.name}</p>
                            <small>{p.category}</small>
                          </div>
                          <div className="analytics-list-stats">
                            <span className="analytics-sold">{p.totalSold} sold</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TOP CITIES */}

                  <div className="analytics-chart-box analytics-list-box">
                    <h3>TOP CITIES</h3>
                    <div className="analytics-list">
                      {analytics.topCities.map((c, i) => (
                        <div className="analytics-list-row" key={i}>
                          <span className="analytics-rank">#{i+1}</span>
                          <div className="analytics-list-info">
                            <p>{c._id || "Unknown"}</p>
                            <small>{c.orders} orders</small>
                          </div>
                          <div className="analytics-list-stats">
                            <span className="analytics-revenue">₹{c.revenue?.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION BREAKDOWN */}

                  <div className="analytics-chart-box">
                    <h3>REVENUE BY SECTION</h3>
                    <CssHBarChart
                      data={analytics.products.bySection}
                      valueKey="revenue"
                      labelKey="_id"
                      color="#c8a45d"
                      formatValue={(v) => "₹"+v.toLocaleString()}
                    />
                  </div>

                </div>

              </div>
            )}
          </>
        )}

      </div>

    </section>
  )

}

export default Admin
