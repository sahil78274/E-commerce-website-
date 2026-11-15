import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
  X,
  Users, Tags, Ticket, Settings, Image, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { ThemeToggle } from "../theme.jsx";
import "./admin.css";

const menu = [
  ["Overview", "/admin", LayoutDashboard],
  ["Products", "/admin/products", Box],
  ["Categories", "/admin/categories", Tags],
  ["Orders", "/admin/orders", ShoppingBag],
  ["Customers", "/admin/customers", Users],
  ["Inventory", "/admin/inventory", Package],
  ["Coupons", "/admin/coupons", Ticket],
  ["Returns", "/admin/returns", RotateCcw],
  ["Reviews", "/admin/reviews", Star],
  ["Banners & Homepage", "/admin/banners", Image],
  ["Analytics", "/admin/analytics", BarChart3],
  ["Settings", "/admin/settings", Settings],
];
const key = () => Math.random().toString(36).slice(2);
const titleFor = (path) =>
  path.includes("/products/new")
    ? "Add product"
    : /^\/admin\/products\/\d+/.test(path)
      ? "Edit product"
      : menu.find(([, href]) => href === path)?.[0] || "Overview";
function useLoad(url, api, notify) {
  const [data, setData] = useState(null);
  async function load() {
    try {
      setData(await api(url));
    } catch (e) {
      notify(e.message);
    }
  }
  useEffect(() => {
    setData(null);
    load();
  }, [url]);
  return [data, load];
}
export default function AdminApp({ user, notify, api, money }) {
  const [drawer, setDrawer] = useState(false),
    [query, setQuery] = useState(""),
    [pending, setPending] = useState(0),
    [collapsed, setCollapsed] = useState(false),
    [notifications, setNotifications] = useState(false),
    [profile, setProfile] = useState(false);
  const loc = useLocation(),
    nav = useNavigate();
  useEffect(() => setDrawer(false), [loc.pathname]);
  useEffect(() => {
    if (user?.role === "admin")
      api("/admin/overview")
        .then((x) => setPending(x.pending))
        .catch(() => {});
  }, [user, loc.pathname]);
  if (user?.role !== "admin")
    return (
      <main className="admin-denied">
        <h1>Private area.</h1>
        <p>Owner access only.</p>
        <Link to="/login">Sign in</Link>
      </main>
    );
  return (
    <div className={"adm-shell " + (collapsed ? "is-collapsed" : "")}>
      <button
        className={"adm-overlay " + (drawer ? "show" : "")}
        aria-label="Close menu"
        onClick={() => setDrawer(false)}
      />
      <aside className={"adm-sidebar " + (drawer ? "open" : "")}>
        <Link className="adm-brand" to="/admin">
          BUNAVAT<span>®</span>
          <small>STUDIO / ADMIN</small>
        </Link>
        <div className="adm-side-label">WORKSPACE</div>
        <nav>
          {menu.map(([label, href, Icon]) => (
            <Link
              key={href}
              className={
                href === "/admin"
                  ? loc.pathname === "/admin"
                    ? "active"
                    : ""
                  : loc.pathname.startsWith(href)
                    ? "active"
                    : ""
              }
              to={href}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} />
            </Link>
          ))}
        </nav>
        <button className="adm-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={18}/> : <><PanelLeftClose size={18}/> <span>Collapse sidebar</span></>}</button>
        <div className="adm-sidebar-bottom">
          <Link to="/" target="_blank">
            View storefront <ExternalLink size={15} />
          </Link>
          <div>
            <span className="adm-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </span>
            <span>
              <b>{user.name}</b>
              <small>Store owner</small>
            </span>
            <Link to="/account" aria-label="Account">
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-topbar">
          <button
            className="adm-drawer-button"
            onClick={() => setDrawer(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="adm-top-title">
            <span>
              WORKSPACE <ChevronRight size={12} />{" "}
              {titleFor(loc.pathname).toUpperCase()}
            </span>
            <b>{titleFor(loc.pathname)}</b>
          </div>
          <form
            className="adm-top-search"
            onSubmit={(e) => {
              e.preventDefault();
              nav("/admin/products?q=" + encodeURIComponent(query));
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search products"
              placeholder="Search products or SKU..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button aria-label="Search">
              <ArrowRight size={16} />
            </button>
          </form>
          <Link className="adm-mobile-search" to="/admin/products" aria-label="Search products"><Search size={19}/></Link>
          <ThemeToggle />
          <div className="adm-popover-wrap">
            <button className="adm-icon-button" aria-label="Notifications" aria-expanded={notifications} onClick={() => {setNotifications(!notifications); setProfile(false)}}><Bell size={19}/>{pending > 0 && <span className="adm-alert-dot"/>}</button>
            {notifications && <div className="adm-popover"><b>Notifications</b><p>{pending ? `${pending} order${pending === 1 ? '' : 's'} awaiting processing.` : 'No orders awaiting processing.'}</p><Link onClick={() => setNotifications(false)} to="/admin/orders">View orders →</Link></div>}
          </div>
          <div className="adm-popover-wrap">
            <button className="adm-top-profile" aria-expanded={profile} onClick={() => {setProfile(!profile); setNotifications(false)}}><span className="adm-avatar">{user.name?.charAt(0).toUpperCase()}</span><span><b>{user.name}</b><small>Store owner</small></span><ChevronDown size={14}/></button>
            {profile && <div className="adm-popover"><b>{user.name}</b><p>{user.email}</p><Link to="/account" onClick={() => setProfile(false)}>Your account →</Link></div>}
          </div>
        </header>
        <div className="adm-content">
          <Routes>
            <Route
              index
              element={
                <Overview api={api} notify={notify} money={money} user={user} />
              }
            />
            <Route
              path="products"
              element={<Products api={api} notify={notify} money={money} />}
            />
            <Route
              path="products/new"
              element={
                <ProductEditor api={api} notify={notify} money={money} />
              }
            />
            <Route
              path="products/:id"
              element={
                <ProductEditor api={api} notify={notify} money={money} />
              }
            />
            <Route path="categories" element={<Categories api={api} notify={notify}/>} />
            <Route path="customers" element={<Customers api={api} notify={notify}/>} />
            <Route path="inventory" element={<Inventory api={api} notify={notify}/>} />
            <Route path="analytics" element={<Analytics api={api} notify={notify} money={money}/>} />
            <Route path="coupons" element={<Unavailable title="Coupons" detail="Coupon management and discounts are not configured."/>} />
            <Route path="banners" element={<Unavailable title="Banners & Homepage" detail="Homepage content is currently managed in the application, not in the admin."/>} />
            <Route path="settings" element={<Unavailable title="Settings" detail="Store settings and integrations are managed through server configuration. Online payments and automated shipping are not configured."/>} />
            <Route
              path="orders"
              element={<Orders api={api} notify={notify} money={money} />}
            />
            <Route
              path="returns"
              element={<Returns api={api} notify={notify} />}
            />
            <Route
              path="reviews"
              element={<Reviews api={api} notify={notify} />}
            />
            <Route
              path="*"
              element={
                <div className="adm-empty">This page is not available.</div>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}
function InsightList({title, subtitle, items, empty}) {
  return <div className="adm-card adm-insight"><div className="adm-card-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{!items ? <p className="adm-list-empty">Loading…</p> : items.length ? items.map((x,i)=><div className="adm-list-row" key={i}><b>{x.name}</b><span>{x.detail}</span></div>) : <p className="adm-list-empty">{empty}</p>}</div>;
}
function Categories({api,notify}) {
  const [products] = useLoad('/admin/products',api,notify);
  const counts = (products || []).reduce((a,p)=>{if(p.category) a[p.category]=(a[p.category]||0)+1; return a},{});
  return <><Heading kicker="CATALOGUE" title="Categories" description="Categories used by your product listings. Edit categories within each product."/><InsightList title="Your categories" subtitle="Includes drafts and inactive products" items={products && Object.entries(counts).map(([name,n])=>({name,detail:`${n} products`}))} empty="No categories yet."/><p><Link className="adm-subtle-link" to="/admin/products">Manage products <ArrowRight size={15}/></Link></p></>;
}
function Customers({api,notify}) {
  const [data]=useLoad('/admin/insights',api,notify);
  return <><Heading kicker="COMMUNITY" title="Customers" description="Registered customer accounts and order activity."/><InsightList title="Customers" subtitle="Most recently registered first" items={data?.customers.map(x=>({name:x.name,detail:`${x.email} · ${x.order_count} orders`}))} empty="No customers yet."/></>;
}
function Inventory({api,notify}) {
  const [data]=useLoad('/admin/insights',api,notify);
  return <><Heading kicker="STOCK CONTROL" title="Inventory" description="Available variants with five or fewer units. Manage all stock in the product editor."/><InsightList title="Low stock variants" subtitle="Active products only · up to 30 variants" items={data?.lowStock.map(x=>({name:x.name,detail:`${x.colour} / ${x.size} · ${x.sku} · ${x.stock} units`}))} empty="No low-stock variants."/><p><Link className="adm-subtle-link" to="/admin/products">Manage product inventory <ArrowRight size={15}/></Link></p></>;
}
function Analytics({api,notify,money}) {
  const [orders]=useLoad('/admin/orders',api,notify), [data]=useLoad('/admin/insights',api,notify);
  return <><Heading kicker="PERFORMANCE" title="Analytics" description="A view of activity recorded by your store."/>{orders ? <><OrdersAnalytics orders={orders}/><RevenueAnalytics orders={orders} money={money}/><InsightList title="Order statuses" subtitle="All recorded orders" items={Object.entries(orders.reduce((a,o)=>{a[o.status]=(a[o.status]||0)+1;return a},{})).map(([name,n])=>({name,detail:`${n} orders`}))} empty="No orders yet."/></> : <p>Loading activity…</p>}<InsightList title="Best sellers" subtitle="Units ordered, excluding cancelled and approved returns" items={data?.bestSellers.map(x=>({name:x.name,detail:`${x.units} units`}))} empty="No sales yet."/></>;
}
function Unavailable({title,detail}) { return <><Heading kicker="WORKSPACE" title={title} description={detail}/><div className="adm-card adm-empty"><Box size={24}/><b>Not available yet</b><p>{detail}</p></div></>; }
function Heading({ kicker, title, description, action }) {
  return (
    <div className="adm-heading">
      <div>
        <div className="adm-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Badge({ value }) {
  return (
    <span
      className={
        "adm-badge " +
        (["active", "delivered", "approved"].includes(
          String(value).toLowerCase(),
        )
          ? "good"
          : ["cancelled", "rejected", "inactive"].includes(
                String(value).toLowerCase(),
              )
            ? "muted"
            : "warm")
      }
    >
      <i />
      {value}
    </span>
  );
}
function Overview({ api, notify, money, user }) {
  const [stats] = useLoad("/admin/overview", api, notify),
    [orders] = useLoad("/admin/orders", api, notify),
    [insights] = useLoad("/admin/insights", api, notify);
  let cards = [
    ["Total orders", stats?.orders, ShoppingBag, "All orders"],
    [
      "Total revenue",
      stats ? money(stats.revenue) : null,
      BarChart3,
      "Paid orders only",
    ],
    ["Products", stats?.products, Box, "Active products"],
    ["Customers", stats?.customers, Users, "Registered customers"],
    ["Pending orders", stats?.pending, ClipboardList, "Awaiting processing"],
    ["Low stock", stats?.lowStock, Package, "At or below 5 units"],
  ];
  return (
    <>
      <Heading
        kicker="YOUR STORE AT A GLANCE"
        title={`Good to see you, ${user.name.split(" ")[0]}.`}
        description="Here’s what’s happening with your store."
        action={
          <Link className="adm-button primary" to="/admin/products/new">
            <Plus size={17} /> Add product
          </Link>
        }
      />
      <div className="adm-metrics">
        {cards.map(([label, value, Icon, sub]) => (
          <div className="adm-metric" key={label}>
            <div>
              <span>{label}</span>
              <span className="adm-metric-icon">
                <Icon size={19} />
              </span>
            </div>
            <strong>{value ?? "—"}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      {orders && <><OrdersAnalytics orders={orders} /><RevenueAnalytics orders={orders} money={money}/></>}
      <div className="adm-section-header">
        <div>
          <span className="adm-kicker">LATEST ACTIVITY</span>
          <h2>Recent orders</h2>
          <p>Keep track of your latest customer orders.</p>
        </div>
        <Link className="adm-subtle-link" to="/admin/orders">
          View all orders <ArrowRight size={15} />
        </Link>
      </div>
      <div className="adm-card">
        {orders === null ? (
          <p className="adm-empty">Loading orders…</p>
        ) : orders.length ? (
          <OrderTable orders={orders.slice(0, 5)} money={money} />
        ) : (
          <div className="adm-empty">
            <ShoppingBag size={24} />
            <b>No orders yet</b>
            <p>New orders will appear here when customers check out.</p>
          </div>
        )}
      </div>
      <div className="adm-insight-grid"><InsightList title="Best sellers" subtitle="Units ordered, excluding cancelled and approved returns" items={insights?.bestSellers?.map(x => ({name:x.name, detail:`${x.units} units`}))} empty="No sales yet."/><InsightList title="Low stock" subtitle="Available variants at 5 units or fewer" items={insights?.lowStock?.slice(0,5).map(x => ({name:x.name, detail:`${x.colour} / ${x.size} · ${x.stock} left`}))} empty="No low-stock variants."/><InsightList title="Customer activity" subtitle="Recently registered customers" items={insights?.customers?.slice(0,5).map(x => ({name:x.name, detail:`${x.order_count} orders · joined ${x.created_at.slice(0,10)}`}))} empty="No customers yet."/></div>
      <div className="adm-quick">
        <div>
          <span className="adm-kicker">QUICK ACTIONS</span>
          <h2>A little less admin.</h2>
          <p>Spend more time on what matters to your store.</p>
        </div>
        <Link to="/admin/products/new">
          <span>
            <Plus size={18} />
          </span>
          <b>
            Add a product<small>Create a new listing</small>
          </b>
          <ArrowRight size={17} />
        </Link>
        <Link to="/admin/orders">
          <span>
            <ClipboardList size={18} />
          </span>
          <b>
            Manage orders<small>Review and update orders</small>
          </b>
          <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
function OrdersAnalytics({ orders }) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 6 + i,
      ),
    );
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      label: d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      count: orders.filter((o) => o.created_at?.slice(0, 10) === key).length,
    };
  });
  const max = Math.max(1, ...days.map((x) => x.count));
  return (
    <div className="adm-analytics adm-card">
      <div className="adm-card-heading">
        <div>
          <h2>Order activity</h2>
          <p>Orders placed over the last 7 days · UTC</p>
        </div>
        <span className="adm-chart-total">
          {days.reduce((sum, d) => sum + d.count, 0)} orders
        </span>
      </div>
      <div
        className="adm-chart"
        role="img"
        aria-label={
          "Orders by day: " +
          days.map((d) => `${d.label}, ${d.count}`).join("; ")
        }
      >
        {days.map((d) => (
          <div key={d.key}>
            <span>{d.count}</span>
            <div className="adm-chart-track">
              <i style={{ height: `${(d.count / max) * 100}%` }} />
            </div>
            <small>{d.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
function RevenueAnalytics({orders,money}) {
  const now=new Date(), days=Array.from({length:7},(_,i)=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-6+i)),key=d.toISOString().slice(0,10);return {label:d.toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'UTC'}),value:orders.filter(o=>o.created_at?.slice(0,10)===key && o.payment_status==='Paid').reduce((sum,o)=>sum+o.total,0)}}), max=Math.max(1,...days.map(d=>d.value));
  return <div className="adm-analytics adm-card"><div className="adm-card-heading"><div><h2>Paid revenue</h2><p>Paid orders by order date, last 7 days · UTC</p></div><span className="adm-chart-total">{money(days.reduce((s,d)=>s+d.value,0))}</span></div><div className="adm-chart" role="img" aria-label={'Paid revenue: '+days.map(d=>`${d.label}, ${money(d.value)}`).join('; ')}>{days.map(d=><div key={d.label}><span>{money(d.value)}</span><div className="adm-chart-track"><i style={{height:`${d.value/max*100}%`}}/></div><small>{d.label}</small></div>)}</div></div>;
}
function OrderTable({ orders, money, onUpdate }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>ORDER</th>
            <th>CUSTOMER</th>
            <th>DATE</th>
            <th>AMOUNT</th>
            <th>STATUS</th>
            {onUpdate && <th>ACTION</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td data-label="Order">
                <b>{o.number}</b>
              </td>
              <td data-label="Customer">
                <span>
                  {o.name}
                  <small>
                    {o.address}, {o.city}, {o.state} {o.pin} · {o.phone}
                  </small>
                </span>
              </td>
              <td data-label="Date">{o.created_at?.slice(0, 10)}</td>
              <td data-label="Amount">
                <span>
                  <b>{money(o.total)}</b>
                  <small>
                    {o.payment_method} · {o.payment_status}
                  </small>
                </span>
              </td>
              <td data-label="Status">
                <span>
                  <Badge value={o.status} />
                  {o.tracking && <small>{o.tracking}</small>}
                </span>
              </td>
              {onUpdate && (
                <td data-label="Action">
                  <select
                    aria-label={"Update " + o.number}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onUpdate(o, e.target.value);
                    }}
                  >
                    <option value="">Update status</option>
                    {[
                      "Processing",
                      "Packed",
                      "Shipped",
                      "Out for Delivery",
                      "Delivered",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Products({ api, notify, money }) {
  const [data] = useLoad("/admin/products", api, notify),
    loc = useLocation();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("all"),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1);
  useEffect(
    () => setSearch(new URLSearchParams(loc.search).get("q") || ""),
    [loc.search],
  );
  useEffect(() => setPage(1), [search, status, category, sort]);
  const filtered = useMemo(() => {
    let a = (data || []).filter(
      (p) =>
        (p.name + " " + p.sku).toLowerCase().includes(search.toLowerCase()) &&
        (status === "all" || p.status === status) &&
        (category === "all" || p.category === category),
    );
    if (sort === "name") a.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "stock") a.sort((a, b) => a.stock - b.stock);
    return a;
  }, [data, search, status, category, sort]);
  let pages = Math.max(1, Math.ceil(filtered.length / 10)),
    items = filtered.slice((page - 1) * 10, page * 10);
  return (
    <>
      <Heading
        kicker="YOUR CATALOGUE"
        title="Products"
        description="Manage your pieces, prices and inventory in one place."
        action={
          <Link className="adm-button primary" to="/admin/products/new">
            <Plus size={17} /> Add product
          </Link>
        }
      />
      <div className="adm-card">
        <div className="adm-card-heading">
          <div>
            <h2>
              All products <span>{data?.length ?? "—"}</span>
            </h2>
            <p>Your product catalogue at a glance.</p>
          </div>
        </div>
        <div className="adm-filters">
          <label className="adm-filter-search">
            <Search size={16} />
            <input
              placeholder="Search products or SKU"
              aria-label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {[
              ...new Set((data || []).map((p) => p.category).filter(Boolean)),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="stock">Lowest stock</option>
          </select>
        </div>
        {data === null ? (
          <p className="adm-empty">Loading products…</p>
        ) : items.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table adm-product-table">
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>INVENTORY</th>
                  <th>STATUS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Product">
                      <Link
                        className="adm-product-cell"
                        to={"/admin/products/" + p.id}
                      >
                        {p.image ? (
                          <img src={p.image} alt="" />
                        ) : (
                          <span className="adm-image-empty">
                            <Box size={20} />
                          </span>
                        )}
                        <span>
                          <b>{p.name || "Untitled draft"}</b>
                          <small>
                            {p.sku.startsWith("__draft_") ? "No SKU" : p.sku}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td data-label="Category">{p.category || "—"}</td>
                    <td data-label="Price">
                      {p.sale_price
                        ? money(p.offer_price ?? p.sale_price)
                        : "—"}
                    </td>
                    <td data-label="Inventory">
                      <b>{p.stock} units</b>
                      <small>{p.variant_count} variants</small>
                    </td>
                    <td data-label="Status">
                      <Badge value={p.status} />
                    </td>
                    <td data-label="">
                      <Link
                        className="adm-edit-link"
                        to={"/admin/products/" + p.id}
                      >
                        Edit <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-empty">
            <Box size={24} />
            <b>No products found</b>
            <p>
              {data.length
                ? "Try changing your filters."
                : "Your first product will appear here."}
            </p>
          </div>
        )}
        <div className="adm-pagination">
          <span>
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
function Orders({ api, notify, money }) {
  const [data, load] = useLoad("/admin/orders", api, notify),
    [search, setSearch] = useState("");
  async function update(o, status) {
    let tracking = o.tracking;
    if (status === "Shipped") {
      let input = prompt(
        "Enter courier and tracking details, or leave blank for manual shipping",
        tracking || "",
      );
      if (input === null) return;
      tracking = input;
    }
    try {
      await api("/admin/orders/" + o.id, {
        method: "PATCH",
        body: JSON.stringify({ status, tracking }),
      });
      notify("Order updated");
      load();
    } catch (e) {
      notify(e.message);
    }
  }
  let filtered = (data || []).filter((o) =>
    (o.number + " " + o.name).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        kicker="FULFILMENT"
        title="Orders"
        description="Review your orders and keep customers up to date."
      />
      <div className="adm-card">
        <div className="adm-card-heading">
          <div>
            <h2>
              All orders <span>{data?.length ?? "—"}</span>
            </h2>
            <p>Shipping details are managed manually.</p>
          </div>
          <label className="adm-filter-search">
            <Search size={16} />
            <input
              aria-label="Search orders"
              placeholder="Search orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {data === null ? (
          <p className="adm-empty">Loading orders…</p>
        ) : filtered.length ? (
          <OrderTable orders={filtered} money={money} onUpdate={update} />
        ) : (
          <div className="adm-empty">
            <ShoppingBag size={24} />
            <b>No orders found</b>
            <p>Orders will appear here when they are placed.</p>
          </div>
        )}
      </div>
    </>
  );
}
function Returns({ api, notify }) {
  const [data, load] = useLoad("/admin/returns", api, notify);
  async function decide(r, status) {
    try {
      await api("/admin/returns/" + r.id, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      notify("Return updated");
      load();
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <Heading
        kicker="CUSTOMER CARE"
        title="Returns"
        description="Review and manage customer return requests."
      />
      <div className="adm-card">
        {data === null ? (
          <p className="adm-empty">Loading returns…</p>
        ) : data.length ? (
          data.map((r) => (
            <div className="adm-request" key={r.id}>
              <div>
                <b>{r.number}</b>
                <p>{r.reason}</p>
                <small>{r.description}</small>
              </div>
              <Badge value={r.status} />
              {r.status === "Requested" && (
                <div className="adm-request-actions">
                  <button
                    className="adm-button ghost"
                    onClick={() => decide(r, "Rejected")}
                  >
                    Reject
                  </button>
                  <button
                    className="adm-button primary"
                    onClick={() => decide(r, "Approved")}
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="adm-empty">
            <RotateCcw size={24} />
            <b>No return requests</b>
            <p>Requests will appear here when submitted.</p>
          </div>
        )}
      </div>
    </>
  );
}
function Reviews({ api, notify }) {
  const [data, load] = useLoad("/admin/reviews", api, notify);
  async function decide(r, status) {
    try {
      await api("/admin/reviews/" + r.id, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      notify("Review updated");
      load();
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <Heading
        kicker="COMMUNITY"
        title="Reviews"
        description="Moderate customer feedback on your products."
      />
      <div className="adm-card">
        {data === null ? (
          <p className="adm-empty">Loading reviews…</p>
        ) : data.length ? (
          data.map((r) => (
            <div className="adm-request" key={r.id}>
              <div>
                <b>
                  {r.product_name} · {r.rating}/5
                </b>
                <p>
                  {r.customer_name}: {r.body}
                </p>
                <small>{r.reports} reports</small>
              </div>
              <Badge value={r.status} />
              <div className="adm-request-actions">
                <button
                  className="adm-button ghost"
                  onClick={() => decide(r, "Rejected")}
                >
                  Reject
                </button>
                <button
                  className="adm-button primary"
                  onClick={() => decide(r, "Approved")}
                >
                  Approve
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="adm-empty">
            <Star size={24} />
            <b>No reviews yet</b>
            <p>Submitted reviews will appear here.</p>
          </div>
        )}
      </div>
    </>
  );
}
const blankForm = () => ({
  name: "",
  slug: "",
  sku: "",
  gender: "",
  category: "",
  subcategory: "",
  brand: "",
  description: "",
  material: "",
  fit: "",
  specifications: "",
  price: "",
  sale_price: "",
  offer_price: "",
  status: "draft",
  featured: false,
  new_arrival: false,
  best_seller: false,
  images: [],
  colours: [],
});
function ProductEditor({ api, notify, money }) {
  const { id } = useParams(),
    editing = !!id,
    nav = useNavigate();
  const [form, setForm] = useState(blankForm),
    [loading, setLoading] = useState(editing),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (editing)
      api("/admin/products/" + id)
        .then((p) => {
          let groups = (p.colours || []).map((c) => ({
            ...c,
            _key: key(),
            sizes: p.variants
              .filter((v) => v.colour === c.name)
              .map((v) => ({ ...v, _key: key() })),
          }));
          setForm({ ...p, colours: groups });
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
  }, [id]);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const changeColour = (k, field, value) =>
    setForm((f) => ({
      ...f,
      colours: f.colours.map((c) =>
        c._key === k ? { ...c, [field]: value } : c,
      ),
    }));
  const changeSize = (k, sk, field, value) =>
    setForm((f) => ({
      ...f,
      colours: f.colours.map((c) =>
        c._key === k
          ? {
              ...c,
              sizes: c.sizes.map((v) =>
                v._key === sk ? { ...v, [field]: value } : v,
              ),
            }
          : c,
      ),
    }));
  async function upload(event, colourKey) {
    let input = event.target,
      files = [...input.files];
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        let payload = new FormData();
        payload.append("image", file);
        let response = await fetch("/api/admin/upload", {
          method: "POST",
          body: payload,
        });
        let result = await response.json();
        if (!response.ok) throw Error(result.error);
        setForm((f) =>
          colourKey
            ? {
                ...f,
                colours: f.colours.map((c) =>
                  c._key === colourKey
                    ? { ...c, images: [...c.images, result.url] }
                    : c,
                ),
              }
            : { ...f, images: [...f.images, result.url] },
        );
      }
      notify("Images uploaded");
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      input.value = "";
    }
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        colours: form.colours.map((c) => ({
          name: c.name,
          code: c.code || "",
          images: c.images,
        })),
        variants: form.colours.flatMap((c) =>
          c.sizes.map((v) => ({
            id: v.id,
            size: v.size,
            colour: c.name,
            sku: v.sku || "",
            stock: v.stock,
            sale_price: v.sale_price ?? null,
            available: v.available === undefined ? true : !!v.available,
          })),
        ),
      };
      await api("/admin/products" + (editing ? "/" + id : ""), {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      notify("Product saved");
      nav("/admin/products");
    } catch (e) {
      setError(e.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  if (loading) return <div className="adm-empty">Loading product…</div>;
  const totalVariants = form.colours.reduce((n, c) => n + c.sizes.length, 0),
    totalStock = form.colours.reduce(
      (n, c) => n + c.sizes.reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
      0,
    );
  return (
    <>
      <Link className="adm-back" to="/admin/products">
        <ArrowLeft size={15} /> Back to products
      </Link>
      <Heading
        kicker="CATALOGUE / PRODUCT DETAILS"
        title={editing ? "Edit product" : "Add a new product"}
        description="Create considered listings with every detail in its place."
      />
      <form className="adm-editor" onSubmit={save} noValidate>
        {error && (
          <div className="adm-error" role="alert">
            {error}
          </div>
        )}
        <div className="adm-editor-layout">
          <div className="adm-editor-main">
            <section className="adm-form-card">
              <div className="adm-form-heading">
                <span>01</span>
                <div>
                  <h2>Basic information</h2>
                  <p>The details that define your product.</p>
                </div>
              </div>
              <div className="adm-fields">
                {[
                  ["name", "Product name"],
                  ["sku", "Parent SKU"],
                  ["category", "Category"],
                  ["subcategory", "Subcategory"],
                  ["brand", "Brand"],
                  ["material", "Fabric"],
                  ["fit", "Fit type"],
                ].map(([field, label]) => (
                  <label key={field}>
                    {label}
                    <input
                      value={form[field] ?? ""}
                      onChange={(e) => set(field, e.target.value)}
                    />
                  </label>
                ))}
                <label>
                  Gender
                  <select
                    value={form.gender || ""}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option>Men</option>
                    <option>Women</option>
                    <option>Unisex</option>
                  </select>
                </label>
                <label className="adm-field-full">
                  Description
                  <textarea
                    rows="4"
                    value={form.description || ""}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </label>
                <label className="adm-field-full">
                  Specifications
                  <textarea
                    rows="3"
                    value={form.specifications || ""}
                    onChange={(e) => set("specifications", e.target.value)}
                  />
                </label>
              </div>
            </section>
            <section className="adm-form-card">
              <div className="adm-form-heading">
                <span>02</span>
                <div>
                  <h2>Pricing</h2>
                  <p>
                    Set a base price. A size can have its own selling price
                    below.
                  </p>
                </div>
              </div>
              <div className="adm-fields three">
                {[
                  ["price", "MRP (₹)"],
                  ["sale_price", "Selling price (₹)"],
                  ["offer_price", "Offer price (₹, optional)"],
                ].map(([field, label]) => (
                  <label key={field}>
                    {label}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form[field] ?? ""}
                      onChange={(e) => set(field, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
            <section className="adm-form-card">
              <div className="adm-form-heading">
                <span>03</span>
                <div>
                  <h2>Colour & size variants</h2>
                  <p>
                    One product, thoughtfully organised by colour and size. To
                    change a saved colour or size, remove it and add another;
                    order history is retained.
                  </p>
                </div>
              </div>
              <div className="adm-colour-list">
                {form.colours.map((c, ci) => (
                  <div className="adm-colour-card" key={c._key}>
                    <div className="adm-colour-header">
                      <div>
                        <span
                          className="adm-colour-dot"
                          style={{ background: c.code || "#deddd7" }}
                        />
                        <b>{c.name || `Colour ${ci + 1}`}</b>
                        <small>
                          {c.sizes.length} size{c.sizes.length === 1 ? "" : "s"}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="adm-text-danger"
                        onClick={() => {
                          if (
                            c.sizes.some((v) => v.id) &&
                            !confirm(
                              "Remove this colour? Existing order history will be preserved.",
                            )
                          )
                            return;
                          set(
                            "colours",
                            form.colours.filter((x) => x._key !== c._key),
                          );
                        }}
                      >
                        <Trash2 size={15} /> Remove colour
                      </button>
                    </div>
                    <div className="adm-fields colour-fields">
                      <label>
                        Colour name
                        <input
                          value={c.name}
                          disabled={c.sizes.some((v) => v.id)}
                          placeholder="e.g. Black"
                          onChange={(e) =>
                            changeColour(c._key, "name", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Colour code (hex)
                        <div className="adm-code-field">
                          <input
                            type="color"
                            aria-label="Choose colour"
                            value={
                              /^#[0-9a-f]{6}$/i.test(c.code || "")
                                ? c.code
                                : "#deddd7"
                            }
                            onChange={(e) =>
                              changeColour(c._key, "code", e.target.value)
                            }
                          />
                          <input
                            placeholder="#000000"
                            value={c.code || ""}
                            maxLength={7}
                            onChange={(e) =>
                              changeColour(c._key, "code", e.target.value)
                            }
                          />
                        </div>
                      </label>
                    </div>
                    <div className="adm-size-head">
                      <span>SIZES & INVENTORY</span>
                      <span>Leave price blank to use the product price</span>
                    </div>
                    {c.sizes.map((v, i) => (
                      <div className="adm-size-row" key={v._key}>
                        <label>
                          Size
                          <input
                            value={v.size || ""}
                            disabled={!!v.id}
                            placeholder="e.g. M or 32"
                            onChange={(e) =>
                              changeSize(c._key, v._key, "size", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          SKU
                          <input
                            value={v.sku || ""}
                            placeholder="Variant SKU"
                            onChange={(e) =>
                              changeSize(c._key, v._key, "sku", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Price (₹)
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={v.sale_price ?? ""}
                            placeholder="Base price"
                            onChange={(e) =>
                              changeSize(
                                c._key,
                                v._key,
                                "sale_price",
                                e.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          Stock
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={v.stock ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              changeSize(
                                c._key,
                                v._key,
                                "stock",
                                e.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          Availability
                          <select
                            value={
                              v.available === 0 || v.available === false
                                ? "0"
                                : "1"
                            }
                            onChange={(e) =>
                              changeSize(
                                c._key,
                                v._key,
                                "available",
                                e.target.value === "1",
                              )
                            }
                          >
                            <option value="1">Available</option>
                            <option value="0">Unavailable</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          className="adm-remove-size"
                          aria-label={`Remove ${v.size || "size " + (i + 1)}`}
                          onClick={() => {
                            if (
                              v.id &&
                              !confirm(
                                "Remove this size? Existing order history will be preserved.",
                              )
                            )
                              return;
                            changeColour(
                              c._key,
                              "sizes",
                              c.sizes.filter((x) => x._key !== v._key),
                            );
                          }}
                        >
                          <X size={17} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="adm-add-size"
                      onClick={() =>
                        changeColour(c._key, "sizes", [
                          ...c.sizes,
                          {
                            _key: key(),
                            size: "",
                            sku: "",
                            stock: "",
                            sale_price: null,
                            available: true,
                          },
                        ])
                      }
                    >
                      <Plus size={15} /> Add size
                    </button>
                    <div className="adm-colour-images">
                      <div>
                        <b>Images for {c.name || "this colour"}</b>
                        <p>
                          These appear when this colour is selected. The product
                          gallery is used as a fallback.
                        </p>
                      </div>
                      <ImageUploader
                        images={c.images}
                        onUpload={(e) => upload(e, c._key)}
                        onChange={(images) =>
                          changeColour(c._key, "images", images)
                        }
                        uploading={uploading}
                        compact
                      />
                    </div>
                  </div>
                ))}
                {!form.colours.length && (
                  <div className="adm-inline-empty">
                    No colours yet. Add your first colour to configure sizes and
                    stock.
                  </div>
                )}
                <button
                  type="button"
                  className="adm-button outline"
                  onClick={() =>
                    set("colours", [
                      ...form.colours,
                      {
                        _key: key(),
                        name: "",
                        code: "",
                        images: [],
                        sizes: [],
                      },
                    ])
                  }
                >
                  <Plus size={16} /> Add colour
                </button>
              </div>
            </section>
            <section className="adm-form-card">
              <div className="adm-form-heading">
                <span>04</span>
                <div>
                  <h2>Product images</h2>
                  <p>
                    Upload the main product gallery. The first image is the
                    cover.
                  </p>
                </div>
              </div>
              <ImageUploader
                images={form.images}
                onUpload={(e) => upload(e, null)}
                onChange={(images) => set("images", images)}
                uploading={uploading}
              />
            </section>
            <section className="adm-form-card">
              <div className="adm-form-heading">
                <span>05</span>
                <div>
                  <h2>Inventory summary</h2>
                  <p>Review the variants before saving.</p>
                </div>
              </div>
              <div className="adm-summary-totals">
                <span>
                  <b>{form.colours.length}</b> colours
                </span>
                <span>
                  <b>{totalVariants}</b> sizes
                </span>
                <span>
                  <b>{totalStock}</b> units
                </span>
              </div>
              {totalVariants > 0 && (
                <div className="adm-summary-list">
                  {form.colours.flatMap((c) =>
                    c.sizes.map((v) => (
                      <div key={v._key}>
                        <span>
                          {c.name || "Unnamed colour"} / {v.size || "—"}
                        </span>
                        <span>{v.sku || "No SKU"}</span>
                        <small>
                          {v.sale_price ? money(v.sale_price) : "Base price"}
                        </small>
                        <b>{v.stock === "" ? "—" : v.stock} units</b>
                        <small>
                          {v.available === 0 || v.available === false
                            ? "Unavailable"
                            : "Available"}
                        </small>
                      </div>
                    )),
                  )}
                </div>
              )}
            </section>
            <section className="adm-form-card">
              <div className="adm-form-heading">
                <span>06</span>
                <div>
                  <h2>SEO & publishing</h2>
                  <p>Manage the product URL and visibility.</p>
                </div>
              </div>
              <div className="adm-fields">
                <label>
                  URL slug (optional)
                  <input
                    value={form.slug || ""}
                    onChange={(e) => set("slug", e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active / published</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
              <div className="adm-flags">
                {[
                  ["featured", "Featured product"],
                  ["new_arrival", "New arrival"],
                  ["best_seller", "Best seller"],
                ].map(([field, label]) => (
                  <label key={field}>
                    <input
                      type="checkbox"
                      checked={!!form[field]}
                      onChange={(e) => set(field, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          </div>
          <aside className="adm-editor-aside">
            <div className="adm-form-card">
              <span className="adm-kicker">PUBLISHING</span>
              <h3>Ready when you are.</h3>
              <p>
                Save as a draft or publish to make this product visible in your
                store.
              </p>
              <div className="adm-aside-status">
                <span>Current status</span>
                <Badge value={form.status} />
              </div>
              <button className="adm-button primary full" disabled={uploading}>
                {uploading ? "Uploading…" : "Save product"}{" "}
                <ArrowRight size={16} />
              </button>
              <Link className="adm-button outline full" to="/admin/products">
                Discard changes
              </Link>
              {editing && (
                <button
                  type="button"
                  className="adm-archive"
                  onClick={async () => {
                    if (
                      confirm(
                        "Archive this product? It will no longer be visible to customers.",
                      )
                    ) {
                      try {
                        await api("/admin/products/" + id, {
                          method: "DELETE",
                        });
                        notify("Product archived");
                        nav("/admin/products");
                      } catch (e) {
                        setError(e.message);
                      }
                    }
                  }}
                >
                  Archive product
                </button>
              )}
            </div>
          </aside>
        </div>
        <div className="adm-mobile-save">
          <button className="adm-button primary full" disabled={uploading}>
            {uploading ? "Uploading…" : "Save product"} <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </>
  );
}
function ImageUploader({
  images = [],
  onUpload,
  onChange,
  uploading,
  compact,
}) {
  return (
    <div className="adm-upload-area">
      <div className="adm-image-list">
        {images.map((url, i) => (
          <div className="adm-image-item" key={url}>
            <img src={url} alt={"Uploaded image " + (i + 1)} />
            <div>
              <small>{i === 0 ? "MAIN" : "IMAGE " + (i + 1)}</small>
              <button
                type="button"
                onClick={() =>
                  onChange([url, ...images.filter((x) => x !== url)])
                }
                disabled={i === 0}
              >
                Make main
              </button>
              <button
                type="button"
                onClick={() => onChange(images.filter((x) => x !== url))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <label className={"adm-image-upload " + (compact ? "compact" : "")}>
          <ImagePlus size={20} />
          <span>Add images</span>
          <small>JPEG, PNG, WebP · 5 MB</small>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
