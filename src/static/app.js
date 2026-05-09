document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const submitButton = signupForm.querySelector("button[type='submit']");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type = "success") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function unregisterParticipant(activity, email) {
    const response = await fetch(
      `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Unable to remove participant");
    }

    return result.message;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsMarkup = details.participants.length
          ? `<ul class="participants-list">${details.participants
              .map(
                (participant) => `
                  <li>
                    <span class="participant-name">${participant}</span>
                    <button
                      type="button"
                      class="participant-remove"
                      data-activity="${name}"
                      data-email="${participant}"
                      aria-label="Remove ${participant}"
                    >
                      ×
                    </button>
                  </li>`
              )
              .join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            ${participantsMarkup}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  activitiesList.addEventListener("click", async (event) => {
    if (!event.target.matches(".participant-remove")) {
      return;
    }

    const button = event.target;
    const activity = button.dataset.activity;
    const email = button.dataset.email;

    button.disabled = true;

    try {
      const message = await unregisterParticipant(activity, email);
      showMessage(message, "success");
      await fetchActivities();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        await fetchActivities();
        showMessage(result.message, "success");
        signupForm.reset();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
