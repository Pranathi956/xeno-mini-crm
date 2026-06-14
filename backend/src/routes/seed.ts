import { Router, type IRouter } from "express";
import { db, customersTable, ordersTable } from "../db/index.js";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

const INDIAN_NAMES = [
  "Priya Sharma", "Rahul Gupta", "Ananya Singh", "Vikram Patel", "Meera Nair",
  "Arjun Kumar", "Kavitha Reddy", "Rohit Verma", "Deepika Joshi", "Sanjay Mehta",
  "Pooja Iyer", "Amit Chatterjee", "Sneha Pillai", "Rajesh Desai", "Nisha Agarwal",
  "Kiran Bose", "Suresh Rajan", "Lakshmi Menon", "Aakash Trivedi", "Divya Kapoor",
  "Manish Tiwari", "Sunita Rao", "Gaurav Saxena", "Rekha Mishra", "Vijay Pandey",
  "Aarti Bhatt", "Nikhil Srinivas", "Shweta Kulkarni", "Pankaj Jain", "Ritu Garg",
  "Harish Nambiar", "Geeta Mukherjee", "Sachin Luthra", "Madhuri Wagh", "Arun Dey",
  "Pallavi Thakkar", "Dinesh Ghosh", "Usha Venkatesh", "Shyam Bansal", "Chitra Pillai",
  "Mohit Choudhary", "Jyoti Dubey", "Varun Sikka", "Sapna Tandon", "Abhijit Roy",
  "Anita Vaidya", "Puneet Arora", "Sumitra Negi", "Girish Hegde", "Neha Soni",
];
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"];
const PRODUCTS = [
  "Cotton Saree", "Silk Kurta", "Denim Jeans", "Casual T-Shirt", "Formal Shirt",
  "Lehenga Choli", "Anarkali Suit", "Palazzo Pants", "Ethnic Jacket", "Salwar Kameez",
  "Men's Blazer", "Kurti", "Dupatta Set", "Dhoti Kurta", "Woolen Shawl",
  "Running Shoes", "Sandals", "Handbag", "Wallet", "Sunglasses",
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate = (daysBack: number) => { const d = new Date(); d.setDate(d.getDate() - rand(0, daysBack)); return d.toISOString().split("T")[0]!; };
const phone = () => `+91${rand(7000000000, 9999999999)}`;

router.post("/seed", async (_req, res): Promise<void> => {
  await db.delete(customersTable);
  await db.delete(ordersTable);

  const insertedCustomers = await db.insert(customersTable).values(
    INDIAN_NAMES.map((name, i) => {
      const [first, last] = name.split(" ");
      return { name, email: `${first!.toLowerCase()}.${last!.toLowerCase()}${i}@gmail.com`, phone: phone(), city: CITIES[i % CITIES.length]!, totalSpent: "0", visitCount: 0, lastPurchaseDate: randDate(365) };
    })
  ).returning();

  const orders = Array.from({ length: 200 }, (_, i) => ({
    customerId: insertedCustomers[i % insertedCustomers.length]!.id,
    amount: String(rand(500, 50000)),
    productName: PRODUCTS[i % PRODUCTS.length]!,
    status: Math.random() > 0.1 ? "completed" : "returned",
  }));

  await db.insert(ordersTable).values(orders);

  for (const customer of insertedCustomers) {
    const result = await db.execute(sql`SELECT SUM(amount) as total, COUNT(*) as visits FROM orders WHERE customer_id = ${customer.id} AND status = 'completed'`);
    const row = result.rows[0] as { total: string | null; visits: number };
    await db.update(customersTable).set({ totalSpent: String(row.total ?? 0), visitCount: Number(row.visits ?? 0) }).where(eq(customersTable.id, customer.id));
  }

  res.json({ customers: insertedCustomers.length, orders: orders.length });
});

export default router;
