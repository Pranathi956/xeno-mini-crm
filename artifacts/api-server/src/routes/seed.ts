import { Router, type IRouter } from "express";
import { db, customersTable, ordersTable } from "@workspace/db";
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

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number) {
  const d = new Date();
  d.setDate(d.getDate() - randomBetween(0, daysBack));
  return d.toISOString().split("T")[0]!;
}

function formatPhone() {
  return `+91${randomBetween(7000000000, 9999999999)}`;
}

router.post("/seed", async (_req, res): Promise<void> => {
  // Clear existing data
  await db.delete(customersTable);
  await db.delete(ordersTable);

  const customers = INDIAN_NAMES.map((name, i) => {
    const city = CITIES[i % CITIES.length]!;
    const firstName = name.split(" ")[0]!.toLowerCase();
    const lastName = name.split(" ")[1]!.toLowerCase();
    return {
      name,
      email: `${firstName}.${lastName}${i}@gmail.com`,
      phone: formatPhone(),
      city,
      totalSpent: "0",
      visitCount: 0,
      lastPurchaseDate: randomDate(365),
    };
  });

  const insertedCustomers = await db
    .insert(customersTable)
    .values(customers)
    .returning();

  // Generate 200 orders spread across customers
  const orders = [];
  for (let i = 0; i < 200; i++) {
    const customer = insertedCustomers[i % insertedCustomers.length]!;
    const amount = randomBetween(500, 50000);
    orders.push({
      customerId: customer.id,
      amount: String(amount),
      productName: PRODUCTS[i % PRODUCTS.length]!,
      status: Math.random() > 0.1 ? "completed" : "returned",
    });
  }

  await db.insert(ordersTable).values(orders);

  // Recalculate total_spent and visit_count per customer
  for (const customer of insertedCustomers) {
    const result = await db.execute(
      sql`SELECT SUM(amount) as total, COUNT(*) as visits FROM orders WHERE customer_id = ${customer.id} AND status = 'completed'`
    );
    const row = result.rows[0] as { total: string | null; visits: number };
    await db
      .update(customersTable)
      .set({
        totalSpent: String(row.total ?? 0),
        visitCount: Number(row.visits ?? 0),
      })
      .where(eq(customersTable.id, customer.id));
  }

  res.json({ customers: insertedCustomers.length, orders: orders.length });
});

export default router;
