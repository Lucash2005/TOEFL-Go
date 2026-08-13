# TOEFL Go

iPhone 友善的托福學習 PWA：每日單字 SRS、閱讀／聽力／口說／寫作短練、快速測驗與階段計畫。

## 功能

- **今日節奏**：單字 SRS、到期複習、四大科短練習
- **單字卡**：主動回想＋忘記／困難／記得／簡單 間隔重複
- **練習**：閱讀篇章、聽力（系統英文 TTS＋逐字稿）、口說計時、寫作草稿
- **測驗**：每次題目與選項順序重洗
- **本地進度**：LocalStorage，無需登入

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

## 與 N4 Go 的關係

這是獨立專案，不塞進日檢 App。兩者可並存於手機主畫面。
