// /api/unsplash.js
export default async function handler(req, res) {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
        return res.status(500).json({ error: 'Unsplash Access Key 未设置' });
    }

    try {
        // 调用 Unsplash 官方随机图片 API，获取 landscape 图片
        const response = await fetch(
            `https://api.unsplash.com/photos/random?orientation=landscape`,
            {
                headers: {
                    Authorization: `Client-ID ${accessKey}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText || 'Failed to fetch Unsplash' });
        }

        const data = await response.json();

        // 返回给前端的数据：图片 URL + 作者信息 + Unsplash 链接
        res.status(200).json({
            url: data.urls.full,                // 高清图片 URL
            author: data.user.name,             // 摄影师姓名
            username: data.user.username,       // Unsplash 用户名
            link: data.links.html                // Unsplash 图片页面
        });

    } catch (error) {
        console.error('Unsplash API Error:', error);
        res.status(500).json({ error: 'Failed to fetch Unsplash' });
    }
}
