import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini AI client using server-side key
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // In-memory cache for market news to protect Gemini API quota
  const newsCache: {
    en: { data: any[]; timestamp: number } | null;
    ar: { data: any[]; timestamp: number } | null;
  } = {
    en: null,
    ar: null,
  };
  const CACHE_DURATION_MS = 10 * 60 * 1000; // Cache news for 10 minutes

  // API endpoint for Market News using Google Search Grounding
  app.get("/api/market-news", async (req, res) => {
    const lang = req.query.lang === "ar" ? "ar" : "en";
    const now = Date.now();

    // Check if we have valid cache
    const cached = newsCache[lang];
    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      return res.json({ news: cached.data });
    }

    try {
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not found on server. Using high-quality mock data.");
        return res.json({
          news: getMockNews(lang)
        });
      }

      let prompt = "";
      if (lang === "ar") {
        prompt = "قدم أهم 3 أخبار مالية أو عملات رقمية عالمية معاصرة ومحدثة الآن مع ملخص قصير من جملة واحدة لكل خبر باللغة العربية. يجب أن يحتوي كل خبر على: العنوان (title)، الملخص (summary)، المصدر (source)، رابط حقيقي أو موقع المصدر الإلكتروني (url)، والوقت التقريبي منذ نشر الخبر (time) مثل 'قبل ساعة' أو 'منذ ساعتين'.";
      } else {
        prompt = "Provide the top 3 latest global financial or crypto news headlines with a brief 1-sentence summary for each in English. Each news item must have: 'title', 'summary', 'source', 'url' (a real active link or official home url of the news source), and 'time' (e.g. '1 hour ago', '2 hours ago').";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                source: { type: Type.STRING },
                url: { type: Type.STRING },
                time: { type: Type.STRING }
              },
              required: ["title", "summary", "source", "url", "time"]
            }
          }
        }
      });

      let news = [];
      if (response.text) {
        try {
          news = JSON.parse(response.text.trim());
        } catch (err) {
          console.error("JSON parsing of Gemini search grounding response failed:", err);
        }
      }

      if (!Array.isArray(news) || news.length === 0) {
        news = getMockNews(lang);
      }

      // Keep only top 3 and update the cache
      const finalNews = news.slice(0, 3);
      newsCache[lang] = {
        data: finalNews,
        timestamp: now
      };

      res.json({ news: finalNews });
    } catch (error) {
      console.error("Error in /api/market-news:", error);
      
      // On API failure (such as quota exceeded), try to serve stale cache if available, otherwise fallback to mock data
      if (cached) {
        console.log(`Serving stale news cache for ${lang} due to API error.`);
        return res.json({ news: cached.data });
      }

      res.json({ news: getMockNews(lang) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

function getMockNews(lang = "en") {
  if (lang === "ar") {
    return [
      {
        title: "البيتكوين يتماسك فوق مستويات 95,000 دولار مع ترقب المتداولين للخطوة القادمة",
        summary: "تستمر العملة المشفرة الأكبر عالميًا في التداول بنطاق ضيق وسط استقرار في أحجام التداولات عبر المنصات الرئيسية.",
        source: "بوكيت 24 للأبحاث",
        url: "https://bitcoin.org",
        time: "قبل ساعة"
      },
      {
        title: "الاحتياطي الفيدرالي يلمح إلى نهج حذر بشأن خفض أسعار الفائدة القادمة",
        summary: "أكد مسؤولو الفيدرالي على أهمية البيانات الاقتصادية القادمة في ظل استمرار بعض الضغوط التضخمية وقوة سوق العمل.",
        source: "أخبار المال العالمية",
        url: "https://www.federalreserve.gov",
        time: "قبل 3 ساعات"
      },
      {
        title: "رسوم شبكة الإيثيريوم تنخفض إلى أدنى مستوياتها مع زيادة الاعتماد على شبكات الطبقة الثانية",
        summary: "شهدت شبكات قياس الطبقة الثانية نشاطاً قياسياً مما خفف الضغط على الشبكة الرئيسية للإيثيريوم وقلل التكلفة بشكل كبير.",
        source: "إيثيرسكان",
        url: "https://ethereum.org",
        time: "قبل 5 ساعات"
      }
    ];
  }
  return [
    {
      title: "Bitcoin Consolidates Above $95,000 as Trading Volumes Stabilize",
      summary: "The leading cryptocurrency continues to trade in a tight consolidate range with lower volatility ahead of the weekly close.",
      source: "Pocket24 Research",
      url: "https://bitcoin.org",
      time: "1 hour ago"
    },
    {
      title: "Federal Reserve Signals Cautious Stance on Future Rate Cuts",
      summary: "Fed officials emphasize that policy decisions will remain strictly data-dependent amid resilient economic indicators.",
      source: "Global Finance Desk",
      url: "https://www.federalreserve.gov",
      time: "3 hours ago"
    },
    {
      title: "Ethereum Gas Fees Decline to Multi-Year Lows as Layer-2 Scaling Expands",
      summary: "Rapid adoption of secondary scaling solutions has significantly offloaded traffic from the mainnet, driving fees down.",
      source: "Etherscan Insights",
      url: "https://ethereum.org",
      time: "5 hours ago"
    }
  ];
}

startServer();
