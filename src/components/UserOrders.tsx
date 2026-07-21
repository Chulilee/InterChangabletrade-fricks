"use client";

import { cn } from "@/lib/utils";
import type { Order } from "@/mocks/server";

export function UserOrders({ orders, onCancelOrder }: { orders: Order[], onCancelOrder: (id: string) => void }) {
  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-sm tracking-wide text-foreground">My Orders</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {orders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No active orders
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="text-muted-foreground sticky top-0 bg-card">
              <tr>
                <th className="font-normal py-2 px-2">Side</th>
                <th className="font-normal py-2 px-2">Price</th>
                <th className="font-normal py-2 px-2">Size</th>
                <th className="font-normal py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                  <td className={cn(
                    "py-2 px-2 font-medium capitalize",
                    order.side === "buy" ? "text-success" : "text-danger"
                  )}>
                    {order.side}
                  </td>
                  <td className="py-2 px-2">{order.price.toFixed(2)}</td>
                  <td className="py-2 px-2">{order.size.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right">
                    {order.status === "open" && (
                      <button 
                        onClick={() => onCancelOrder(order.id)}
                        className="text-muted-foreground hover:text-danger transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {order.status === "filled" && <span className="text-success">Filled</span>}
                    {order.status === "cancelled" && <span className="text-muted-foreground">Cancelled</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
