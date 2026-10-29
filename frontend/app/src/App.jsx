
import { useEffect, useState } from "react";
import "./App.css";


const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/foods`;

const emptyForm = {
  foodId: "",
  name: "",
  category: "",
  cuisine: "Việt Nam",
  ingredients: "",
  price: "",
  quantity: "",
  description: "",
  imageUrl: "",
};

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `API trả về HTML thay vì JSON. Kiểm tra backend và địa chỉ: ${url}`
    );
  }

  if (!response.ok) {
    throw new Error(data.message || `Lỗi HTTP ${response.status}`);
  }

  return data;
}

function App() {
  const [foods, setFoods] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFoods(keyword = "") {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(
        `${API}?search=${encodeURIComponent(keyword)}`
      );
      setFoods(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFoods("");
  }, []);

  function changeField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }

  function startEdit(food) {
    setEditingId(food._id);
    setForm({
      foodId: food.foodId || "",
      name: food.name || "",
      category: food.category || "",
      cuisine: food.cuisine || "Việt Nam",
      ingredients: Array.isArray(food.ingredients)
        ? food.ingredients.join(", ")
        : food.ingredients || "",
      price: String(food.price ?? ""),
      quantity: String(food.quantity ?? ""),
      description: food.description || "",
      imageUrl: food.imageUrl || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveFood(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      ...form,
      ingredients: form.ingredients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      price: Number(form.price),
      quantity: Number(form.quantity),
    };

    try {
      const result = await apiRequest(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      setMessage(
        editingId ? "Cập nhật món ăn thành công!" : "Thêm món ăn thành công!"
      );

      resetForm();
      setMessage(
        editingId ? "Cập nhật món ăn thành công!" : "Thêm món ăn thành công!"
      );
      await loadFoods(search);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteFood(food) {
    const confirmed = window.confirm(`Xóa món "${food.name}" nhé?`);
    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await apiRequest(`${API}/${food._id}`, { method: "DELETE" });
      setMessage("Xóa món ăn thành công!");
      await loadFoods(search);
    } catch (err) {
      setError(err.message);
    }
  }

  async function searchFoods(event) {
    event.preventDefault();
    await loadFoods(search);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🍜</span>
          <div>
            <h1>FOOD MANAGER</h1>
            <p>HỆ THỐNG QUẢN LÝ MÓN ĂN</p>
          </div>
        </div>
        <span className="connection"><i /> MongoDB Atlas</span>
      </header>

      <main className="container">
        <section className="welcome">
          <div>
            <p className="eyebrow">QUẢN LÝ NHÀ HÀNG</p>
            <h2>Quản lý thực đơn</h2>
            <p>Quản lý món ăn, nguyên liệu, giá bán và số lượng.</p>
          </div>
          <div className="food-count">
            <span>Tổng số món hiển thị</span>
            <strong>{foods.length}</strong>
          </div>
        </section>

        <section className="panel">
          <h3>{editingId ? "✏️ Cập nhật món ăn" : "➕ Thêm món ăn mới"}</h3>

          <form className="food-form" onSubmit={saveFood}>
            <label>Mã món ăn *
              <input name="foodId" required value={form.foodId} onChange={changeField} placeholder="VD: MON004" />
            </label>

            <label>Tên món ăn *
              <input name="name" required value={form.name} onChange={changeField} placeholder="Tên món ăn" />
            </label>

            <label>Danh mục *
              <input name="category" required value={form.category} onChange={changeField} placeholder="Món nước, món cơm..." />
            </label>

            <label>Ẩm thực
              <input name="cuisine" value={form.cuisine} onChange={changeField} placeholder="Việt Nam" />
            </label>

            <label>Giá bán (VNĐ) *
              <input name="price" type="number" min="0" required value={form.price} onChange={changeField} />
            </label>

            <label>Số lượng *
              <input name="quantity" type="number" min="0" step="1" required value={form.quantity} onChange={changeField} />
            </label>

            <label className="wide">Nguyên liệu (ngăn cách bằng dấu phẩy)
              <input name="ingredients" value={form.ingredients} onChange={changeField} placeholder="Bánh phở, thịt bò, hành..." />
            </label>

            <label className="wide">Mô tả
              <textarea name="description" value={form.description} onChange={changeField} placeholder="Mô tả món ăn" />
            </label>

            <label className="wide">Link hình ảnh
              <input name="imageUrl" type="url" value={form.imageUrl} onChange={changeField} placeholder="https://..." />
            </label>

            <div className="form-actions wide">
              <button className="primary" type="submit">
                {editingId ? "Lưu cập nhật" : "Thêm món ăn"}
              </button>
              {editingId && (
                <button className="secondary" type="button" onClick={resetForm}>
                  Hủy sửa
                </button>
              )}
            </div>
          </form>

          {message && <p className="success-message">{message}</p>}
          {error && <p className="error">{error}</p>}
        </section>

        <section className="panel">
          <div className="list-heading">
            <div>
              <h3>🍽️ Thực đơn hiện có</h3>
              <p>Dữ liệu được tải từ API và MongoDB Atlas.</p>
            </div>
            <button className="secondary" onClick={() => loadFoods(search)}>
              ↻ Làm mới
            </button>
          </div>

          <form className="search" onSubmit={searchFoods}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, danh mục, loại ẩm thực..."
            />
            <button className="primary" type="submit">Tìm kiếm</button>
          </form>

          {loading && <p className="notice">Đang tải dữ liệu...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && foods.length === 0 && (
            <p className="notice">Không tìm thấy món ăn nào.</p>
          )}

          <div className="food-grid">
            {foods.map((food) => (
              <article className="food-card" key={food._id}>
                {food.imageUrl ? (
                  <img className="food-image" src={food.imageUrl} alt={food.name} />
                ) : (
                  <div className="food-placeholder">🍲</div>
                )}

                <div className="food-content">
                  <div className="food-meta">
                    <span>{food.category}</span>
                    <small>{food.foodId}</small>
                  </div>

                  <h4>{food.name}</h4>
                  <p className="cuisine">{food.cuisine || "Chưa phân loại"}</p>
                  <p className="description">{food.description || "Chưa có mô tả."}</p>
                  <p className="ingredients">
                    <b>Nguyên liệu:</b>{" "}
                    {Array.isArray(food.ingredients)
                      ? food.ingredients.join(", ")
                      : food.ingredients || "Chưa cập nhật"}
                  </p>

                  <div className="card-bottom">
                    <strong>
                      {Number(food.price || 0).toLocaleString("vi-VN")} ₫
                    </strong>
                    <span>SL: {food.quantity ?? 0}</span>
                  </div>

                  <div className="card-actions">
                    <button className="secondary" onClick={() => startEdit(food)}>
                      Sửa
                    </button>
                    <button className="danger" onClick={() => deleteFood(food)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer>FOOD MANAGER · React · Express · MongoDB Atlas</footer>
      </main>
    </div>
  );
}

export default App;
