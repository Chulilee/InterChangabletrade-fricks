"use client";

import { useState } from "react";
import { OrderDetails } from "@/types/order";

export function Checkout() {
  const [amount, setAmount] = useState(10);
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("Test payment");
  const [paymentStatus, setPaymentStatus] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPaymentStatus("processing");

    const orderDetails: OrderDetails = {
      amount,
      currency,
      description,
    };

    try {
      const response = await fetch("/api/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderDetails),
      });

      const paymentIntent = await response.json();

      if (response.ok) {
        setPaymentStatus(
          `Payment successful! Client secret: ${paymentIntent.clientSecret}`,
        );
      } else {
        setPaymentStatus("Payment failed.");
      }
    } catch (error) {
      setPaymentStatus("Payment failed.");
    }
  };

  return (
    <div>
      <h1>Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Amount:
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
        </div>
        <div>
          <label>
            Currency:
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Description:
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Pay</button>
      </form>
      {paymentStatus && <p>{paymentStatus}</p>}
    </div>
  );
}
