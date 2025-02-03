
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const CATEGORIES = {
  tech: {
    keywords: [
      "new AI model",
      "machine learning breakthrough",
      "tech innovation",
      "software development",
      "emerging technology",
      "tech evolution"
    ],
    requiredTerms: [
      "AI",
      "machine learning",
      "technology",
      "software",
      "library",
      "framework",
      "version",
      "model",
      "algorithm"
    ],
    excludeTerms: [
      "stock price",
      "market cap",
      "earnings",
      "investment"
    ],
    contextTerms: [
      "open source",
      "neural network",
      "research",
      "development",
      "innovation",
      "breakthrough"
    ]
  }
};

const filterRelevantArticles = (articles, category) => {
  const categoryConfig = CATEGORIES[category];
  if (!categoryConfig) return articles;

  const getArticleScore = (article) => {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    let score = 0;

    const hasRequiredTerm = categoryConfig.requiredTerms.some(term => 
      text.includes(term.toLowerCase())
    );
    if (!hasRequiredTerm) return -1;

    const hasExcludedTerm = categoryConfig.excludeTerms.some(term =>
      text.includes(term.toLowerCase())
    );
    if (hasExcludedTerm) return -1;

    categoryConfig.requiredTerms.forEach(term => {
      if (text.includes(term.toLowerCase())) score += 2;
    });

    categoryConfig.contextTerms.forEach(term => {
      if (text.includes(term.toLowerCase())) score += 1;
    });

    categoryConfig.requiredTerms.forEach(term => {
      if (article.title.toLowerCase().includes(term.toLowerCase())) score += 2;
    });

    return score;
  };

  return articles
    .map(article => ({
      ...article,
      score: getArticleScore(article)
    }))
    .filter(article => article.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(article => {
      const { score, ...rest } = article;
      return rest;
    });
};

app.get("/api/news/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { days = 7 } = req.query;

    if (!CATEGORIES[category]) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));

    const keywords = CATEGORIES[category].keywords;
    const allArticles = [];

    for (const keyword of keywords) {
      try {
        const response = await axios.get("https://newsapi.org/v2/everything", {
          params: {
            q: `"${keyword}"`,
            from: fromDate.toISOString().split("T")[0],
            sortBy: "publishedAt",
            apiKey: process.env.NEWS_API_KEY,
            language: "en",
            pageSize: 20
          },
        });
        allArticles.push(...response.data.articles);
      } catch (error) {
        console.error(`Error fetching for keyword ${keyword}:`, error.message);
      }
    }

    const uniqueArticles = Array.from(
      new Map(allArticles.map(item => [item.title, item])).values()
    );

    const filteredArticles = filterRelevantArticles(uniqueArticles, category);

    res.json({
      category,
      articles: filteredArticles.slice(0, 20).map(article => ({
        title: article.title,
        url: article.url
      }))
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});