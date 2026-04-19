export default async function handler(req, res) {
    // 允许浏览器跨域（可选，但推荐）
    res.setHeader('Access-Control-Allow-Origin', '*');

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    // ❌ 没有环境变量直接报错
    if (!accessKey) {
        return res.status(500).json({
            error: 'UNSPLASH_ACCESS_KEY 未设置'
        });
    }

    try {
        // 调用 Unsplash 随机图片 API
        const response = await fetch(
            'https://api.unsplash.com/photos/random?orientation=landscape',
            {
                headers: {
                    Authorization: `Client-ID ${accessKey}`
                }
            }
        );

        const data = await response.json();

        // ❌ Unsplash API 返回错误时
        if (!response.ok) {
            return res.status(response.status).json({
                error: data?.errors?.[0] || 'Unsplash API 请求失败'
            });
        }

        // ✅ 正确：random API 返回的是“对象”，不是数组
        return res.status(200).json({
            url: data.urls?.full || data.urls?.regular,
            author: data.user?.name,
            username: data.user?.username,
            link: data.links?.html
        });

    } catch (error) {
        console.error('Unsplash API Error:', error);

        return res.status(500).json({
            error: '服务器请求 Unsplash 失败',
            details: error.message
        });
    }
}
