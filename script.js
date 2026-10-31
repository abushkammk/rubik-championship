
const form = document.getElementById("registrationForm");
const message = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");

function showMessage(text, type) {
  message.textContent = text;
  message.className = type;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const schoolClass = document.getElementById("schoolClass").value.trim();

  submitButton.disabled = true;
  submitButton.textContent = "Отправка...";

  showMessage("Проверяем данные...", "loading");

  try {
    const response = await fetch("https://rubik-championship.onrender.com/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        firstName,
        lastName,
        schoolClass
      })
    });

    const data = await response.json();

    if (response.status === 409) {
      showMessage(
        "Этот участник уже зарегистрирован!",
        "error"
      );
      return;
    }

    if (!response.ok) {
      showMessage(
        data.message || "Не удалось зарегистрироваться.",
        "error"
      );
      return;
    }

    showMessage(
      "Регистрация прошла успешно! Ждём тебя на чемпионате!",
      "success"
    );

    form.reset();

  } catch (error) {
    console.error("Registration error:", error);

    showMessage(
      "Не удалось подключиться к серверу. Попробуй позже.",
      "error"
    );

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Зарегистрироваться";
  }
});
