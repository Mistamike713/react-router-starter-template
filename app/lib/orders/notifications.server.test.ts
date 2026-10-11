/// <reference types="node" />
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { sendPaidOrderNotifications } from "./notifications.server";

let sqlite: DatabaseSync;
let calls: Array<{ body: any; headers: Headers }>;

function dbAdapter(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      let args: any[] = [];
      return {
        bind(...values: any[]) { args = values; return this; },
        async first<T>() { return (db.prepare(sql).get(...args) as T) || null; },
        async all<T>() { return { results: db.prepare(sql).all(...args) as T[] }; },
        async run() { return db.prepare(sql).run(...args); },
      };
    },
  } as unknown as D1Database;
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("migrations/0001_orders.sql", "utf8"));
  sqlite.prepare(`INSERT INTO orders
    (id,status,customer_name,customer_email,customer_phone,fulfillment_method,destination_zip,shipping_address,order_notes,subtotal_cents,shipping_cents,tax_cents,total_cents,paid_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run("order-test","paid","Test Customer","customer@example.com","555-0100","pickup","","","Please call",3500,0,289,3789,"now","now","now");
  sqlite.prepare(`INSERT INTO order_items
    (id,order_id,kind,product_id,name,quantity,unit_price_cents,extended_price_cents,review_required,review_reasons_json,config_json,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run("item-test","order-test","custom_tumbler","25oz-glitter","Custom Tumbler",1,3500,3500,0,"[]",JSON.stringify({color:"pink",design:"test"}),"now");
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    calls.push({ body: JSON.parse(String(init.body)), headers: new Headers(init.headers) });
    return Response.json({ id: "email-test" });
  }));
});

afterEach(() => {
  sqlite.close();
  vi.unstubAllGlobals();
});

test("sends owner and customer paid-order emails with stable idempotency keys", async () => {
  await sendPaidOrderNotifications({ ORDERS_DB: dbAdapter(sqlite), RESEND_API_KEY: "test-key" }, "order-test");
  expect(calls).toHaveLength(2);

  expect(calls[0].body).toMatchObject({
    from: "MNH Creations <info@mnhcreations.com>",
    to: ["orders@mnhcreations.com"],
    subject: "New paid order — order-test",
  });
  expect(calls[0].body.text).toContain("Test Customer");
  expect(calls[0].body.text).toContain("Custom Tumbler");
  expect(calls[0].body.text).toContain("$37.89");
  expect(calls[0].body.text).toContain("Please call");
  expect(calls[0].headers.get("Idempotency-Key")).toBe("paid-order-owner/order-test");

  expect(calls[1].body).toMatchObject({
    from: "MNH Creations <info@mnhcreations.com>",
    to: ["customer@example.com"],
    subject: "MNH Creations order confirmed — order-test",
  });
  expect(calls[1].body.text).toContain("$37.89");
  expect(calls[1].headers.get("Idempotency-Key")).toBe("paid-order-customer/order-test");
});

test("refuses to notify for an order that is not paid", async () => {
  sqlite.prepare("UPDATE orders SET status='draft' WHERE id='order-test'").run();
  await expect(sendPaidOrderNotifications({ ORDERS_DB: dbAdapter(sqlite), RESEND_API_KEY: "test-key" }, "order-test"))
    .rejects.toThrow("Paid order not found");
  expect(calls).toHaveLength(0);
});
