
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Проверяем настройки
if (!process.env.MONGO_URI || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
  throw new Error("Проверь настройки в server/.env");
}

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => console.log("MongoDB connection error:", error));

// Модель участника
const participantSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  schoolClass: {
    type: String,
    required: true,
    trim: true,
  },
});

const Participant = mongoose.model("Participant", participantSchema);

// Проверка повторной регистрации
app.post("/api/register", async (req, res) => {
  try {
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim();
    const schoolClass = req.body.schoolClass?.trim();

    if (!firstName || !lastName || !schoolClass) {
      return res.status(400).json({
        message: "Заполни все поля!",
      });
    }

    const escapeRegex = (value) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const existingParticipant = await Participant.findOne({
      firstName: new RegExp("^" + escapeRegex(firstName) + "$", "i"),
      lastName: new RegExp("^" + escapeRegex(lastName) + "$", "i"),
      schoolClass: new RegExp("^" + escapeRegex(schoolClass) + "$", "i"),
    });

    if (existingParticipant) {
      return res.status(409).json({
        message: "Этот участник уже зарегистрирован!",
      });
    }

    const participant = await Participant.create({
      firstName,
      lastName,
      schoolClass,
    });

    return res.status(201).json({
      message: "Регистрация прошла успешно!",
      participant,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Ошибка сервера",
    });
  }
});

// Вход администратора
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      message: "Неверный пароль!",
    });
  }

  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({
    message: "Вход выполнен!",
    token,
  });
});

// Проверка прав администратора
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Сначала войдите в аккаунт администратора",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Доступ запрещён" });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Сессия истекла. Войдите снова.",
    });
  }
}

// Получение списка участников
app.get("/api/admin/participants", adminAuth, async (req, res) => {
  try {
    const participants = await Participant.find()
      .sort({ _id: -1 })
      .select("firstName lastName schoolClass");

    res.json({
      total: participants.length,
      participants,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Не удалось загрузить участников" });
  }
});

// Удаление участника
app.delete("/api/admin/participants/:id", adminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Неверный ID участника" });
    }

    const participant = await Participant.findByIdAndDelete(req.params.id);

    if (!participant) {
      return res.status(404).json({ message: "Участник не найден" });
    }

    res.json({ message: "Участник удалён" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка удаления" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
