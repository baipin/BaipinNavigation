// /api/unsplash.js
export default async function handler(req, res) {
    const { q } = req.query;
    const accessKey = process.env.UNSPLASH_ACCESS_KEY; // 从 Vercel 环境变体获取

    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=5`, {
            headers: {
                Authorization: `Client-ID ${accessKey}`
            }
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Unsplash' });
    }
}
