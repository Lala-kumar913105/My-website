const API_BASE = "http://localhost:8000/api/v1";

async function handleCheckout(userId, statusEl, refreshCart) {
  if (!userId) {
    if (statusEl) {
      statusEl.textContent = "Missing user_id";
      statusEl.classList.add("error");
    }
    return;
  }

  try {
    if (statusEl) {
      statusEl.textContent = "Placing order...";
      statusEl.classList.remove("error");
    }

    const response = await fetch(`${API_BASE}/checkout/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error("Checkout failed. Please try again.");
    }

    const order = await response.json();

    if (statusEl) {
      statusEl.textContent = "Order Placed Successfully";
    }

    if (typeof refreshCart === "function") {
      await refreshCart();
    }

    if (order?.id) {
      window.location.href = `payment.html?order_id=${order.id}`;
    }
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = error.message;
      statusEl.classList.add("error");
    }
  }
}
