
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Dùng đúng collection foods trong MongoDB Atlas.
// strict: false giúp giữ được các trường dữ liệu cũ.
const foodSchema = new mongoose.Schema(
  {
    foodId: { type: String, trim: true },
    name: { type: String, trim: true },
    category: { type: String, trim: true },
    cuisine: { type: String, default: "Việt Nam" },
    ingredients: { type: [String], default: [] },
    price: { type: Number, min: 0 },
    quantity: { type: Number, min: 0 },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  {
    collection: "foods",
    strict: false,
    timestamps: true,
  }
);

const Food = mongoose.model("Food", foodSchema);

function validObjectId(id) {
  return mongoose.isValidObjectId(id);
}

function findFilter(id) {
  return validObjectId(id) ? { _id: id } : { foodId: id };
}

function validateFood(data) {
  for (const field of ["foodId", "name", "category", "price", "quantity"]) {
    if (
      data[field] === undefined ||
      data[field] === null ||
      String(data[field]).trim() === ""
    ) {
      return `Vui lòng nhập trường ${field}`;
    }
  }

  if (!Number.isFinite(Number(data.price)) || Number(data.price) < 0) {
    return "Giá món ăn phải là số không âm";
  }

  if (
    !Number.isInteger(Number(data.quantity)) ||
    Number(data.quantity) < 0
  ) {
    return "Số lượng phải là số nguyên không âm";
  }

  if (
    data.ingredients !== undefined &&
    !Array.isArray(data.ingredients)
  ) {
    return "ingredients phải là một mảng";
  }

  return null;
}

function normalizeFood(data) {
  return {
    foodId: String(data.foodId).trim(),
    name: String(data.name).trim(),
    category: String(data.category).trim(),
    cuisine: String(data.cuisine || "Việt Nam").trim(),
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.map(String)
      : [],
    price: Number(data.price),
    quantity: Number(data.quantity),
    description: String(data.description || ""),
    imageUrl: String(data.imageUrl || ""),
  };
}

// Trang kiểm tra backend
app.get("/", (req, res) => {
  res.json({ message: "Food Management API is running" });
});

// GET /health
app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "OK" : "ERROR",
    database: connected ? "connected" : "disconnected",
  });
});

// GET /api/foods và GET /api/foods?search=pho
app.get("/api/foods", async (req, res) => {
  try {
    const keyword = String(req.query.search || "").trim();
    const filter = {};

    if (keyword) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      filter.$or = [
        { name: regex },
        { category: regex },
        { cuisine: regex },
      ];
    }

    const foods = await Food.find(filter).sort({ name: 1 }).lean();
    res.status(200).json(foods);
  } catch (error) {
    console.error("GET /api/foods:", error);
    res.status(500).json({ message: "Không lấy được danh sách món ăn" });
  }
});

// GET /api/foods/:id
app.get("/api/foods/:id", async (req, res) => {
  try {
    const food = await Food.findOne(findFilter(req.params.id)).lean();

    if (!food) {
      return res.status(404).json({ message: "Không tìm thấy món ăn" });
    }

    res.status(200).json(food);
  } catch (error) {
    console.error("GET food:", error);
    res.status(500).json({ message: "Không lấy được món ăn" });
  }
});

// POST /api/foods
app.post("/api/foods", async (req, res) => {
  try {
    const validationError = validateFood(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const payload = normalizeFood(req.body);
    const duplicate = await Food.findOne({ foodId: payload.foodId }).lean();

    if (duplicate) {
      return res.status(409).json({
        message: `Mã món ăn ${payload.foodId} đã tồn tại`,
      });
    }

    const food = await Food.create(payload);
    res.status(201).json(food);
  } catch (error) {
    console.error("POST food:", error);

    if (error.code === 11000) {
      return res.status(409).json({ message: "Mã món ăn đã tồn tại" });
    }

    res.status(500).json({ message: "Không thêm được món ăn" });
  }
});

// PUT /api/foods/:id
app.put("/api/foods/:id", async (req, res) => {
  try {
    const validationError = validateFood(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const current = await Food.findOne(findFilter(req.params.id));

    if (!current) {
      return res.status(404).json({ message: "Không tìm thấy món ăn" });
    }

    const payload = normalizeFood(req.body);
    const duplicate = await Food.findOne({
      foodId: payload.foodId,
      _id: { $ne: current._id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({ message: "Mã món ăn đã tồn tại" });
    }

    const updated = await Food.findByIdAndUpdate(
      current._id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    res.status(200).json(updated);
  } catch (error) {
    console.error("PUT food:", error);
    res.status(500).json({ message: "Không cập nhật được món ăn" });
  }
});

// DELETE /api/foods/:id
app.delete("/api/foods/:id", async (req, res) => {
  try {
    const food = await Food.findOneAndDelete(findFilter(req.params.id));

    if (!food) {
      return res.status(404).json({ message: "Không tìm thấy món ăn" });
    }

    res.status(200).json({ message: "Xóa món ăn thành công", food });
  } catch (error) {
    console.error("DELETE food:", error);
    res.status(500).json({ message: "Không xóa được món ăn" });
  }
});

// API không tồn tại trả về JSON, không trả HTML
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Không tìm thấy API" });
});

// Xử lý JSON gửi lên bị lỗi cú pháp
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Nội dung JSON không hợp lệ" });
  }

  console.error(error);
  res.status(500).json({ message: "Lỗi máy chủ" });
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Thiếu MONGODB_URI trong file .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
}

startServer();
