# TOEFL Go

iPhone 友善的學習 PWA：托福四大科與日檢 N4 兩條軌道，資料存在瀏覽器 LocalStorage。

頂部可切換 **TOEFL**／**日檢 N4**。

## 托福

- **今日節奏**：單字 SRS、到期複習、四大科短練習
- **單字卡**：主動回想＋忘記／困難／記得／簡單 間隔重複
- **練習**：閱讀篇章、聽力（系統英文 TTS＋逐字稿）、口說計時、寫作草稿
- **測驗**：每次題目與選項順序重洗
- **計畫**：階段時程

## 日檢 N4

- **Dashboard**：2026/12 考試倒數、單字／文法進度、今日任務
- **卡片**：單字＋文法翻牌、搜尋篩選、已學會／需複習、日文 TTS
- **測驗**：單字／文法／閱讀隨機抽題＋即時解析
- **計畫**：8 月〜12 月階段時程

兩邊進度分開儲存，互不覆蓋。

## 開發

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

靜態站部署網址：<https://lucash2005.github.io/TOEFL-Go/>

建置產物在 `gh-pages` 分支。首次請到倉庫 Settings → Pages，Source 選 **Deploy from a branch**，Branch 選 `gh-pages` / `/ (root)`。之後推送到 `main` 會自動重建並部署。
