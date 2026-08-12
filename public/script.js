const API = "";

// ===============================
// MESSAGE
// ===============================

function showMessage(message) {
    const msg = document.getElementById("message");

    if (msg) {
        msg.textContent = message;
    }
}

// ===============================
// SIGNUP
// ===============================

async function signup() {
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
        const response = await fetch(`${API}/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Signup failed");
            return;
        }

        showMessage("Signup successful! You can now login.");

        document.getElementById("signupName").value = "";
        document.getElementById("signupEmail").value = "";
        document.getElementById("signupPassword").value = "";

    } catch (error) {
        console.error(error);
        showMessage("Signup failed");
    }
}

// ===============================
// LOGIN
// ===============================

async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Login failed");
            return;
        }

        localStorage.setItem("token", data.token);

        showMessage("Login successful!");

    } catch (error) {
        console.error(error);
        showMessage("Login failed");
    }
}

// ===============================
// LOGOUT
// ===============================

async function logout() {
    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Already logged out");
        return;
    }

    try {
        const response = await fetch(`${API}/logout`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        localStorage.removeItem("token");

        showMessage(data.message || "Logout successful");

    } catch (error) {
        console.error(error);

        localStorage.removeItem("token");

        showMessage("Logged out");
    }
}

// ===============================
// GET PROFILE
// ===============================

async function getProfile() {
    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Please login first");
        return;
    }

    try {
        const response = await fetch(`${API}/profile`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Could not fetch profile");
            return;
        }

        document.getElementById("profileResult").textContent =
            JSON.stringify(data, null, 2);

    } catch (error) {
        console.error(error);
        showMessage("Could not fetch profile");
    }
}

// ===============================
// LOAD USERS
// ===============================

async function loadUsers() {
    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Please login first");
        return;
    }

    try {
        const response = await fetch(`${API}/users`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const users = await response.json();

        if (!response.ok) {
            showMessage(users.message || "Could not fetch users");
            return;
        }

        displayUsers(users);

    } catch (error) {
        console.error(error);
        showMessage("Could not fetch users");
    }
}

// ===============================
// DISPLAY USERS
// ===============================

function displayUsers(users) {
    const tableBody = document.getElementById("usersTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    users.forEach(user => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${user.name || ""}</td>
            <td>${user.email || ""}</td>
            <td>${user.age || ""}</td>

            <td>
                <button onclick="editUser('${user._id}', '${user.name}', '${user.email}', '${user.age || ""}')">
                    Edit
                </button>

                <button onclick="deleteUser('${user._id}')">
                    Delete
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// ===============================
// ADD USER
// ===============================

async function addUser() {

    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Please login first");
        return;
    }

    const name = document.getElementById("userName").value;
    const email = document.getElementById("userEmail").value;
    const age = document.getElementById("userAge").value;

    try {

        const response = await fetch(`${API}/users`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                name,
                email,
                age
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Could not add user");
            return;
        }

        showMessage("User added successfully!");

        document.getElementById("userName").value = "";
        document.getElementById("userEmail").value = "";
        document.getElementById("userAge").value = "";

        loadUsers();

    } catch (error) {

        console.error(error);

        showMessage("Could not add user");
    }
}

// ===============================
// EDIT USER
// ===============================

async function editUser(id, oldName, oldEmail, oldAge) {

    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Please login first");
        return;
    }

    const name = prompt("Enter new name:", oldName);

    if (name === null) {
        return;
    }

    const email = prompt("Enter new email:", oldEmail);

    if (email === null) {
        return;
    }

    const age = prompt("Enter new age:", oldAge);

    if (age === null) {
        return;
    }

    try {

        const response = await fetch(`${API}/users/${id}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                name,
                email,
                age
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Update failed");
            return;
        }

        showMessage("User updated successfully!");

        loadUsers();

    } catch (error) {

        console.error(error);

        showMessage("Update failed");
    }
}

// ===============================
// DELETE USER
// ===============================

async function deleteUser(id) {

    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Please login first");
        return;
    }

    const confirmDelete = confirm(
        "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const response = await fetch(`${API}/users/${id}`, {

            method: "DELETE",

            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Delete failed");
            return;
        }

        showMessage("User deleted successfully!");

        loadUsers();

    } catch (error) {

        console.error(error);

        showMessage("Delete failed");
    }
}

// ===============================
// SEARCH USERS
// ===============================

async function searchUsers() {

    const searchText =
        document.getElementById("searchInput").value
        .toLowerCase();

    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Please login first");
        return;
    }

    try {

        const response = await fetch(`${API}/users`, {

            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const users = await response.json();

        if (!response.ok) {
            showMessage(users.message || "Search failed");
            return;
        }

        const filteredUsers = users.filter(user =>
            user.name.toLowerCase().includes(searchText) ||
            user.email.toLowerCase().includes(searchText)
        );

        displayUsers(filteredUsers);

    } catch (error) {

        console.error(error);

        showMessage("Search failed");
    }
}