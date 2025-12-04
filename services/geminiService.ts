import { GoogleGenAI } from "@google/genai";
import { Product, Transaction } from "../types";

// Helper to interact with Gemini API
export const analyzeBusinessData = async (
  products: Product[],
  transactions: Transaction[],
  question: string
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "Error: API Key is missing. Please check your configuration.";
    }

    const ai = new GoogleGenAI({ apiKey });

    // Prepare context data
    const lowStockItems = products.filter(p => p.stock <= p.minStock).map(p => `${p.name} (${p.stock} ${p.unit})`);
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalDebt = transactions.filter(t => t.paymentMethod === 'TEMPO' && t.status === 'PENDING').reduce((sum, t) => sum + (t.total - t.amountPaid), 0);
    
    // Calculate simple best sellers
    const salesMap: Record<string, number> = {};
    transactions.forEach(t => {
        t.items.forEach(item => {
            salesMap[item.name] = (salesMap[item.name] || 0) + item.quantity;
        });
    });
    const topSelling = Object.entries(salesMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]).join(", ");

    const context = `
      You are an intelligent business assistant for a Building Material Store (Toko Bangunan).
      Current Data Snapshot:
      - Total Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}
      - Outstanding Customer Debt (Piutang): Rp ${totalDebt.toLocaleString('id-ID')}
      - Low Stock Alerts: ${lowStockItems.length > 0 ? lowStockItems.join(', ') : 'None'}
      - Top Selling Products: ${topSelling}
      - Total Transactions recorded: ${transactions.length}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${context}\n\nUser Question: ${question}\n\nProvide a concise, professional, and helpful answer in Indonesian.`,
    });

    return response.text || "Maaf, saya tidak dapat menganalisis data saat ini.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Terjadi kesalahan saat menghubungi asisten AI.";
  }
};
