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

        // 检查响应是否成功
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText || 'Failed to fetch Unsplash' });
        }

        const data = await response.json();

        // 返回给前端的数据：图片 URL + 作者信息 + Unsplash 链接
        res.status(200).json({
            url: data[0].urls.full,                // 高清图片 URL
            author: data[0].user.name,             // 摄影师姓名
            username: data[0].user.username,       // Unsplash 用户名
            link: data[0].links.html                // Unsplash 图片页面
        });

    } catch (error) {
        console.error('Unsplash API Error:', error);
        res.status(500).json({ error: '请求 Unsplash API 出错', details: error.message });
    }
}
