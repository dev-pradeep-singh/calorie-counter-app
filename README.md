# 🥗 Calzy — AI Calorie Tracker

> Calzy is an AI-powered calorie tracker for lazy people. Just snap a photo or describe your meal, and Calzy estimates calories and macros instantly so you can log food with minimal effort.

🌐 **Try it now:** [calorie-counter-app-theta.vercel.app](https://calorie-counter-app-theta.vercel.app)

---

## 🤔 Why Calzy?

Counting calories is boring. Manually searching for food, weighing portions, entering numbers — nobody wants to do that.

Calzy fixes this. Take a photo of your plate, and AI figures out the rest in seconds.

---

## ✨ What Can It Do?

- 📸 **Snap & Analyze** — Take a photo or pick one from your gallery. Calzy identifies the food and estimates calories and macros instantly
- ✍️ **Describe It** — No photo? Just type what you ate and Calzy does the math
- 💡 **Smart Hints** — Not sure AI will recognize your home-cooked dish? Add a quick hint like "dal makhani" to help it
- 📋 **Daily Log** — All your meals are saved and shown on your home screen with a running calorie total
- 📊 **Weekly Progress** — See your calorie history for the past 7 days, streaks, and averages
- 🗑️ **Easy Corrections** — Made a mistake? Swipe left on any meal to delete it
- ☁️ **Your Data, Everywhere** — Create an account and access your log from any device
- 💡 **Nutrition Tips** — Every meal comes with a short tip on how to make it healthier

---

## 📱 How To Use

1. **Sign up** with your email and password
2. **Set your goal** — enter your name and daily calorie target
3. **Tap "Snap"** from the bottom nav
4. **Take or choose a photo** of your meal (or just describe it in text)
5. **Hit "Analyze with AI"** — get calories + macros in seconds
6. **Tap "Add to Today's Log"** to save it
7. **Check your progress** anytime from the Progress tab

---

## 🍽️ Works Great For

- Home-cooked meals
- Restaurant food
- Packaged food (just snap the nutrition label!)
- Any meal you can photograph or describe

---

## 🛠️ Backend (local dev)

The FastAPI backend lives in `backend/` (Vercel entry point: `api/index.py`).

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Check it: `curl localhost:8000/api/health` → `{"status":"ok"}`

---

## 📄 License

MIT
