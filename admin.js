
const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");

const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");

const participantsList = document.getElementById("participantsList");
const totalParticipants = document.getElementById("totalParticipants");

const searchInput = document.getElementById("searchInput");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");

let participants = [];
let token = sessionStorage.getItem("adminToken");

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  logoutButton.classList.add("hidden");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  logoutButton.classList.remove("hidden");
}

function showLoginMessage(text, isError = true) {
  loginMessage.textContent = text;
  loginMessage.style.color = isError ? "#ff7070" : "#4ade80";
}

function showDashboardMessage(text, isError = true) {
  dashboardMessage.textContent = text;
  dashboardMessage.style.color = isError ? "#ff7070" : "#4ade80";
}

// Вход администратора
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = document.getElementById("adminPassword").value;

  try {
    const response = await fetch("http://localhost:3000/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (!response.ok) {
      showLoginMessage(data.message || "Ошибка входа");
      return;
    }

    token = data.token;
    sessionStorage.setItem("adminToken", token);

    loginForm.reset();
    showDashboard();
    await loadParticipants();

  } catch (error) {
    console.error(error);
    showLoginMessage("Не удалось подключиться к серверу.");
  }
});

// Загрузка участников
async function loadParticipants() {
  try {
    const response = await fetch(
      "http://localhost:3000/api/admin/participants",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      logout();
      showLoginMessage("Сессия закончилась. Войдите снова.");
      return;
    }

    if (!response.ok) {
      showDashboardMessage(data.message || "Ошибка загрузки");
      return;
    }

    participants = data.participants;
    totalParticipants.textContent = data.total;

    renderParticipants();
    dashboardMessage.textContent = "";

  } catch (error) {
    console.error(error);
    showDashboardMessage("Не удалось загрузить участников.");
  }
}

// Отображение списка
function renderParticipants() {
  const search = searchInput.value.trim().toLowerCase();

  const filteredParticipants = participants.filter((participant) => {
    const fullName =
      `${participant.firstName} ${participant.lastName}`.toLowerCase();

    return (
      fullName.includes(search) ||
      participant.schoolClass.toLowerCase().includes(search)
    );
  });

  participantsList.replaceChildren();

  if (filteredParticipants.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "Участники не найдены.";
    emptyMessage.style.color = "#9299aa";
    participantsList.appendChild(emptyMessage);
    return;
  }

  filteredParticipants.forEach((participant) => {
    const card = document.createElement("div");
    card.className = "participant-card";

    const info = document.createElement("div");
    info.className = "participant-info";

    const name = document.createElement("h3");
    name.textContent =
      `${participant.firstName} ${participant.lastName}`;

    const schoolClass = document.createElement("p");
    schoolClass.textContent = `Класс: ${participant.schoolClass}`;

    info.append(name, schoolClass);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Удалить";

    deleteButton.addEventListener("click", () => {
      deleteParticipant(participant._id);
    });

    card.append(info, deleteButton);
    participantsList.appendChild(card);
  });
}

// Поиск
searchInput.addEventListener("input", renderParticipants);

// Обновление списка
refreshButton.addEventListener("click", loadParticipants);

// Удаление участника
async function deleteParticipant(id) {
  const confirmed = confirm(
    "Ты действительно хочешь удалить этого участника?"
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/participants/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      logout();
      showLoginMessage("Сессия закончилась. Войдите снова.");
      return;
    }

    if (!response.ok) {
      showDashboardMessage(data.message || "Не удалось удалить участника");
      return;
    }

    await loadParticipants();
    showDashboardMessage("Участник успешно удалён!", false);

  } catch (error) {
    console.error(error);
    showDashboardMessage("Ошибка соединения с сервером.");
  }
}

// Выход
function logout() {
  sessionStorage.removeItem("adminToken");
  token = null;
  participants = [];
  showLogin();
}

logoutButton.addEventListener("click", logout);

// Проверка сохранённой сессии
if (token) {
  showDashboard();
  loadParticipants();
} else {
  showLogin();
}
