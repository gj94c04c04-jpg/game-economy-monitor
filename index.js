require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron'); // 引入時間排程套件

// 設定異常低價的閾值 (假設設定 150 元，只要低於這個價格就視為異常傾銷)
const ALERT_THRESHOLD = 150; 

// 1. 發送 Discord 警報的模組
async function sendDiscordAlert(itemName, price, itemUrl) {
    try {
        await axios.post(process.env.DISCORD_WEBHOOK_URL, {
            content: `🚨 **異常市場波動警報** 🚨\n商品：${itemName}\n目前最低價：**${price}** 元 (低於設定閾值 ${ALERT_THRESHOLD})\n連結：${itemUrl}`
        });
        console.log('✅ 警報已成功發送至 Discord！');
    } catch (error) {
        console.error('❌ Discord 發送失敗:', error.message);
    }
}

// 2. 爬取市場價格與判斷的模組
async function checkMarketPrice() {
    console.log(`\n[${new Date().toLocaleString()}] 啟動防禦架構師系統，開始巡邏...`);
    
    try {
        const response = await axios.get(process.env.TARGET_URL, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        });
        
        const $ = cheerio.load(response.data);
        
        const titleElement = $('.list-item-title-txt').first(); 
        const itemName = titleElement.attr('title') || "未抓取到標題";
        
        const rawUrl = titleElement.attr('href');
        const itemUrl = rawUrl ? `https://www.8591.com.tw${rawUrl}` : process.env.TARGET_URL;
        
        // 使用你親手抓到的精準價格標籤！
        const priceText = $('.list-item-price').first().text().replace(/[^0-9]/g, ''); 
        const price = parseInt(priceText, 10); 
        
        console.log(`🔍 最新監測 - 項目: ${itemName}, 價格: ${price} 元`);

        // 邏輯判斷
        if (price > 0 && price < ALERT_THRESHOLD) {
            console.log(`⚠️ 發現異常低價 (${price} < ${ALERT_THRESHOLD})！準備發送警報...`);
            await sendDiscordAlert(itemName, price, itemUrl);
        } else {
            console.log('✅ 價格正常，持續監控中。');
        }

    } catch (error) {
        console.error('❌ 抓取資料失敗:', error.message);
    }
}

// ==========================================
// 3. 系統啟動與自動化排程設定
// ==========================================

console.log('🛡️ 防禦架構師系統已啟動！');

// 系統剛啟動時，先立刻執行一次巡邏
checkMarketPrice();

// 設定排程：每 10 分鐘執行一次
// cron 語法解析： '分 時 日 月 星期'，'*/10' 代表每 10 分鐘觸發一次
cron.schedule('*/10 * * * *', () => {
    console.log('\n⏰ 定時排程觸發...');
    checkMarketPrice();
});

console.log('⏳ 已進入背景監控模式，請勿關閉此終端機視窗。');